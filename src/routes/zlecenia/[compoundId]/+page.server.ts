import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { lead, offer, offerItem, booking, bookingTent, client, item } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

/**
 * Unified detail page dla zlecenia.
 * URL: /zlecenia/{type}-{uuid} (type = lead|offer|booking)
 * Fetches data per type + normalizes do wspólnego shape'u.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	const compound = params.compoundId;
	const dashIdx = compound.indexOf('-');
	if (dashIdx < 0) throw error(400, 'Invalid zlecenie id');

	const type = compound.slice(0, dashIdx) as 'lead' | 'offer' | 'booking';
	const id = compound.slice(dashIdx + 1);

	type Zlecenie = {
		type: 'lead' | 'offer' | 'booking';
		id: string;
		number: string | null;
		status: string;
		stageLabel: string;
		stageEmoji: string;
		client: {
			id: string | null;
			name: string;
			company: string | null;
			phone: string | null;
			email: string | null;
			address: string | null;
		} | null;
		event: {
			name: string;
			startDate: string | null;
			endDate: string | null;
			venue: string | null;
			guestsCount: number | null;
		};
		totalCents: number | null;
		items: Array<{ description: string; quantity: number; unitPriceCents: number; lineTotalCents: number }>;
		notes: string | null;
		message: string | null;
		source: string | null;
		createdAt: Date;
		sentAt: Date | null;
		viewedAt: Date | null;
		acceptedAt: Date | null;
	};

	const STAGES: Record<string, { label: string; emoji: string }> = {
		'lead:new': { label: 'Nowy', emoji: '🆕' },
		'lead:contacted': { label: 'Skontaktowany', emoji: '📞' },
		'lead:qualified': { label: 'Kwalifikowany', emoji: '🎯' },
		'lead:quoted': { label: 'Oferta wysłana', emoji: '✉️' },
		'lead:won': { label: 'Wygrany', emoji: '✅' },
		'lead:lost': { label: 'Przegrany', emoji: '✕' },
		'offer:draft': { label: 'Oferta (szkic)', emoji: '✏️' },
		'offer:sent': { label: 'Oferta wysłana', emoji: '✉️' },
		'offer:viewed': { label: 'Klient zobaczył', emoji: '👀' },
		'offer:accepted': { label: 'Zaakceptowana', emoji: '✅' },
		'offer:rejected': { label: 'Odrzucona', emoji: '✕' },
		'booking:draft': { label: 'Rezerwacja (szkic)', emoji: '📝' },
		'booking:confirmed': { label: 'Potwierdzona', emoji: '✅' },
		'booking:in-progress': { label: 'W trakcie', emoji: '🚚' },
		'booking:done': { label: 'Zrealizowana', emoji: '🎉' },
		'booking:cancelled': { label: 'Anulowana', emoji: '✕' }
	};

	let zlecenie: Zlecenie;

	if (type === 'lead') {
		const [l] = await db.select().from(lead).where(eq(lead.id, id)).limit(1);
		if (!l) throw error(404, 'Lead nie istnieje');
		const s = STAGES[`lead:${l.status}`] ?? STAGES['lead:new'];
		zlecenie = {
			type: 'lead',
			id: l.id,
			number: null,
			status: l.status,
			stageLabel: s.label,
			stageEmoji: s.emoji,
			client: {
				id: null,
				name: l.name,
				company: l.company,
				phone: l.phone,
				email: l.email,
				address: null
			},
			event: {
				name: l.eventName ?? 'Brak nazwy',
				startDate: l.eventDateHint,
				endDate: null,
				venue: l.venueHint,
				guestsCount: l.guestsCount
			},
			totalCents: null,
			items: [],
			notes: l.notes,
			message: l.message,
			source: l.source,
			createdAt: l.createdAt,
			sentAt: null,
			viewedAt: null,
			acceptedAt: null
		};
	} else if (type === 'offer') {
		const [o] = await db
			.select({
				offer: offer,
				client: client
			})
			.from(offer)
			.leftJoin(client, eq(offer.clientId, client.id))
			.where(eq(offer.id, id))
			.limit(1);
		if (!o) throw error(404, 'Oferta nie istnieje');
		const items = await db.select().from(offerItem).where(eq(offerItem.offerId, id));
		const s = STAGES[`offer:${o.offer.status}`] ?? STAGES['offer:draft'];
		zlecenie = {
			type: 'offer',
			id: o.offer.id,
			number: o.offer.number,
			status: o.offer.status,
			stageLabel: s.label,
			stageEmoji: s.emoji,
			client: o.client
				? {
						id: o.client.id,
						name: o.client.name,
						company: o.client.company,
						phone: o.client.phone,
						email: o.client.email,
						address: o.client.address
					}
				: null,
			event: {
				name: o.offer.eventName,
				startDate: o.offer.eventStartDate,
				endDate: o.offer.eventEndDate,
				venue: o.offer.venue,
				guestsCount: null
			},
			totalCents: o.offer.totalCents,
			items: items.map((i) => ({
				description: i.description,
				quantity: i.quantity,
				unitPriceCents: i.unitPriceCents,
				lineTotalCents: i.lineTotalCents
			})),
			notes: o.offer.notes,
			message: null,
			source: null,
			createdAt: o.offer.createdAt,
			sentAt: o.offer.sentAt,
			viewedAt: o.offer.viewedAt,
			acceptedAt: o.offer.acceptedAt
		};
	} else if (type === 'booking') {
		const [b] = await db
			.select({ booking: booking, client: client })
			.from(booking)
			.leftJoin(client, eq(booking.clientId, client.id))
			.where(eq(booking.id, id))
			.limit(1);
		if (!b) throw error(404, 'Rezerwacja nie istnieje');
		// Fetch items via booking_tent join
		const bookedItems = await db
			.select({ bookingTent: bookingTent, item: item })
			.from(bookingTent)
			.leftJoin(item, eq(bookingTent.tentId, item.id))
			.where(eq(bookingTent.bookingId, id));
		const s = STAGES[`booking:${b.booking.status}`] ?? STAGES['booking:confirmed'];
		zlecenie = {
			type: 'booking',
			id: b.booking.id,
			number: null,
			status: b.booking.status,
			stageLabel: s.label,
			stageEmoji: s.emoji,
			client: b.client
				? {
						id: b.client.id,
						name: b.client.name,
						company: b.client.company,
						phone: b.client.phone,
						email: b.client.email,
						address: b.client.address
					}
				: null,
			event: {
				name: b.booking.eventName,
				startDate: b.booking.startDate,
				endDate: b.booking.endDate,
				venue: b.booking.venue,
				guestsCount: null
			},
			totalCents: b.booking.priceCents,
			items: bookedItems.map((bi) => ({
				description: bi.item?.name ?? 'Pozycja',
				quantity: bi.bookingTent.quantity,
				unitPriceCents: bi.item?.pricePerDayCents ?? 0,
				lineTotalCents: (bi.item?.pricePerDayCents ?? 0) * bi.bookingTent.quantity
			})),
			notes: b.booking.notes,
			message: null,
			source: null,
			createdAt: b.booking.createdAt,
			sentAt: null,
			viewedAt: null,
			acceptedAt: null
		};
	} else {
		throw error(400, `Nieznany typ zlecenia: ${type}`);
	}

	return { user, zlecenie };
};
