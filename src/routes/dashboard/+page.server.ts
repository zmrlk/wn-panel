import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { item, booking, bookingTent, lead, offer, client, bookingAssignment, user as userTable } from '$lib/server/db/schema';
import { and, asc, desc, eq, gte, isNull, lte, ne, or, sql } from 'drizzle-orm';

/**
 * DASHBOARD v5 — REAL DB.
 * - admin: matrix + funnel + alerty (pełny widok)
 * - employee: plan pracy — grouped "dziś / jutro / ten tydzień / później"
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	const me = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};
	const isAdmin = me.role === 'admin';

	// ═══ EMPLOYEE VIEW: plan pracy (moje eventy zgrupowane po dniach) ═══
	if (!isAdmin) {
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);
		const todayIso = todayStart.toISOString().slice(0, 10);

		const myAssignments = await db
			.select({
				bookingId: booking.id,
				eventName: booking.eventName,
				startDate: booking.startDate,
				endDate: booking.endDate,
				venue: booking.venue,
				status: booking.status,
				priceCents: booking.priceCents,
				clientName: client.name,
				clientPhone: client.phone,
				task: bookingAssignment.task,
				assignmentNotes: bookingAssignment.notes
			})
			.from(bookingAssignment)
			.innerJoin(booking, eq(bookingAssignment.bookingId, booking.id))
			.leftJoin(client, eq(booking.clientId, client.id))
			.where(
				and(
					eq(bookingAssignment.userId, me.id),
					ne(booking.status, 'cancelled')
				)
			)
			.orderBy(asc(booking.startDate));

		// Group: dziś / jutro / ten tydzień / później / zakończone (done)
		const tomorrowStart = new Date(todayStart);
		tomorrowStart.setDate(todayStart.getDate() + 1);
		const tomorrowIso = tomorrowStart.toISOString().slice(0, 10);
		const weekEnd = new Date(todayStart);
		weekEnd.setDate(todayStart.getDate() + 7);
		const weekEndIso = weekEnd.toISOString().slice(0, 10);

		type EventCard = typeof myAssignments[number];
		const groups: { label: string; emoji: string; events: EventCard[] }[] = [
			{ label: 'Dziś', emoji: '🔥', events: [] },
			{ label: 'Jutro', emoji: '⏰', events: [] },
			{ label: 'Ten tydzień', emoji: '📅', events: [] },
			{ label: 'Później', emoji: '🗓️', events: [] },
			{ label: 'Zakończone', emoji: '✓', events: [] }
		];

		for (const a of myAssignments) {
			if (a.status === 'done') {
				groups[4].events.push(a);
			} else if (a.startDate === todayIso || (a.startDate <= todayIso && a.endDate >= todayIso)) {
				groups[0].events.push(a);
			} else if (a.startDate === tomorrowIso) {
				groups[1].events.push(a);
			} else if (a.startDate > todayIso && a.startDate <= weekEndIso) {
				groups[2].events.push(a);
			} else if (a.startDate > weekEndIso) {
				groups[3].events.push(a);
			}
		}

		// Zostaw tylko niepuste grupy
		const activeGroups = groups.filter((g) => g.events.length > 0);

		const nowDate = new Date().toLocaleDateString('pl-PL', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});

		return {
			user: me,
			isAdmin: false as const,
			employeeView: true as const,
			groups: activeGroups,
			totalAssigned: myAssignments.length,
			nowDate
		};
	}

	// ═══ ADMIN VIEW — pełny matrix (poniżej) ═══

	// ─── Range: 21d | month | season ───────────────────────────
	const range = (url.searchParams.get('range') ?? '21d') as '21d' | 'month' | 'season';
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	let dayCount: number;
	let rangeLabel: string;
	if (range === 'month') {
		// Do końca bieżącego miesiąca +30d lookahead
		const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
		dayCount = Math.max(21, Math.min(45, Math.floor((endOfMonth.getTime() - today.getTime()) / 86400000) + 1));
		rangeLabel = today.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
	} else if (range === 'season') {
		// Do końca września
		const endOfSeason = new Date(today.getFullYear(), 8, 30); // 30 września
		dayCount = Math.max(30, Math.floor((endOfSeason.getTime() - today.getTime()) / 86400000) + 1);
		rangeLabel = `sezon do 30 września`;
	} else {
		dayCount = 21;
		rangeLabel = 'najbliższe 21 dni';
	}

	const days = Array.from({ length: dayCount }, (_, i) => {
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
					minQty: item.minQty,
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

	// Flagship free days — ile dni w zakresie ma wolny choć 1 szt. namiotu 6×3 (hot item)
	const flagship = items.find((i) => i.name.includes('6×3')) ?? items.find((i) => i.group === 'Namioty');
	const flagshipName = flagship?.name ?? 'namiot';
	const flagshipFreeDays = flagship
		? days.filter((d) => {
				const r = flagship.reserved[d.iso] ?? 0;
				const m = flagship.maintenance[d.iso] ?? 0;
				return flagship.total - r - m > 0;
			}).length
		: days.length;

	// Alert: items poniżej min_qty (lub dokładnie na min)
	const belowMinItems = rawItems
		.filter((r) => r.totalQty < r.minQty && r.minQty > 0)
		.map((r) => ({ id: r.id, name: r.name, totalQty: r.totalQty, minQty: r.minQty }));
	const atMinItems = rawItems
		.filter((r) => r.totalQty === r.minQty && r.minQty > 0)
		.map((r) => ({ id: r.id, name: r.name, totalQty: r.totalQty, minQty: r.minQty }));

	const status = {
		eventsThisWeek,
		needsAttention,
		flagshipFreeDays,
		flagshipName,
		totalDays: days.length,
		belowMin: belowMinItems.length,
		atMin: atMinItems.length,
		belowMinItems,
		atMinItems
	};

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

	return {
		user: me,
		isAdmin: true as const,
		employeeView: false as const,
		items,
		days,
		status,
		actions,
		warehouse,
		funnel,
		recentLeads,
		range,
		rangeLabel
	};
};
