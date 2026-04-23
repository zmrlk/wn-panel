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

	const tabFilter = url.searchParams.get('tab') ?? 'w-trakcie';

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
				leadId: offer.leadId,
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

	// UNIFIED 5-STAGE MODEL (v5.9):
	//   1 = Nowy       (tylko świeży lead)
	//   2 = W trakcie  (wszystko "happening" — kontakt, oferta, rezerwacja)
	//   3 = Wygrany    (zamknięte na plus: accepted/done/won)
	//   4 = Przegrany  (lost/rejected/expired/cancelled)
	//   5 = Archiwum   (lead.archived)
	const STAGES: Record<string, { stage: number; label: string; emoji: string; isLost: boolean }> = {
		'lead:new':           { stage: 1, label: 'Nowy',           emoji: '🆕', isLost: false },
		'lead:contacted':     { stage: 2, label: 'W trakcie',      emoji: '📞', isLost: false },
		'lead:qualified':     { stage: 2, label: 'W trakcie',      emoji: '📞', isLost: false },
		'lead:quoted':        { stage: 2, label: 'W trakcie',      emoji: '✉️', isLost: false },
		'lead:won':           { stage: 3, label: 'Wygrany',        emoji: '✅', isLost: false },
		'lead:lost':          { stage: 4, label: 'Przegrany',      emoji: '✕',  isLost: true  },
		'lead:archived':      { stage: 5, label: 'Archiwum',       emoji: '📦', isLost: true  },
		'offer:draft':        { stage: 2, label: 'W trakcie',      emoji: '✏️', isLost: false },
		'offer:sent':         { stage: 2, label: 'W trakcie',      emoji: '✉️', isLost: false },
		'offer:viewed':       { stage: 2, label: 'W trakcie',      emoji: '👀', isLost: false },
		'offer:accepted':     { stage: 3, label: 'Wygrany',        emoji: '✅', isLost: false },
		'offer:rejected':     { stage: 4, label: 'Przegrany',      emoji: '✕',  isLost: true  },
		'offer:expired':      { stage: 4, label: 'Przegrany',      emoji: '⏰', isLost: true  },
		'booking:draft':      { stage: 2, label: 'W trakcie',      emoji: '📝', isLost: false },
		'booking:confirmed':  { stage: 2, label: 'W trakcie',      emoji: '✅', isLost: false },
		'booking:in-progress':{ stage: 2, label: 'W trakcie',      emoji: '🚚', isLost: false },
		'booking:done':       { stage: 3, label: 'Wygrany',        emoji: '🎉', isLost: false },
		'booking:cancelled':  { stage: 4, label: 'Przegrany',      emoji: '✕',  isLost: true  }
	};

	const zlecenia: Zlecenie[] = [];

	// Deduplikacja:
	// - lead skipowany TYLKO jeśli ma zarejestrowany offer (z leadId) — inaczej pokazuj
	// - offer skipowany gdy ma convertedToBookingId — booking reprezentuje
	const leadsWithOffer = new Set<string>(
		offers.map((o) => o.leadId).filter((id): id is string => id != null)
	);
	const skipOffers = new Set<string>(
		offers.filter((o) => o.convertedToBookingId).map((o) => o.id)
	);

	for (const l of leads) {
		if (leadsWithOffer.has(l.id)) continue; // offer pokaże to zlecenie
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

	// Counts per tab (5-stage model)
	const counts = {
		all: zlecenia.length,
		nowy: zlecenia.filter((z) => z.stage === 1).length,
		'w-trakcie': zlecenia.filter((z) => z.stage === 2).length,
		wygrany: zlecenia.filter((z) => z.stage === 3).length,
		przegrany: zlecenia.filter((z) => z.stage === 4).length,
		archiwum: zlecenia.filter((z) => z.stage === 5).length
	};

	// Search filter (q= param)
	const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();

	let filtered = zlecenia;
	if (tabFilter === 'nowy') filtered = zlecenia.filter((z) => z.stage === 1);
	else if (tabFilter === 'w-trakcie') filtered = zlecenia.filter((z) => z.stage === 2);
	else if (tabFilter === 'wygrany') filtered = zlecenia.filter((z) => z.stage === 3);
	else if (tabFilter === 'przegrany') filtered = zlecenia.filter((z) => z.stage === 4);
	else if (tabFilter === 'archiwum') filtered = zlecenia.filter((z) => z.stage === 5);
	else if (tabFilter === 'wszystko') filtered = zlecenia;

	if (q) {
		filtered = filtered.filter((z) => {
			const hay = [z.contact, z.contactSub, z.eventName, z.venue, z.number, z.phone, z.notes]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return hay.includes(q);
		});
	}

	// Sort — active first, then by stage descending, then by date
	filtered.sort((a, b) => {
		if (a.stage !== b.stage) return a.stage - b.stage; // 1,2,3,4,5 — nowe najpierw
		const ad = a.eventDate ? new Date(a.eventDate).getTime() : 0;
		const bd = b.eventDate ? new Date(b.eventDate).getTime() : 0;
		return ad - bd;
	});

	// Aggregates — wartość aktywnych (w-trakcie + wygrany)
	const activeValue = zlecenia
		.filter((z) => (z.stage === 2 || z.stage === 3) && z.valueCents)
		.reduce((s, z) => s + (z.valueCents ?? 0), 0);

	return { user, zlecenia: filtered, counts, tabFilter, activeValue, q };
};
