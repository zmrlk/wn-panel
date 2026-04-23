/**
 * Availability — liczenie dostępności magazynu dla zakresu dat.
 *
 * Kluczowe: peak-per-day reserved (nie suma overlappingów), bo ten sam item
 * może wracać z jednego eventu i jechać na następny tego samego dnia.
 *
 * Pure — zero deps. DB-agnostic (caller podaje rezerwacje).
 */

export type Reservation = {
	bookingId: string;
	eventName: string;
	startDate: string;
	endDate: string;
	quantity: number;
};

export type ItemInput = {
	itemId: string;
	name: string;
	totalQty: number;
	requested: number;
	reservations: Reservation[];
};

export type Conflict = {
	bookingId: string;
	eventName: string;
	overlapFrom: string;
	overlapTo: string;
	quantity: number;
};

export type ItemAvailability = {
	itemId: string;
	name: string;
	totalQty: number;
	requested: number;
	peakReserved: number;
	available: number;
	ok: boolean;
	conflicts: Conflict[];
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(s: string): boolean {
	if (!ISO_DATE_RE.test(s)) return false;
	const d = new Date(s + 'T00:00:00Z');
	return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

export function addDays(iso: string, n: number): string {
	const [y, m, d] = iso.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d + n));
	const yy = date.getUTCFullYear();
	const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
	const dd = String(date.getUTCDate()).padStart(2, '0');
	return `${yy}-${mm}-${dd}`;
}

export function calcItemAvailability(from: string, to: string, item: ItemInput): ItemAvailability {
	const overlapping = item.reservations.filter(
		(r) => r.startDate <= to && r.endDate >= from
	);

	const events: Array<{ day: string; delta: number }> = [];
	for (const r of overlapping) {
		const s = r.startDate < from ? from : r.startDate;
		const e = r.endDate > to ? to : r.endDate;
		events.push({ day: s, delta: r.quantity });
		events.push({ day: addDays(e, 1), delta: -r.quantity });
	}
	events.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

	let running = 0;
	let peak = 0;
	for (const ev of events) {
		if (ev.day > to) break;
		running += ev.delta;
		if (running > peak) peak = running;
	}

	const available = item.totalQty - peak;

	const conflicts: Conflict[] = overlapping.map((r) => ({
		bookingId: r.bookingId,
		eventName: r.eventName,
		overlapFrom: r.startDate < from ? from : r.startDate,
		overlapTo: r.endDate > to ? to : r.endDate,
		quantity: r.quantity
	}));

	return {
		itemId: item.itemId,
		name: item.name,
		totalQty: item.totalQty,
		requested: item.requested,
		peakReserved: peak,
		available,
		ok: available >= item.requested,
		conflicts
	};
}

export type AvailabilityResult = {
	from: string;
	to: string;
	items: ItemAvailability[];
	hasConflicts: boolean;
};

export function calcAvailability(
	from: string,
	to: string,
	items: ItemInput[]
): AvailabilityResult {
	const results = items.map((i) => calcItemAvailability(from, to, i));
	return {
		from,
		to,
		items: results,
		hasConflicts: results.some((r) => !r.ok)
	};
}
