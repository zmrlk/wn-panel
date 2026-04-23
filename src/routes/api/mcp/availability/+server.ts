import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { item, booking, bookingTent } from '$lib/server/db/schema';
import { and, eq, gte, isNull, lte, ne } from 'drizzle-orm';

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: RequestHandler = async () =>
	new Response(null, { status: 204, headers: CORS });

/**
 * GET /api/mcp/availability?date_start=YYYY-MM-DD&date_end=YYYY-MM-DD
 * Zwraca dostępne items w zakresie dat.
 *
 * Per item: total / reserved (w tym zakresie) / available.
 */
export const GET: RequestHandler = async ({ url }) => {
	const dateStart = url.searchParams.get('date_start');
	const dateEnd = url.searchParams.get('date_end') ?? dateStart;

	if (!dateStart) {
		return json(
			{ ok: false, error: 'Wymagane: date_start (YYYY-MM-DD)' },
			{ status: 400, headers: CORS }
		);
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStart) || !/^\d{4}-\d{2}-\d{2}$/.test(dateEnd!)) {
		return json(
			{ ok: false, error: 'Format dat: YYYY-MM-DD' },
			{ status: 400, headers: CORS }
		);
	}

	const [items, activeBookings] = await Promise.all([
		db.select().from(item).where(isNull(item.archivedAt)),
		db
			.select({
				tentId: bookingTent.tentId,
				quantity: bookingTent.quantity,
				startDate: booking.startDate,
				endDate: booking.endDate,
				status: booking.status
			})
			.from(bookingTent)
			.innerJoin(booking, eq(bookingTent.bookingId, booking.id))
			.where(
				and(
					lte(booking.startDate, dateEnd!),
					gte(booking.endDate, dateStart),
					ne(booking.status, 'cancelled'),
					ne(booking.status, 'done')
				)
			)
	]);

	// Sumuj zarezerwowane per item w zakresie
	const reservedByItem = new Map<string, number>();
	for (const b of activeBookings) {
		const prev = reservedByItem.get(b.tentId) ?? 0;
		reservedByItem.set(b.tentId, prev + b.quantity);
	}

	return json(
		{
			date_start: dateStart,
			date_end: dateEnd,
			items: items.map((it) => {
				const reserved = reservedByItem.get(it.id) ?? 0;
				const available = Math.max(0, it.totalQty - reserved);
				return {
					id: it.id,
					sku: it.sku,
					name: it.name,
					category: it.category,
					total_qty: it.totalQty,
					reserved,
					available,
					price_per_day_zl: it.pricePerDayCents ? it.pricePerDayCents / 100 : null
				};
			}),
			checked_at: new Date().toISOString()
		},
		{ headers: CORS }
	);
};
