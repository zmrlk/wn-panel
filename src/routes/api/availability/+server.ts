import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { item, booking, bookingTent } from '$lib/server/db/schema';
import { and, eq, gte, lte, inArray, ne } from 'drizzle-orm';
import {
	calcAvailability,
	isValidIsoDate,
	type ItemInput,
	type Reservation
} from '$lib/availability';

/**
 * POST /api/availability
 * Body: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', items: [{ itemId, requested }] }
 * Response: AvailabilityResult (patrz $lib/availability)
 *
 * Statusy bookingu liczone jako zajmujące:  draft, confirmed, in-progress.
 * Pomijamy:  done (oddane), cancelled.
 */
const BLOCKING_STATUSES = ['draft', 'confirmed', 'in-progress'];

type RequestBody = {
	from: unknown;
	to: unknown;
	items: unknown;
	excludeBookingId?: unknown;
};

type ItemSpec = { itemId: string; requested: number };

function parseBody(raw: RequestBody): {
	from: string;
	to: string;
	items: ItemSpec[];
	excludeBookingId: string | null;
} {
	const { from, to, items, excludeBookingId } = raw;
	if (typeof from !== 'string' || !isValidIsoDate(from)) {
		throw error(400, 'from: wymagany format YYYY-MM-DD');
	}
	if (typeof to !== 'string' || !isValidIsoDate(to)) {
		throw error(400, 'to: wymagany format YYYY-MM-DD');
	}
	if (from > to) {
		throw error(400, 'from nie może być większe niż to');
	}
	if (!Array.isArray(items) || items.length === 0) {
		throw error(400, 'items: niepusta tablica wymagana');
	}
	const parsed: ItemSpec[] = items.map((i, idx) => {
		if (!i || typeof i !== 'object') {
			throw error(400, `items[${idx}]: obiekt wymagany`);
		}
		const o = i as Record<string, unknown>;
		if (typeof o.itemId !== 'string' || o.itemId.length < 8) {
			throw error(400, `items[${idx}].itemId: string wymagany`);
		}
		const req = Number(o.requested);
		if (!Number.isFinite(req) || req < 0) {
			throw error(400, `items[${idx}].requested: nieujemna liczba wymagana`);
		}
		return { itemId: o.itemId, requested: Math.floor(req) };
	});
	const exclude =
		typeof excludeBookingId === 'string' && excludeBookingId.length > 0
			? excludeBookingId
			: null;
	return { from, to, items: parsed, excludeBookingId: exclude };
}

export const POST: RequestHandler = async ({ request }) => {
	const raw = (await request.json().catch(() => null)) as RequestBody | null;
	if (!raw) throw error(400, 'Nieprawidłowy JSON');
	const { from, to, items, excludeBookingId } = parseBody(raw);

	const itemIds = items.map((i) => i.itemId);

	const itemRows = await db
		.select({
			id: item.id,
			name: item.name,
			totalQty: item.totalQty
		})
		.from(item)
		.where(inArray(item.id, itemIds));

	const itemById = new Map(itemRows.map((r) => [r.id, r]));

	const conditions = [
		inArray(bookingTent.tentId, itemIds),
		inArray(booking.status, BLOCKING_STATUSES),
		lte(booking.startDate, to),
		gte(booking.endDate, from)
	];
	if (excludeBookingId) {
		conditions.push(ne(booking.id, excludeBookingId));
	}

	const reservationRows = await db
		.select({
			bookingId: booking.id,
			eventName: booking.eventName,
			startDate: booking.startDate,
			endDate: booking.endDate,
			tentId: bookingTent.tentId,
			quantity: bookingTent.quantity
		})
		.from(bookingTent)
		.innerJoin(booking, eq(booking.id, bookingTent.bookingId))
		.where(and(...conditions));

	const resByItem = new Map<string, Reservation[]>();
	for (const r of reservationRows) {
		const arr = resByItem.get(r.tentId) ?? [];
		arr.push({
			bookingId: r.bookingId,
			eventName: r.eventName,
			startDate: r.startDate,
			endDate: r.endDate,
			quantity: r.quantity
		});
		resByItem.set(r.tentId, arr);
	}

	const inputs: ItemInput[] = items.map((spec) => {
		const it = itemById.get(spec.itemId);
		return {
			itemId: spec.itemId,
			name: it?.name ?? 'Nieznana pozycja',
			totalQty: it?.totalQty ?? 0,
			requested: spec.requested,
			reservations: resByItem.get(spec.itemId) ?? []
		};
	});

	const result = calcAvailability(from, to, inputs);
	return json(result);
};
