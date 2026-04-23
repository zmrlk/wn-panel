import { describe, it, expect } from 'vitest';
import {
	calcItemAvailability,
	calcAvailability,
	addDays,
	isValidIsoDate,
	type ItemInput,
	type Reservation
} from '$lib/availability';

const TENT_ID = '550e8400-e29b-41d4-a716-446655440000';

function res(overrides: Partial<Reservation> = {}): Reservation {
	return {
		bookingId: 'b1',
		eventName: 'Wesele',
		startDate: '2026-05-10',
		endDate: '2026-05-11',
		quantity: 1,
		...overrides
	};
}

function item(overrides: Partial<ItemInput> = {}): ItemInput {
	return {
		itemId: TENT_ID,
		name: 'Namiot 6×12',
		totalQty: 3,
		requested: 1,
		reservations: [],
		...overrides
	};
}

describe('addDays', () => {
	it('dodaje dni poprawnie (ISO)', () => {
		expect(addDays('2026-05-10', 1)).toBe('2026-05-11');
		expect(addDays('2026-05-10', 0)).toBe('2026-05-10');
		expect(addDays('2026-04-30', 1)).toBe('2026-05-01');
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
	});
});

describe('isValidIsoDate', () => {
	it('waliduje format YYYY-MM-DD', () => {
		expect(isValidIsoDate('2026-05-10')).toBe(true);
		expect(isValidIsoDate('2026-02-29')).toBe(false);
		expect(isValidIsoDate('2026-13-01')).toBe(false);
		expect(isValidIsoDate('2026-5-10')).toBe(false);
		expect(isValidIsoDate('garbage')).toBe(false);
		expect(isValidIsoDate('')).toBe(false);
	});
});

describe('calcItemAvailability — empty', () => {
	it('brak rezerwacji → pełna dostępność', () => {
		const r = calcItemAvailability('2026-05-10', '2026-05-11', item({ totalQty: 5 }));
		expect(r.peakReserved).toBe(0);
		expect(r.available).toBe(5);
		expect(r.ok).toBe(true);
		expect(r.conflicts).toEqual([]);
	});
});

describe('calcItemAvailability — overlaps', () => {
	it('pojedyncza rezerwacja obejmująca cały zakres', () => {
		const r = calcItemAvailability(
			'2026-05-10',
			'2026-05-12',
			item({ totalQty: 3, requested: 2, reservations: [res({ quantity: 1 })] })
		);
		expect(r.peakReserved).toBe(1);
		expect(r.available).toBe(2);
		expect(r.ok).toBe(true);
		expect(r.conflicts).toHaveLength(1);
	});

	it('requested > available → ok=false', () => {
		const r = calcItemAvailability(
			'2026-05-10',
			'2026-05-12',
			item({ totalQty: 3, requested: 3, reservations: [res({ quantity: 1 })] })
		);
		expect(r.peakReserved).toBe(1);
		expect(r.available).toBe(2);
		expect(r.ok).toBe(false);
	});

	it('dwie nakładające się rezerwacje tego samego dnia → peak = suma', () => {
		const r = calcItemAvailability(
			'2026-05-10',
			'2026-05-12',
			item({
				totalQty: 5,
				requested: 1,
				reservations: [
					res({ bookingId: 'b1', quantity: 2, startDate: '2026-05-10', endDate: '2026-05-11' }),
					res({ bookingId: 'b2', quantity: 2, startDate: '2026-05-11', endDate: '2026-05-12' })
				]
			})
		);
		// 05-10: 2 (b1)
		// 05-11: 4 (b1+b2) ← peak
		// 05-12: 2 (b2)
		expect(r.peakReserved).toBe(4);
		expect(r.available).toBe(1);
	});

	it('dwie nie-nakładające się rezerwacje → peak = max(każdej), nie suma', () => {
		const r = calcItemAvailability(
			'2026-05-10',
			'2026-05-20',
			item({
				totalQty: 3,
				requested: 1,
				reservations: [
					res({ bookingId: 'b1', quantity: 2, startDate: '2026-05-10', endDate: '2026-05-12' }),
					res({ bookingId: 'b2', quantity: 3, startDate: '2026-05-15', endDate: '2026-05-17' })
				]
			})
		);
		expect(r.peakReserved).toBe(3);
		expect(r.available).toBe(0);
		expect(r.ok).toBe(false);
		expect(r.conflicts).toHaveLength(2);
	});

	it('rezerwacja kończąca się dzień przed from → pominięta', () => {
		const r = calcItemAvailability(
			'2026-05-10',
			'2026-05-12',
			item({
				totalQty: 3,
				requested: 1,
				reservations: [
					res({ startDate: '2026-05-07', endDate: '2026-05-09', quantity: 2 })
				]
			})
		);
		expect(r.peakReserved).toBe(0);
		expect(r.conflicts).toEqual([]);
	});

	it('rezerwacja zaczynająca się dzień po to → pominięta', () => {
		const r = calcItemAvailability(
			'2026-05-10',
			'2026-05-12',
			item({
				totalQty: 3,
				requested: 1,
				reservations: [
					res({ startDate: '2026-05-13', endDate: '2026-05-15', quantity: 2 })
				]
			})
		);
		expect(r.peakReserved).toBe(0);
		expect(r.conflicts).toEqual([]);
	});

	it('rezerwacja kończąca się w dniu from → uwzględniona (edge)', () => {
		const r = calcItemAvailability(
			'2026-05-10',
			'2026-05-12',
			item({
				totalQty: 3,
				requested: 1,
				reservations: [
					res({ startDate: '2026-05-07', endDate: '2026-05-10', quantity: 2 })
				]
			})
		);
		expect(r.peakReserved).toBe(2);
		expect(r.conflicts).toHaveLength(1);
	});

	it('rezerwacja wychodząca poza zakres → przycina overlap do zakresu', () => {
		const r = calcItemAvailability(
			'2026-05-10',
			'2026-05-12',
			item({
				totalQty: 3,
				requested: 1,
				reservations: [
					res({ startDate: '2026-05-05', endDate: '2026-05-15', quantity: 2 })
				]
			})
		);
		expect(r.peakReserved).toBe(2);
		expect(r.conflicts[0].overlapFrom).toBe('2026-05-10');
		expect(r.conflicts[0].overlapTo).toBe('2026-05-12');
	});
});

describe('calcAvailability — batch', () => {
	it('hasConflicts=true gdy choć jeden item nie ok', () => {
		const r = calcAvailability('2026-05-10', '2026-05-12', [
			item({ itemId: 'a', totalQty: 5, requested: 1 }),
			item({
				itemId: 'b',
				totalQty: 2,
				requested: 3,
				reservations: [res({ quantity: 1 })]
			})
		]);
		expect(r.items).toHaveLength(2);
		expect(r.items[0].ok).toBe(true);
		expect(r.items[1].ok).toBe(false);
		expect(r.hasConflicts).toBe(true);
	});

	it('hasConflicts=false gdy wszystkie ok', () => {
		const r = calcAvailability('2026-05-10', '2026-05-12', [
			item({ itemId: 'a', totalQty: 5, requested: 1 }),
			item({ itemId: 'b', totalQty: 10, requested: 5 })
		]);
		expect(r.hasConflicts).toBe(false);
	});
});
