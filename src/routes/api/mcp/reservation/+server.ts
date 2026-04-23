import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	lead,
	offer,
	offerItem,
	booking,
	bookingTent,
	client,
	item,
	appSetting
} from '$lib/server/db/schema';
import { and, eq, gte, inArray, isNull, lte, ne } from 'drizzle-orm';
import { getTemplate, renderTemplate, sendEmail } from '$lib/server/email';

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: RequestHandler = async () =>
	new Response(null, { status: 204, headers: CORS });

/**
 * POST /api/mcp/reservation
 *
 * Body:
 * {
 *   clientName, clientEmail, clientPhone?, clientAddress?,
 *   eventName, eventStartDate, eventEndDate, venue?,
 *   items: [{ itemId: string, quantity: number }],
 *   tier?: 'normal' | 'premium'  // premium = +20% markup (AI convenience fee)
 * }
 *
 * Flow:
 * 1. Walidacja + check availability w zakresie
 * 2. Create/find client (by email)
 * 3. Insert booking + booking_tent (status=confirmed)
 * 4. Insert offer (accepted, link do bookinga) z tier markup
 * 5. Send booking_confirmed email
 * 6. Return { ok, bookingId, offerNumber, totalCents, tier }
 */
export const POST: RequestHandler = async ({ request, url }) => {
	const data = await request.json().catch(() => null);
	if (!data) return json({ ok: false, error: 'Invalid JSON' }, { status: 400, headers: CORS });

	const {
		clientName,
		clientEmail,
		clientPhone,
		clientAddress,
		eventName,
		eventStartDate,
		eventEndDate,
		venue,
		items: requestedItems,
		tier = 'normal'
	} = data;

	// Walidacja
	if (!clientName || !clientEmail || !eventName || !eventStartDate || !eventEndDate) {
		return json(
			{ ok: false, error: 'Wymagane: clientName, clientEmail, eventName, eventStartDate, eventEndDate' },
			{ status: 400, headers: CORS }
		);
	}
	if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
		return json({ ok: false, error: 'Pusta lista items' }, { status: 400, headers: CORS });
	}
	if (!['normal', 'premium'].includes(tier)) {
		return json({ ok: false, error: 'Tier: normal albo premium' }, { status: 400, headers: CORS });
	}

	// Fetch items + check availability
	const itemIds = requestedItems.map((i: { itemId: string }) => i.itemId);
	const dbItems = await db
		.select()
		.from(item)
		.where(and(inArray(item.id, itemIds), isNull(item.archivedAt)));
	if (dbItems.length !== itemIds.length) {
		return json({ ok: false, error: 'Niektóre items nie istnieją lub archived' }, { status: 400, headers: CORS });
	}
	const itemMap = new Map(dbItems.map((i) => [i.id, i]));

	// Check availability w zakresie
	const activeBookings = await db
		.select({
			tentId: bookingTent.tentId,
			quantity: bookingTent.quantity
		})
		.from(bookingTent)
		.innerJoin(booking, eq(bookingTent.bookingId, booking.id))
		.where(
			and(
				lte(booking.startDate, eventEndDate),
				gte(booking.endDate, eventStartDate),
				ne(booking.status, 'cancelled'),
				ne(booking.status, 'done')
			)
		);

	const reservedByItem = new Map<string, number>();
	for (const b of activeBookings) {
		reservedByItem.set(b.tentId, (reservedByItem.get(b.tentId) ?? 0) + b.quantity);
	}

	const conflicts: string[] = [];
	for (const req of requestedItems as { itemId: string; quantity: number }[]) {
		const it = itemMap.get(req.itemId)!;
		const available = it.totalQty - (reservedByItem.get(it.id) ?? 0);
		if (req.quantity > available) {
			conflicts.push(`${it.name}: chcesz ${req.quantity}, dostępne ${available}`);
		}
	}
	if (conflicts.length > 0) {
		return json(
			{ ok: false, error: 'Brak dostępności', conflicts },
			{ status: 409, headers: CORS }
		);
	}

	// Compute total (per day × days)
	const days = Math.max(
		1,
		Math.ceil((new Date(eventEndDate).getTime() - new Date(eventStartDate).getTime()) / 86400000) + 1
	);
	let totalCents = 0;
	for (const req of requestedItems as { itemId: string; quantity: number }[]) {
		const it = itemMap.get(req.itemId)!;
		const unitPrice = it.pricePerDayCents ?? 0;
		totalCents += unitPrice * req.quantity * days;
	}

	// Premium tier = +20% markup (AI convenience fee)
	const markup = tier === 'premium' ? 1.2 : 1.0;
	totalCents = Math.round(totalCents * markup);

	// Find or create client
	const clientEmailLower = String(clientEmail).toLowerCase();
	const [existingClient] = await db
		.select()
		.from(client)
		.where(eq(client.email, clientEmailLower))
		.limit(1);

	const clientRow =
		existingClient ??
		(
			await db
				.insert(client)
				.values({
					name: clientName,
					email: clientEmailLower,
					phone: clientPhone ?? null,
					address: clientAddress ?? null
				})
				.returning()
		)[0];

	// Offer number
	const [offersSetting] = await db
		.select()
		.from(appSetting)
		.where(eq(appSetting.key, 'offers'))
		.limit(1);
	const cfg = (offersSetting?.value ?? {}) as {
		prefix?: string;
		year?: number;
		nextNumber?: number;
	};
	const prefix = cfg.prefix ?? 'OFF';
	const year = cfg.year ?? new Date().getFullYear();
	const nextNum = Math.max(1, cfg.nextNumber ?? 1);
	const offerNumber = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}-MCP`;

	// Insert booking
	const [newBooking] = await db
		.insert(booking)
		.values({
			clientId: clientRow.id,
			eventName,
			startDate: eventStartDate,
			endDate: eventEndDate,
			venue: venue ?? null,
			priceCents: totalCents,
			status: 'confirmed',
			notes: `Rezerwacja MCP (${tier}). Markup: ${markup}×. Utworzone ${new Date().toISOString()}.`
		})
		.returning();

	// Insert booking_tent
	await db.insert(bookingTent).values(
		(requestedItems as { itemId: string; quantity: number }[]).map((req) => ({
			bookingId: newBooking.id,
			tentId: req.itemId,
			quantity: req.quantity
		}))
	);

	// Insert offer (linked to booking, status=accepted)
	const [newOffer] = await db
		.insert(offer)
		.values({
			number: offerNumber,
			clientId: clientRow.id,
			eventName,
			eventStartDate,
			eventEndDate,
			venue: venue ?? null,
			totalCents,
			status: 'accepted',
			acceptedAt: new Date(),
			convertedToBookingId: newBooking.id,
			notes: `Offer MCP (${tier}). Premium markup: ${tier === 'premium' ? '+20%' : '0%'}.`
		})
		.returning();

	// Insert offer items
	await db.insert(offerItem).values(
		(requestedItems as { itemId: string; quantity: number }[]).map((req) => {
			const it = itemMap.get(req.itemId)!;
			const unitPrice = Math.round((it.pricePerDayCents ?? 0) * markup);
			return {
				offerId: newOffer.id,
				tentId: it.id,
				description: it.name,
				quantity: req.quantity,
				unitPriceCents: unitPrice,
				lineTotalCents: unitPrice * req.quantity * days
			};
		})
	);

	// Inkrement offer number
	await db
		.update(appSetting)
		.set({
			value: { ...cfg, prefix, year, nextNumber: nextNum + 1 },
			updatedAt: new Date()
		})
		.where(eq(appSetting.key, 'offers'));

	// Send confirmation email
	const template = await getTemplate('booking_confirmed');
	if (template) {
		const totalZl = (totalCents / 100).toLocaleString('pl-PL', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		});
		const ctx = {
			clientName,
			eventName,
			eventDateRange:
				eventStartDate === eventEndDate ? eventStartDate : `${eventStartDate} – ${eventEndDate}`,
			venue: venue ?? '—',
			totalValue: `${totalZl} zł`,
			paymentInfo: ''
		};
		await sendEmail({
			to: clientEmailLower,
			subject: renderTemplate(template.subject, ctx),
			body: renderTemplate(template.body, ctx),
			offerId: newOffer.id,
			template: 'booking_confirmed'
		});
	}

	return json(
		{
			ok: true,
			bookingId: newBooking.id,
			offerNumber,
			tier,
			totalCents,
			totalZl: totalCents / 100,
			days,
			panelLink: `${url.origin}/zlecenia/booking-${newBooking.id}`
		},
		{ status: 201, headers: CORS }
	);
};
