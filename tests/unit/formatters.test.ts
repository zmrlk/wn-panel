import { describe, it, expect } from 'vitest';
import { fmtZl, fmtDate, fmtDateTime, eventRange, daysCount } from '$lib/formatters';

describe('fmtZl', () => {
	it('null/undefined → "—"', () => {
		expect(fmtZl(null)).toBe('—');
		expect(fmtZl(undefined)).toBe('—');
	});

	it('0 → "0 zł"', () => {
		expect(fmtZl(0)).toBe('0 zł');
	});

	it('małe kwoty', () => {
		expect(fmtZl(100)).toBe('1 zł');
		expect(fmtZl(1234)).toMatch(/^12[,.]?34 zł$/);
	});

	it('duże kwoty (separator tysięcy)', () => {
		// Node bez ICU: "1800 zł", z ICU: "1 800 zł"
		expect(fmtZl(180000)).toMatch(/^1[\s\u00A0]?800 zł$/);
	});

	it('bardzo duże kwoty', () => {
		expect(fmtZl(12345678)).toMatch(/^123[\s\u00A0]?456[,.]\d+ zł$|^123[\s\u00A0]?456,78 zł$/);
	});

	it('grosze bez reszty → całość', () => {
		expect(fmtZl(500)).toBe('5 zł');
		expect(fmtZl(2500)).toBe('25 zł');
	});
});

describe('fmtDate', () => {
	it('null/undefined → "—"', () => {
		expect(fmtDate(null)).toBe('—');
		expect(fmtDate(undefined)).toBe('—');
	});

	it('ISO string → PL long format', () => {
		expect(fmtDate('2026-05-15')).toMatch(/\d{1,2}\s+\w+\s+2026/);
	});

	it('Date object → PL long format', () => {
		expect(fmtDate(new Date('2026-12-31'))).toMatch(/\d{1,2}\s+\w+\s+2026/);
	});

	it('pusty string → "—"', () => {
		expect(fmtDate('')).toBe('—');
	});
});

describe('fmtDateTime', () => {
	it('null → "—"', () => {
		expect(fmtDateTime(null)).toBe('—');
	});

	it('zawiera godzinę i minuty', () => {
		const result = fmtDateTime('2026-05-15T14:30:00Z');
		// Format: "15 maj 2026, 14:30" (lub z :XX w innej strefie)
		expect(result).toMatch(/\d{2}:\d{2}/);
		expect(result).toContain('2026');
	});
});

describe('eventRange', () => {
	it('brak start → "—"', () => {
		expect(eventRange(null, '2026-05-15')).toBe('—');
		expect(eventRange(undefined, '2026-05-15')).toBe('—');
	});

	it('brak end → sam start', () => {
		expect(eventRange('2026-05-15', null)).toMatch(/\d{1,2}\s+\w+\s+2026/);
		expect(eventRange('2026-05-15', undefined)).toMatch(/\d{1,2}\s+\w+\s+2026/);
	});

	it('start === end (same-day event) → sam start', () => {
		const result = eventRange('2026-05-15', '2026-05-15');
		expect(result).not.toContain('–');
		expect(result).toMatch(/\d{1,2}\s+\w+\s+2026/);
	});

	it('start !== end → "start – end"', () => {
		const result = eventRange('2026-05-15', '2026-05-18');
		expect(result).toContain('–');
		// Obie daty w wyniku
		expect(result.split('–')).toHaveLength(2);
	});
});

describe('daysCount', () => {
	it('brak start → 0', () => {
		expect(daysCount(null, '2026-05-15')).toBe(0);
		expect(daysCount(undefined, null)).toBe(0);
	});

	it('same day (start === end) → 1', () => {
		expect(daysCount('2026-05-15', '2026-05-15')).toBe(1);
	});

	it('brak end → sam start (1 day)', () => {
		expect(daysCount('2026-05-15', null)).toBe(1);
		expect(daysCount('2026-05-15', undefined)).toBe(1);
	});

	it('3 dni (inclusive)', () => {
		expect(daysCount('2026-05-15', '2026-05-17')).toBe(3);
	});

	it('tydzień', () => {
		expect(daysCount('2026-05-15', '2026-05-21')).toBe(7);
	});

	it('cały maj = 31 dni', () => {
		expect(daysCount('2026-05-01', '2026-05-31')).toBe(31);
	});

	it('min 1 dzień (end < start → safety fallback)', () => {
		expect(daysCount('2026-05-15', '2026-05-10')).toBe(1);
	});
});
