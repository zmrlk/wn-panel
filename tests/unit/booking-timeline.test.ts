import { describe, it, expect } from 'vitest';
import { buildBookingTimeline, type TimelineInput } from '$lib/booking-timeline';

const BASE: TimelineInput = {
	bookingCreatedAt: new Date('2026-05-01T10:00:00Z'),
	bookingEndDate: '2026-06-05',
	bookingStatus: 'confirmed',
	assignments: [],
	movements: [],
	payments: [],
	photos: []
};

describe('buildBookingTimeline — edge cases', () => {
	it('minimal (tylko created) → 1 event', () => {
		const result = buildBookingTimeline(BASE);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			label: 'Rezerwacja utworzona',
			emoji: '➕',
			kind: 'created'
		});
	});

	it('done dodaje "Event zakończony"', () => {
		const result = buildBookingTimeline({ ...BASE, bookingStatus: 'done' });
		expect(result.map((e) => e.kind)).toContain('done');
		const done = result.find((e) => e.kind === 'done')!;
		expect(done.date).toEqual(new Date('2026-06-05'));
	});

	it('bookingEndDate null → done bez daty', () => {
		const result = buildBookingTimeline({
			...BASE,
			bookingStatus: 'done',
			bookingEndDate: null
		});
		const done = result.find((e) => e.kind === 'done')!;
		expect(done.date).toBeNull();
	});
});

describe('buildBookingTimeline — assignments', () => {
	it('mapuje task labels (driver/installer/lead)', () => {
		const result = buildBookingTimeline({
			...BASE,
			assignments: [
				{ userName: 'Anna', task: 'driver', notes: null },
				{ userName: 'Bartek', task: 'installer', notes: 'ma dźwig' },
				{ userName: 'Cyril', task: 'lead', notes: null }
			]
		});
		const labels = result
			.filter((e) => e.kind === 'assignment')
			.map((e) => e.label);
		expect(labels).toEqual([
			'Przypisano: Anna (kierowca)',
			'Przypisano: Bartek (montaż)',
			'Przypisano: Cyril (lider)'
		]);
	});

	it('nieznany task → raw string', () => {
		const result = buildBookingTimeline({
			...BASE,
			assignments: [{ userName: 'Test', task: 'other', notes: null }]
		});
		const a = result.find((e) => e.kind === 'assignment')!;
		expect(a.label).toBe('Przypisano: Test (other)');
	});

	it('userName null → "—"', () => {
		const result = buildBookingTimeline({
			...BASE,
			assignments: [{ userName: null, task: 'driver', notes: null }]
		});
		const a = result.find((e) => e.kind === 'assignment')!;
		expect(a.label).toBe('Przypisano: — (kierowca)');
	});

	it('assignments bez daty lądują na końcu', () => {
		const result = buildBookingTimeline({
			...BASE,
			assignments: [{ userName: 'X', task: 'driver', notes: null }]
		});
		// created ma datę, assignment nie → assignment na końcu
		expect(result[result.length - 1].kind).toBe('assignment');
	});
});

describe('buildBookingTimeline — dispatch', () => {
	it('agreguje OUT wydanie_na_event w 1 event', () => {
		const result = buildBookingTimeline({
			...BASE,
			movements: [
				{
					kind: 'wydanie_na_event',
					qty: 5,
					itemName: 'Stół',
					createdAt: new Date('2026-06-01T08:00:00Z')
				},
				{
					kind: 'wydanie_na_event',
					qty: 20,
					itemName: 'Krzesło',
					createdAt: new Date('2026-06-01T08:05:00Z')
				}
			]
		});
		const dispatches = result.filter((e) => e.kind === 'dispatch');
		expect(dispatches).toHaveLength(1);
		expect(dispatches[0].label).toBe('Wydano na event (25 szt.)');
		expect(dispatches[0].note).toBe('5× Stół, 20× Krzesło');
	});

	it('brak wydań → brak event dispatch', () => {
		const result = buildBookingTimeline(BASE);
		expect(result.filter((e) => e.kind === 'dispatch')).toHaveLength(0);
	});
});

describe('buildBookingTimeline — payments', () => {
	it('formatuje kwotę PL locale + method', () => {
		const result = buildBookingTimeline({
			...BASE,
			payments: [
				{
					amountCents: 180000,
					method: 'przelew',
					paidAt: '2026-05-15',
					notes: 'Zadatek'
				}
			]
		});
		const p = result.find((e) => e.kind === 'payment')!;
		// Locale formatter działa różnie między node (pełne ICU) a testami — accept both
		expect(p.label).toMatch(/Płatność 1[\s\u00A0]?800 zł \(przelew\)/);
		expect(p.note).toBe('Zadatek');
		expect(p.date).toEqual(new Date('2026-05-15'));
	});

	it('payment paidAt null → date null', () => {
		const result = buildBookingTimeline({
			...BASE,
			payments: [
				{ amountCents: 100, method: 'gotówka', paidAt: null, notes: null }
			]
		});
		const p = result.find((e) => e.kind === 'payment')!;
		expect(p.date).toBeNull();
	});
});

describe('buildBookingTimeline — photos', () => {
	it('mapuje photo kind labels', () => {
		const result = buildBookingTimeline({
			...BASE,
			photos: [
				{ kind: 'delivery', caption: null, uploadedAt: new Date('2026-06-01') },
				{ kind: 'return', caption: 'wszystko OK', uploadedAt: new Date('2026-06-03') },
				{ kind: 'damage', caption: null, uploadedAt: new Date('2026-06-03') },
				{ kind: 'general', caption: null, uploadedAt: new Date('2026-06-04') }
			]
		});
		const labels = result
			.filter((e) => e.kind === 'photo')
			.map((e) => e.label);
		expect(labels).toEqual([
			'Zdjęcie: dostawa',
			'Zdjęcie: odbiór',
			'Zdjęcie: uszkodzenie',
			'Zdjęcie: inne'
		]);
	});

	it('nieznany kind → "inne"', () => {
		const result = buildBookingTimeline({
			...BASE,
			photos: [{ kind: 'ufo', caption: null, uploadedAt: new Date() }]
		});
		const p = result.find((e) => e.kind === 'photo')!;
		expect(p.label).toBe('Zdjęcie: inne');
	});
});

describe('buildBookingTimeline — return + straty', () => {
	it('return aggreguje qty + list items', () => {
		const result = buildBookingTimeline({
			...BASE,
			movements: [
				{
					kind: 'zwrot_po_evencie',
					qty: 5,
					itemName: 'Stół',
					createdAt: new Date('2026-06-05T20:00:00Z')
				},
				{
					kind: 'zwrot_po_evencie',
					qty: 18,
					itemName: 'Krzesło',
					createdAt: new Date('2026-06-05T20:05:00Z')
				}
			]
		});
		const r = result.find((e) => e.kind === 'return')!;
		expect(r.label).toBe('Zwrot z eventu (23 szt.)');
		expect(r.note).toBe('5× Stół, 18× Krzesło');
	});

	it('strata jako osobny event (tylko gdy są)', () => {
		const result = buildBookingTimeline({
			...BASE,
			movements: [
				{
					kind: 'strata',
					qty: 2,
					itemName: 'Krzesło',
					createdAt: new Date('2026-06-05T20:10:00Z')
				}
			]
		});
		const s = result.find((e) => e.kind === 'loss')!;
		expect(s).toBeDefined();
		expect(s.label).toBe('Straty (2 szt.)');
	});

	it('return + strata oba się pojawiają', () => {
		const result = buildBookingTimeline({
			...BASE,
			movements: [
				{ kind: 'zwrot_po_evencie', qty: 18, itemName: 'Krzesło', createdAt: new Date() },
				{ kind: 'strata', qty: 2, itemName: 'Krzesło', createdAt: new Date() }
			]
		});
		expect(result.filter((e) => e.kind === 'return')).toHaveLength(1);
		expect(result.filter((e) => e.kind === 'loss')).toHaveLength(1);
	});
});

describe('buildBookingTimeline — sorting', () => {
	it('eventy sortowane chronologicznie asc', () => {
		const result = buildBookingTimeline({
			...BASE,
			bookingCreatedAt: new Date('2026-05-01'),
			bookingStatus: 'done',
			bookingEndDate: '2026-06-05',
			payments: [
				{ amountCents: 100, method: 'gotówka', paidAt: '2026-05-10', notes: null }
			],
			movements: [
				{
					kind: 'wydanie_na_event',
					qty: 1,
					itemName: 'X',
					createdAt: new Date('2026-06-01')
				}
			]
		});
		const dates = result.map((e) => e.date?.getTime() ?? Infinity);
		for (let i = 1; i < dates.length; i++) {
			expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
		}
	});

	it('null daty (assignments) lądują na końcu', () => {
		const result = buildBookingTimeline({
			...BASE,
			assignments: [{ userName: 'X', task: 'driver', notes: null }],
			movements: [
				{
					kind: 'wydanie_na_event',
					qty: 1,
					itemName: 'Y',
					createdAt: new Date('2026-06-10')
				}
			]
		});
		expect(result[result.length - 1].kind).toBe('assignment');
	});
});

describe('buildBookingTimeline — realistyczny full flow', () => {
	it('wedding 50-osobowe, pełny cykl (created → assign → dispatch → payment → photo → return → done)', () => {
		const result = buildBookingTimeline({
			bookingCreatedAt: new Date('2026-05-01T10:00:00Z'),
			bookingEndDate: '2026-06-05',
			bookingStatus: 'done',
			assignments: [
				{ userName: 'Karol', task: 'lead', notes: null },
				{ userName: 'Ania', task: 'driver', notes: null }
			],
			movements: [
				{
					kind: 'wydanie_na_event',
					qty: 1,
					itemName: 'Duży namiot',
					createdAt: new Date('2026-06-04T08:00:00Z')
				},
				{
					kind: 'wydanie_na_event',
					qty: 50,
					itemName: 'Krzesło',
					createdAt: new Date('2026-06-04T08:05:00Z')
				},
				{
					kind: 'zwrot_po_evencie',
					qty: 1,
					itemName: 'Duży namiot',
					createdAt: new Date('2026-06-05T22:00:00Z')
				},
				{
					kind: 'zwrot_po_evencie',
					qty: 48,
					itemName: 'Krzesło',
					createdAt: new Date('2026-06-05T22:05:00Z')
				},
				{
					kind: 'strata',
					qty: 2,
					itemName: 'Krzesło',
					createdAt: new Date('2026-06-05T22:10:00Z')
				}
			],
			payments: [
				{
					amountCents: 300000,
					method: 'przelew',
					paidAt: '2026-05-10',
					notes: 'Zadatek 30%'
				},
				{
					amountCents: 700000,
					method: 'przelew',
					paidAt: '2026-06-05',
					notes: 'Reszta'
				}
			],
			photos: [
				{ kind: 'delivery', caption: null, uploadedAt: new Date('2026-06-04T10:00:00Z') },
				{ kind: 'return', caption: null, uploadedAt: new Date('2026-06-05T23:00:00Z') }
			]
		});
		const kinds = result.map((e) => e.kind);
		expect(kinds).toContain('created');
		expect(kinds).toContain('assignment');
		expect(kinds).toContain('dispatch');
		expect(kinds.filter((k) => k === 'payment')).toHaveLength(2);
		expect(kinds.filter((k) => k === 'photo')).toHaveLength(2);
		expect(kinds).toContain('return');
		expect(kinds).toContain('loss');
		expect(kinds).toContain('done');
	});
});
