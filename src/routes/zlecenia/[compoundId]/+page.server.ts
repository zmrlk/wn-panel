import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { lead, offer, offerItem, booking, bookingTent, client, item } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';

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

	// Unified labels — "w trakcie" dla pośrednich stanów, ale zachowujemy fine-grained sub-label
	const STAGES: Record<string, { label: string; emoji: string }> = {
		'lead:new': { label: 'Nowy', emoji: '🆕' },
		'lead:contacted': { label: 'W trakcie · kontakt', emoji: '📞' },
		'lead:qualified': { label: 'W trakcie · hot', emoji: '🎯' },
		'lead:quoted': { label: 'W trakcie · oferta', emoji: '✉️' },
		'lead:won': { label: 'Wygrany', emoji: '✅' },
		'lead:lost': { label: 'Przegrany', emoji: '✕' },
		'lead:archived': { label: 'Archiwum', emoji: '📦' },
		'offer:draft': { label: 'W trakcie · szkic', emoji: '✏️' },
		'offer:sent': { label: 'W trakcie · wysłana', emoji: '✉️' },
		'offer:viewed': { label: 'W trakcie · zobaczył', emoji: '👀' },
		'offer:accepted': { label: 'Wygrany', emoji: '✅' },
		'offer:rejected': { label: 'Przegrany', emoji: '✕' },
		'offer:expired': { label: 'Przegrany · wygasła', emoji: '⏰' },
		'booking:draft': { label: 'W trakcie · szkic', emoji: '📝' },
		'booking:confirmed': { label: 'W trakcie · potwierdzona', emoji: '✅' },
		'booking:in-progress': { label: 'W trakcie · realizacja', emoji: '🚚' },
		'booking:done': { label: 'Wygrany', emoji: '🎉' },
		'booking:cancelled': { label: 'Przegrany', emoji: '✕' }
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

export const actions: Actions = {
	updateStatus: async ({ request, params }) => {
		const form = await request.formData();
		const bucket = form.get('status')?.toString();
		if (!bucket) return fail(400);

		const compound = params.compoundId!;
		const dashIdx = compound.indexOf('-');
		const type = compound.slice(0, dashIdx) as 'lead' | 'offer' | 'booking';
		const id = compound.slice(dashIdx + 1);

		// Unified bucket → DB status per-type
		const UNIFIED_TO_DB: Record<string, Record<string, string>> = {
			lead: {
				nowy: 'new',
				'w-trakcie': 'contacted',
				wygrany: 'won',
				przegrany: 'lost',
				archiwum: 'archived'
			},
			offer: {
				'w-trakcie': 'sent',
				wygrany: 'accepted',
				przegrany: 'rejected',
				archiwum: 'expired'
			},
			booking: {
				'w-trakcie': 'confirmed',
				wygrany: 'done',
				przegrany: 'cancelled'
			}
		};

		// Fallback: jeśli to już surowy DB status (np. ktoś prześle "new"), pozostaw bez mapowania
		const mapped = UNIFIED_TO_DB[type]?.[bucket] ?? bucket;

		const table = type === 'lead' ? lead : type === 'offer' ? offer : booking;
		await db.update(table).set({ status: mapped, updatedAt: new Date() }).where(eq(table.id, id));

		// ═══ AUTO-KONWERSJA: offer.accepted → utwórz booking + booking_tent ═══
		// Gdy user klika "Wygrany" na ofercie: automatycznie tworzymy rezerwację.
		// Przenosi items (tylko te z tentId != null) do booking_tent.
		if (type === 'offer' && mapped === 'accepted') {
			const [o] = await db.select().from(offer).where(eq(offer.id, id)).limit(1);
			if (o && !o.convertedToBookingId && o.clientId) {
				const items = await db.select().from(offerItem).where(eq(offerItem.offerId, id));
				const [newBooking] = await db
					.insert(booking)
					.values({
						clientId: o.clientId,
						eventName: o.eventName,
						startDate: o.eventStartDate,
						endDate: o.eventEndDate,
						venue: o.venue,
						priceCents: o.totalCents,
						status: 'confirmed',
						notes: `Rezerwacja utworzona z oferty ${o.number} (${new Date().toLocaleDateString('pl-PL')})`
					})
					.returning();

				// Tylko items powiązane z magazynem (tentId != null) trafiają do booking_tent
				const tentItems = items.filter((i) => i.tentId);
				if (tentItems.length > 0) {
					await db.insert(bookingTent).values(
						tentItems.map((i) => ({
							bookingId: newBooking.id,
							tentId: i.tentId!,
							quantity: i.quantity
						}))
					);
				}

				// Zaznacz ofertę jako skonwertowaną
				await db
					.update(offer)
					.set({
						convertedToBookingId: newBooking.id,
						acceptedAt: new Date(),
						updatedAt: new Date()
					})
					.where(eq(offer.id, id));

				// Redirect do nowo utworzonego bookingu
				throw redirect(303, `/zlecenia/booking-${newBooking.id}`);
			}
		}

		return { success: true };
	},

	addNote: async ({ request, params, locals }) => {
		const form = await request.formData();
		const content = form.get('content')?.toString().trim() ?? '';
		if (!content) return fail(400, { error: 'empty' });

		const compound = params.compoundId!;
		const dashIdx = compound.indexOf('-');
		const type = compound.slice(0, dashIdx) as 'lead' | 'offer' | 'booking';
		const id = compound.slice(dashIdx + 1);

		const author = locals.user?.name ?? 'Denis';
		const ts = new Date().toLocaleString('pl-PL', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
		const entry = `[${ts} · ${author}] ${content}`;

		// Append to existing notes (newest first)
		const table = type === 'lead' ? lead : type === 'offer' ? offer : booking;
		const [existing] = await db.select({ notes: table.notes }).from(table).where(eq(table.id, id));
		const combined = existing?.notes ? `${entry}\n\n${existing.notes}` : entry;
		await db.update(table).set({ notes: combined, updatedAt: new Date() }).where(eq(table.id, id));
		return { success: true };
	}
};
