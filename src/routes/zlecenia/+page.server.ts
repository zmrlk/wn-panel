import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { lead, offer, booking, client } from '$lib/server/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

/**
 * UNIFIED "Zlecenia" — leads + offers + bookings w jednej tabeli.
 * Każdy record ma "stage" (1-8) determinujący kolor i wartość w funnelu.
 *
 * Stage mapping:
 *   1. lead.new          → Nowy kontakt
 *   2. lead.contacted    → Skontaktowany
 *   3. lead.qualified    → Kwalifikowany
 *   4. offer.draft/sent  → Oferta wysłana
 *   5. offer.viewed      → Klient zobaczył
 *   6. offer.accepted    → Zaakceptowana
 *   7. booking.confirmed → Potwierdzona rezerwacja
 *   8. booking.done      → Zrealizowana
 *   X. lost/rejected/cancelled → Przegrana
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	const tabFilter = url.searchParams.get('tab') ?? 'nowe';

	// Load raw data
	const [leads, offers, bookings] = await Promise.all([
		db.select().from(lead).orderBy(desc(lead.createdAt)),
		db
			.select({
				id: offer.id,
				number: offer.number,
				eventName: offer.eventName,
				eventStartDate: offer.eventStartDate,
				eventEndDate: offer.eventEndDate,
				venue: offer.venue,
				totalCents: offer.totalCents,
				status: offer.status,
				notes: offer.notes,
				createdAt: offer.createdAt,
				sentAt: offer.sentAt,
				viewedAt: offer.viewedAt,
				acceptedAt: offer.acceptedAt,
				convertedToBookingId: offer.convertedToBookingId,
				clientId: offer.clientId,
				clientName: client.name,
				clientCompany: client.company,
				clientPhone: client.phone
			})
			.from(offer)
			.leftJoin(client, eq(offer.clientId, client.id))
			.orderBy(desc(offer.createdAt)),
		db
			.select({
				id: booking.id,
				eventName: booking.eventName,
				startDate: booking.startDate,
				endDate: booking.endDate,
				venue: booking.venue,
				priceCents: booking.priceCents,
				status: booking.status,
				notes: booking.notes,
				createdAt: booking.createdAt,
				clientId: booking.clientId,
				clientName: client.name,
				clientCompany: client.company,
				clientPhone: client.phone
			})
			.from(booking)
			.leftJoin(client, eq(booking.clientId, client.id))
			.orderBy(desc(booking.startDate))
	]);

	// Normalize all to unified "Zlecenie" shape
	type Zlecenie = {
		type: 'lead' | 'offer' | 'booking';
		id: string;
		number: string | null;
		stage: number;
		stageLabel: string;
		stageEmoji: string;
		contact: string;
		contactSub: string | null;
		phone: string | null;
		eventName: string;
		eventDate: string | null;
		eventDateEnd: string | null;
		venue: string | null;
		valueCents: number | null;
		status: string;
		isLost: boolean;
		notes: string | null;
		createdAt: Date;
	};

	const STAGES: Record<string, { stage: number; label: string; emoji: string; isLost: boolean }> = {
		'lead:new':           { stage: 1, label: 'Nowy',                emoji: '🆕', isLost: false },
		'lead:contacted':     { stage: 2, label: 'Skontaktowany',       emoji: '📞', isLost: false },
		'lead:qualified':     { stage: 3, label: 'Kwalifikowany',       emoji: '🎯', isLost: false },
		'lead:quoted':        { stage: 4, label: 'Oferta (lead)',       emoji: '✉️', isLost: false },
		'lead:won':           { stage: 7, label: 'Wygrany',             emoji: '✅', isLost: false },
		'lead:lost':          { stage: 0, label: 'Przegrany',           emoji: '✕',  isLost: true  },
		'lead:archived':      { stage: 0, label: 'Archiwum',            emoji: '📦', isLost: true  },
		'offer:draft':        { stage: 4, label: 'Oferta (szkic)',      emoji: '✏️', isLost: false },
		'offer:sent':         { stage: 4, label: 'Oferta wysłana',      emoji: '✉️', isLost: false },
		'offer:viewed':       { stage: 5, label: 'Klient zobaczył',     emoji: '👀', isLost: false },
		'offer:accepted':     { stage: 6, label: 'Zaakceptowana',       emoji: '✅', isLost: false },
		'offer:rejected':     { stage: 0, label: 'Odrzucona',           emoji: '✕',  isLost: true  },
		'offer:expired':      { stage: 0, label: 'Wygasła',             emoji: '⏰', isLost: true  },
		'booking:draft':      { stage: 6, label: 'Rezerw. szkic',       emoji: '📝', isLost: false },
		'booking:confirmed':  { stage: 7, label: 'Potwierdzona',        emoji: '✅', isLost: false },
		'booking:in-progress':{ stage: 7, label: 'W trakcie',           emoji: '🚚', isLost: false },
		'booking:done':       { stage: 8, label: 'Zrealizowana',        emoji: '🎉', isLost: false },
		'booking:cancelled':  { stage: 0, label: 'Anulowana',           emoji: '✕',  isLost: true  }
	};

	const zlecenia: Zlecenie[] = [];

	// Mapa pomocnicza — pomijaj leady które są "won" (stały się ofertą/rezerwacją)
	// Pomijaj oferty które mają convertedToBookingId (są już w booking rows)
	const skipOffers = new Set<string>(
		offers.filter((o) => o.convertedToBookingId).map((o) => o.id)
	);

	for (const l of leads) {
		if (l.status === 'won') continue; // zastąpione przez offer lub booking
		const key = `lead:${l.status}`;
		const s = STAGES[key] ?? STAGES['lead:new'];
		zlecenia.push({
			type: 'lead',
			id: l.id,
			number: null,
			stage: s.stage,
			stageLabel: s.label,
			stageEmoji: s.emoji,
			contact: l.name,
			contactSub: l.company,
			phone: l.phone,
			eventName: l.eventName ?? 'Brak eventu',
			eventDate: l.eventDateHint,
			eventDateEnd: null,
			venue: l.venueHint,
			valueCents: null,
			status: l.status,
			isLost: s.isLost,
			notes: l.notes ?? l.message,
			createdAt: l.createdAt
		});
	}

	for (const o of offers) {
		if (skipOffers.has(o.id)) continue; // ma swój booking row
		const key = `offer:${o.status}`;
		const s = STAGES[key] ?? STAGES['offer:draft'];
		zlecenia.push({
			type: 'offer',
			id: o.id,
			number: o.number,
			stage: s.stage,
			stageLabel: s.label,
			stageEmoji: s.emoji,
			contact: o.clientName ?? '—',
			contactSub: o.clientCompany,
			phone: o.clientPhone,
			eventName: o.eventName,
			eventDate: o.eventStartDate,
			eventDateEnd: o.eventEndDate,
			venue: o.venue,
			valueCents: o.totalCents,
			status: o.status,
			isLost: s.isLost,
			notes: o.notes,
			createdAt: o.createdAt
		});
	}

	for (const b of bookings) {
		const key = `booking:${b.status}`;
		const s = STAGES[key] ?? STAGES['booking:confirmed'];
		zlecenia.push({
			type: 'booking',
			id: b.id,
			number: null,
			stage: s.stage,
			stageLabel: s.label,
			stageEmoji: s.emoji,
			contact: b.clientName ?? '—',
			contactSub: b.clientCompany,
			phone: b.clientPhone,
			eventName: b.eventName,
			eventDate: b.startDate,
			eventDateEnd: b.endDate,
			venue: b.venue,
			valueCents: b.priceCents,
			status: b.status,
			isLost: s.isLost,
			notes: b.notes,
			createdAt: b.createdAt
		});
	}

	// Counts per tab (user's order: Nowe → W toku → Potwierdzone → Zrobione → Przegrane → Wszystko)
	const counts = {
		all: zlecenia.length,
		nowe: zlecenia.filter((z) => z.stage >= 1 && z.stage <= 3).length,
		'w-toku': zlecenia.filter((z) => z.stage >= 4 && z.stage <= 6).length,
		potwierdzone: zlecenia.filter((z) => z.stage === 7).length,
		done: zlecenia.filter((z) => z.stage === 8).length,
		przegrane: zlecenia.filter((z) => z.isLost).length
	};

	let filtered = zlecenia;
	if (tabFilter === 'nowe') filtered = zlecenia.filter((z) => z.stage >= 1 && z.stage <= 3);
	else if (tabFilter === 'w-toku') filtered = zlecenia.filter((z) => z.stage >= 4 && z.stage <= 6);
	else if (tabFilter === 'potwierdzone') filtered = zlecenia.filter((z) => z.stage === 7);
	else if (tabFilter === 'zrobione') filtered = zlecenia.filter((z) => z.stage === 8);
	else if (tabFilter === 'przegrane') filtered = zlecenia.filter((z) => z.isLost);
	else if (tabFilter === 'wszystko') filtered = zlecenia;

	// Sort — active first, then by stage descending, then by date
	filtered.sort((a, b) => {
		if (a.stage !== b.stage) return b.stage - a.stage;
		const ad = a.eventDate ? new Date(a.eventDate).getTime() : 0;
		const bd = b.eventDate ? new Date(b.eventDate).getTime() : 0;
		return ad - bd;
	});

	// Aggregates
	const activeValue = zlecenia
		.filter((z) => !z.isLost && z.stage >= 4 && z.stage <= 7 && z.valueCents)
		.reduce((s, z) => s + (z.valueCents ?? 0), 0);

	return { user, zlecenia: filtered, counts, tabFilter, activeValue };
};
