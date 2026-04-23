import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { lead, offer, booking, client, payment, bookingAssignment } from '$lib/server/db/schema';
import { desc, eq, sql, inArray } from 'drizzle-orm';

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
	const me = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};
	const isAdmin = me.role === 'admin';

	const tabFilter = url.searchParams.get('tab') ?? 'w-trakcie';

	// Dla non-admin: zbierz booking IDs gdzie user jest w zespole
	let myBookingIds: string[] = [];
	if (!isAdmin) {
		const myAssigned = await db
			.select({ bookingId: bookingAssignment.bookingId })
			.from(bookingAssignment)
			.where(eq(bookingAssignment.userId, me.id));
		myBookingIds = [...new Set(myAssigned.map((a) => a.bookingId))];
	}

	// Load raw data + payment sums per booking
	const [leads, offers, bookings, paymentSums] = await Promise.all([
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
			.orderBy(desc(booking.startDate)),
		db
			.select({
				bookingId: payment.bookingId,
				paid: sql<number>`coalesce(sum(${payment.amountCents}), 0)::int`
			})
			.from(payment)
			.groupBy(payment.bookingId)
	]);
	const paidByBooking = new Map(paymentSums.map((r) => [r.bookingId, r.paid]));

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
		paidCents: number; // 0 dla lead/offer, sumowane dla bookingu
		status: string;
		isLost: boolean;
		notes: string | null;
		createdAt: Date;
	};

	// UNIFIED 6-STAGE MODEL (v5.20):
	//   1 = Nowy            (świeży lead, nic nie ruszane)
	//   2 = W trakcie       (negocjacja: lead kontakt, oferta draft/sent)
	//   3 = Wygrany         (klient zaakceptował → booking do REALIZACJI: draft/confirmed/in-progress)
	//   4 = Zrealizowany    (booking.done — event za nami)
	//   5 = Przegrany       (lost/rejected/expired/cancelled)
	//   6 = Archiwum        (lead.archived)
	const STAGES: Record<string, { stage: number; label: string; emoji: string; isLost: boolean }> = {
		'lead:new':           { stage: 1, label: 'Nowy',           emoji: '🆕', isLost: false },
		'lead:contacted':     { stage: 2, label: 'W trakcie',      emoji: '📞', isLost: false },
		'lead:qualified':     { stage: 2, label: 'W trakcie',      emoji: '🎯', isLost: false },
		'lead:quoted':        { stage: 2, label: 'W trakcie',      emoji: '✉️', isLost: false },
		'lead:won':           { stage: 4, label: 'Zrealizowany',   emoji: '🎉', isLost: false },
		'lead:lost':          { stage: 5, label: 'Przegrany',      emoji: '✕',  isLost: true  },
		'lead:archived':      { stage: 6, label: 'Archiwum',       emoji: '📦', isLost: true  },
		'offer:draft':        { stage: 2, label: 'W trakcie',      emoji: '✏️', isLost: false },
		'offer:sent':         { stage: 2, label: 'W trakcie',      emoji: '✉️', isLost: false },
		'offer:viewed':       { stage: 2, label: 'W trakcie',      emoji: '👀', isLost: false },
		'offer:accepted':     { stage: 3, label: 'Wygrany',        emoji: '✅', isLost: false },
		'offer:rejected':     { stage: 5, label: 'Przegrany',      emoji: '✕',  isLost: true  },
		'offer:expired':      { stage: 5, label: 'Przegrany',      emoji: '⏰', isLost: true  },
		'booking:draft':      { stage: 3, label: 'Wygrany',        emoji: '📝', isLost: false },
		'booking:confirmed':  { stage: 3, label: 'Wygrany',        emoji: '✅', isLost: false },
		'booking:in-progress':{ stage: 3, label: 'W realizacji',   emoji: '🚚', isLost: false },
		'booking:done':       { stage: 4, label: 'Zrealizowany',   emoji: '🎉', isLost: false },
		'booking:cancelled':  { stage: 5, label: 'Przegrany',      emoji: '✕',  isLost: true  }
	};

	const zlecenia: Zlecenie[] = [];

	// Non-admin: widzi TYLKO bookingi gdzie jest w zespole (brak leadów/ofert)
	// Admin: pełny dostęp
	const myBookingSet = new Set(myBookingIds);
	const filteredLeads = isAdmin ? leads : [];
	const filteredOffers = isAdmin ? offers : [];
	const filteredBookings = isAdmin
		? bookings
		: bookings.filter((b) => myBookingSet.has(b.id));

	// Deduplikacja:
	// - lead skipowany TYLKO jeśli ma zarejestrowany offer (z leadId) — inaczej pokazuj
	// - offer skipowany gdy ma convertedToBookingId ALBO matching booking (retroactive)
	const leadsWithOffer = new Set<string>(
		offers.map((o) => o.leadId).filter((id): id is string => id != null)
	);

	// Retroactive match: offer.accepted bez convertedToBookingId ale z matching booking
	// (stary seed sprzed v5.17 auto-konwersji albo ręczne tworzenie bookingu)
	const bookingKeys = new Set(
		bookings.map((b) => `${b.clientId}::${b.eventName}::${b.startDate}`)
	);
	const skipOffers = new Set<string>(
		offers
			.filter(
				(o) =>
					o.convertedToBookingId ||
					(o.status === 'accepted' &&
						o.clientId &&
						bookingKeys.has(`${o.clientId}::${o.eventName}::${o.eventStartDate}`))
			)
			.map((o) => o.id)
	);

	for (const l of filteredLeads) {
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
			paidCents: 0,
			status: l.status,
			isLost: s.isLost,
			notes: l.notes ?? l.message,
			createdAt: l.createdAt
		});
	}

	for (const o of filteredOffers) {
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
			paidCents: 0,
			status: o.status,
			isLost: s.isLost,
			notes: o.notes,
			createdAt: o.createdAt
		});
	}

	for (const b of filteredBookings) {
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
			paidCents: paidByBooking.get(b.id) ?? 0,
			status: b.status,
			isLost: s.isLost,
			notes: b.notes,
			createdAt: b.createdAt
		});
	}

	// Counts per tab (6 DB stages → 5 UI tabs; historia = 4+5+6)
	const counts = {
		all: zlecenia.length,
		nowy: zlecenia.filter((z) => z.stage === 1).length,
		'w-trakcie': zlecenia.filter((z) => z.stage === 2).length,
		wygrany: zlecenia.filter((z) => z.stage === 3).length,
		historia: zlecenia.filter((z) => z.stage >= 4).length
	};

	// Search filter (q= param)
	const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();

	let filtered = zlecenia;
	if (tabFilter === 'nowy') filtered = zlecenia.filter((z) => z.stage === 1);
	else if (tabFilter === 'w-trakcie') filtered = zlecenia.filter((z) => z.stage === 2);
	else if (tabFilter === 'wygrany') filtered = zlecenia.filter((z) => z.stage === 3);
	else if (tabFilter === 'historia') filtered = zlecenia.filter((z) => z.stage >= 4);
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

	// Aggregates — wartość aktywnych (w-trakcie + wygrany = negocjacja + do realizacji)
	const activeValue = zlecenia
		.filter((z) => (z.stage === 2 || z.stage === 3) && z.valueCents)
		.reduce((s, z) => s + (z.valueCents ?? 0), 0);

	return { user: me, isAdmin, zlecenia: filtered, counts, tabFilter, activeValue, q };
};
