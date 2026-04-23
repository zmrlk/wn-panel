import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { item, booking, bookingTent, lead, offer, client } from '$lib/server/db/schema';
import { and, desc, eq, gte, isNull, lte, ne, or, sql } from 'drizzle-orm';

/**
 * DASHBOARD v5 — REAL DB.
 * - items: z tabeli `tent` (alias item), grouped by category
 * - reserved[iso]: JOIN booking + booking_tent, sumuj quantity per item per day w active bookings
 * - maintenance: item.status = 'maintenance' (point-in-time, applied across full range)
 * - status/funnel/actions/recentLeads: agregacje z lead/offer/booking
 */
export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	// ─── Dni (next 21 od dziś) ──────────────────────────────────
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const days = Array.from({ length: 21 }, (_, i) => {
		const d = new Date(today);
		d.setDate(today.getDate() + i);
		return {
			iso: d.toISOString().slice(0, 10),
			day: d.getDate(),
			weekday: ['niedz', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'][d.getDay()],
			isToday: i === 0,
			isWeekend: d.getDay() === 0 || d.getDay() === 6
		};
	});
	const rangeStart = days[0].iso;
	const rangeEnd = days[days.length - 1].iso;

	// ─── Pull wszystkie dane równolegle ─────────────────────────
	const [rawItems, activeBookings, leadCounts, offerStats, bookingStatusCounts, recentLeadsRaw] =
		await Promise.all([
			db
				.select({
					id: item.id,
					name: item.name,
					itemType: item.itemType,
					category: item.category,
					totalQty: item.totalQty,
					status: item.status
				})
				.from(item)
				.where(isNull(item.archivedAt))
				.orderBy(item.category, item.name),

			// Bookings aktywne w zakresie (draft/confirmed/in-progress) + JOIN booking_tent
			db
				.select({
					bookingId: booking.id,
					startDate: booking.startDate,
					endDate: booking.endDate,
					status: booking.status,
					tentId: bookingTent.tentId,
					quantity: bookingTent.quantity
				})
				.from(booking)
				.leftJoin(bookingTent, eq(bookingTent.bookingId, booking.id))
				.where(
					and(
						lte(booking.startDate, rangeEnd),
						gte(booking.endDate, rangeStart),
						ne(booking.status, 'cancelled')
					)
				),

			db
				.select({ status: lead.status, cnt: sql<number>`count(*)::int` })
				.from(lead)
				.groupBy(lead.status),

			db
				.select({
					status: offer.status,
					cnt: sql<number>`count(*)::int`,
					totalCents: sql<number>`coalesce(sum(${offer.totalCents}), 0)::bigint`
				})
				.from(offer)
				.groupBy(offer.status),

			db
				.select({ status: booking.status, cnt: sql<number>`count(*)::int` })
				.from(booking)
				.groupBy(booking.status),

			db
				.select({
					id: lead.id,
					name: lead.name,
					eventName: lead.eventName,
					source: lead.source,
					status: lead.status,
					createdAt: lead.createdAt
				})
				.from(lead)
				.where(
					or(
						eq(lead.status, 'new'),
						eq(lead.status, 'contacted'),
						eq(lead.status, 'qualified')
					)
				)
				.orderBy(desc(lead.createdAt))
				.limit(5)
		]);

	// ─── Matrix struct: reserved[iso] per item ──────────────────
	type MatrixItem = {
		id: string;
		name: string;
		group: string;
		total: number;
		reserved: Record<string, number>;
		maintenance: Record<string, number>;
	};

	const categoryOf = (cat: string | null, itemType: string) => {
		if (cat) return cat;
		return (
			{
				tent: 'Namioty',
				table: 'Stoły',
				chair: 'Krzesła',
				bench: 'Ławki',
				light: 'Oświetlenie',
				accessory: 'Akcesoria'
			}[itemType] ?? 'Inne'
		);
	};

	const items: MatrixItem[] = rawItems.map((r) => ({
		id: r.id,
		name: r.name,
		group: categoryOf(r.category, r.itemType),
		total: r.totalQty,
		reserved: {},
		maintenance: {}
	}));
	const itemById = new Map(items.map((it) => [it.id, it]));

	// Apply reservations: dla każdego booking_tent row, dopisz qty do każdego dnia z zakresu
	for (const row of activeBookings) {
		if (!row.tentId || row.quantity == null) continue;
		const it = itemById.get(row.tentId);
		if (!it) continue;
		const s = row.startDate > rangeStart ? row.startDate : rangeStart;
		const e = row.endDate < rangeEnd ? row.endDate : rangeEnd;
		const sDate = new Date(s);
		const eDate = new Date(e);
		for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
			const iso = d.toISOString().slice(0, 10);
			it.reserved[iso] = (it.reserved[iso] ?? 0) + row.quantity;
		}
	}

	// Maintenance: item.status = 'maintenance' → mark all days
	for (const raw of rawItems) {
		if (raw.status === 'maintenance') {
			const it = itemById.get(raw.id);
			if (!it) continue;
			for (const d of days) {
				it.maintenance[d.iso] = it.total;
			}
		}
	}

	// ─── Funnel (CRM) ───────────────────────────────────────────
	const leadBy = Object.fromEntries(leadCounts.map((r) => [r.status, r.cnt]));
	const offerBy = Object.fromEntries(
		offerStats.map((r) => [r.status, { cnt: r.cnt, totalCents: Number(r.totalCents) }])
	);
	const bookingBy = Object.fromEntries(bookingStatusCounts.map((r) => [r.status, r.cnt]));

	const leadsNew = leadBy['new'] ?? 0;
	const leadsContacted = leadBy['contacted'] ?? 0;
	const leadsQualified = leadBy['qualified'] ?? 0;
	const leadsTotal = Object.values(leadBy).reduce((s, n) => s + n, 0);
	const leadsLost = leadBy['lost'] ?? 0;
	const offersDraft = offerBy['draft']?.cnt ?? 0;
	const offersSent = (offerBy['sent']?.cnt ?? 0) + (offerBy['viewed']?.cnt ?? 0);
	const offersViewed = offerBy['viewed']?.cnt ?? 0;
	const offersAccepted = offerBy['accepted']?.cnt ?? 0;
	const bookingsConfirmed = bookingBy['confirmed'] ?? 0;
	const pendingValueZl = Math.round(
		((offerBy['sent']?.totalCents ?? 0) + (offerBy['viewed']?.totalCents ?? 0)) / 100
	);
	const conversionPct =
		leadsTotal > 0 ? Math.round((bookingsConfirmed / Math.max(leadsTotal - leadsLost, 1)) * 100) : 0;

	const funnel = {
		leadsNew,
		leadsContacted,
		leadsQualified,
		offersDraft,
		offersSent,
		offersViewed,
		offersAccepted,
		bookingsConfirmed,
		pendingValueZl,
		conversionPct
	};

	// ─── Status top metrics ─────────────────────────────────────
	const weekEnd = new Date(today);
	weekEnd.setDate(today.getDate() + 7);
	const weekEndIso = weekEnd.toISOString().slice(0, 10);
	const eventsThisWeek = activeBookings.filter(
		(b, i, a) =>
			a.findIndex((x) => x.bookingId === b.bookingId) === i &&
			b.startDate <= weekEndIso &&
			b.endDate >= rangeStart &&
			(b.status === 'confirmed' || b.status === 'in-progress')
	).length;
	const needsAttention = activeBookings.filter(
		(b, i, a) =>
			a.findIndex((x) => x.bookingId === b.bookingId) === i &&
			b.startDate <= weekEndIso &&
			b.status === 'draft'
	).length;

	// Free slots — prosty proxy: ile dni w zakresie ma <50% rezerwacji u namiotu 6×3 (flagship)
	const flagship = items.find((i) => i.name.includes('6×3')) ?? items.find((i) => i.group === 'Namioty');
	const freeSlotsMay = flagship
		? days.filter((d) => {
				const r = flagship.reserved[d.iso] ?? 0;
				const m = flagship.maintenance[d.iso] ?? 0;
				return flagship.total - r - m > 0;
			}).length
		: days.length;

	const status = { eventsThisWeek, needsAttention, freeSlotsMay };

	// ─── Actions (bookings needing attention) ───────────────────
	const actionsRaw = await db
		.select({
			id: booking.id,
			eventName: booking.eventName,
			startDate: booking.startDate,
			status: booking.status,
			venue: booking.venue,
			notes: booking.notes,
			clientName: client.name
		})
		.from(booking)
		.leftJoin(client, eq(booking.clientId, client.id))
		.where(
			and(
				gte(booking.startDate, rangeStart),
				lte(booking.startDate, weekEndIso),
				ne(booking.status, 'cancelled'),
				ne(booking.status, 'done')
			)
		)
		.orderBy(booking.startDate)
		.limit(5);

	const actions = actionsRaw
		.map((b) => {
			let reason: string | null = null;
			let severity: 'warn' | 'info' = 'info';
			if (!b.venue) {
				reason = 'brak adresu';
				severity = 'warn';
			} else if (b.status === 'draft') {
				reason = 'potwierdź rezerwację';
				severity = 'warn';
			} else if (!b.notes) {
				reason = 'dodaj notatkę';
				severity = 'info';
			}
			if (!reason) return null;
			const d = new Date(b.startDate);
			const dateLabel = `${d.getDate()} ${['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru'][d.getMonth()]}`;
			return {
				id: b.id,
				event: b.clientName ? `${b.eventName} · ${b.clientName}` : b.eventName,
				date: dateLabel,
				reason,
				severity
			};
		})
		.filter((a): a is NonNullable<typeof a> => a !== null);

	// ─── Warehouse summary (per grupa) ──────────────────────────
	const groupOrder = ['Namioty', 'Stoły', 'Krzesła', 'Ławki', 'Oświetlenie', 'Akcesoria'];
	const todayIso = days[0].iso;
	const warehouse = groupOrder
		.map((g) => {
			const inGroup = items.filter((i) => i.group === g);
			if (inGroup.length === 0) return null;
			const total = inGroup.reduce((s, i) => s + i.total, 0);
			const reservedToday = inGroup.reduce((s, i) => s + (i.reserved[todayIso] ?? 0), 0);
			const maintToday = inGroup.reduce((s, i) => s + (i.maintenance[todayIso] ?? 0), 0);
			const available = total - reservedToday - maintToday;
			return {
				group: g,
				types: inGroup.length,
				total,
				available,
				reserved: reservedToday,
				maintenance: maintToday
			};
		})
		.filter((w): w is NonNullable<typeof w> => w !== null);

	// ─── Recent leads ───────────────────────────────────────────
	const now = Date.now();
	const ageLabel = (d: Date) => {
		const diffH = Math.floor((now - d.getTime()) / 3_600_000);
		if (diffH < 1) return 'teraz';
		if (diffH < 24) return `${diffH}h`;
		return `${Math.floor(diffH / 24)}d`;
	};
	const recentLeads = recentLeadsRaw.map((l) => ({
		id: l.id,
		name: l.name,
		event: l.eventName ?? '—',
		source: l.source ?? 'other',
		status: l.status,
		age: ageLabel(new Date(l.createdAt))
	}));

	return { user, items, days, status, actions, warehouse, funnel, recentLeads };
};
