/**
 * Server-side availability check — używa DB + pure calcAvailability.
 *
 * Używane z:
 * - POST /api/availability (endpoint dla UI w /offers/new)
 * - update-status.ts (hard block offer → booking przy "Wygranym")
 */

import { db } from '$lib/server/db';
import { item, booking, bookingTent } from '$lib/server/db/schema';
import { and, eq, gte, lte, inArray, ne } from 'drizzle-orm';
import {
	calcAvailability,
	type AvailabilityResult,
	type ItemInput,
	type Reservation
} from '$lib/availability';

export const BLOCKING_STATUSES = ['draft', 'confirmed', 'in-progress'];

export type ItemSpec = { itemId: string; requested: number };

export async function checkAvailability(
	from: string,
	to: string,
	items: ItemSpec[],
	excludeBookingId: string | null = null
): Promise<AvailabilityResult> {
	const itemIds = items.map((i) => i.itemId);
	if (itemIds.length === 0) {
		return { from, to, items: [], hasConflicts: false };
	}

	const itemRows = await db
		.select({ id: item.id, name: item.name, totalQty: item.totalQty })
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

	return calcAvailability(from, to, inputs);
}
