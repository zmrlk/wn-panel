import { describe, it, expect } from 'vitest';
import {
	getStage,
	dbStatusToUnified,
	unifiedToDbStatus,
	allowedStatusesForType,
	ALL_UNIFIED_STATUSES,
	STAGES
} from '$lib/booking-stages';

describe('getStage', () => {
	it('zwraca fine-grained stage dla znanego typu:status', () => {
		expect(getStage('lead', 'new')).toEqual({ label: 'Nowy', emoji: '🆕' });
		expect(getStage('booking', 'done')).toEqual({ label: 'Wygrany', emoji: '🎉' });
		expect(getStage('offer', 'accepted')).toEqual({ label: 'Wygrany', emoji: '✅' });
	});

	it('fallback na default per-typ gdy status nieznany', () => {
		expect(getStage('lead', 'mystery-status')).toEqual(STAGES['lead:new']);
		expect(getStage('offer', 'mystery-status')).toEqual(STAGES['offer:draft']);
		expect(getStage('booking', 'mystery-status')).toEqual(STAGES['booking:confirmed']);
	});

	it('każdy stage ma label + emoji (no empty)', () => {
		for (const [key, stage] of Object.entries(STAGES)) {
			expect(stage.label, key).toBeTruthy();
			expect(stage.emoji, key).toBeTruthy();
		}
	});
});

describe('dbStatusToUnified', () => {
	it('lead: new → nowy', () => {
		expect(dbStatusToUnified('lead', 'new')).toBe('nowy');
	});

	it('lead: contacted/qualified/quoted → w-trakcie', () => {
		expect(dbStatusToUnified('lead', 'contacted')).toBe('w-trakcie');
		expect(dbStatusToUnified('lead', 'qualified')).toBe('w-trakcie');
		expect(dbStatusToUnified('lead', 'quoted')).toBe('w-trakcie');
	});

	it('offer: draft/sent/viewed → w-trakcie', () => {
		expect(dbStatusToUnified('offer', 'draft')).toBe('w-trakcie');
		expect(dbStatusToUnified('offer', 'sent')).toBe('w-trakcie');
		expect(dbStatusToUnified('offer', 'viewed')).toBe('w-trakcie');
	});

	it('offer: accepted → wygrany', () => {
		expect(dbStatusToUnified('offer', 'accepted')).toBe('wygrany');
	});

	it('booking: confirmed/in-progress → wygrany', () => {
		expect(dbStatusToUnified('booking', 'confirmed')).toBe('wygrany');
		expect(dbStatusToUnified('booking', 'in-progress')).toBe('wygrany');
	});

	it('booking: done → zrealizowany', () => {
		expect(dbStatusToUnified('booking', 'done')).toBe('zrealizowany');
	});

	it('unknown status fallback → sam status', () => {
		expect(dbStatusToUnified('lead', 'mystery')).toBe('mystery');
	});
});

describe('unifiedToDbStatus', () => {
	it('lead: nowy → new', () => {
		expect(unifiedToDbStatus('lead', 'nowy')).toBe('new');
	});

	it('lead: w-trakcie → contacted (pierwszy sensowny stan)', () => {
		expect(unifiedToDbStatus('lead', 'w-trakcie')).toBe('contacted');
	});

	it('offer: wygrany → accepted (trigger auto-konwersji)', () => {
		expect(unifiedToDbStatus('offer', 'wygrany')).toBe('accepted');
	});

	it('booking: zrealizowany → done', () => {
		expect(unifiedToDbStatus('booking', 'zrealizowany')).toBe('done');
	});

	it('booking: przegrany → cancelled', () => {
		expect(unifiedToDbStatus('booking', 'przegrany')).toBe('cancelled');
	});

	it('fallback: surowy DB-status pozostaje niezmieniony', () => {
		// Ktoś prześle "new" zamiast "nowy" — nie mapujemy, zostawiamy
		expect(unifiedToDbStatus('lead', 'new')).toBe('new');
	});
});

describe('allowedStatusesForType', () => {
	it('lead: 4 chipy (nowy/w-trakcie/przegrany/archiwum) — bez wygrany/zrealizowany', () => {
		const result = allowedStatusesForType('lead');
		const ids = result.map((s) => s.id);
		expect(ids).toEqual(['nowy', 'w-trakcie', 'przegrany', 'archiwum']);
		expect(ids).not.toContain('wygrany');
		expect(ids).not.toContain('zrealizowany');
	});

	it('offer: 3 chipy (w-trakcie/wygrany/przegrany)', () => {
		const result = allowedStatusesForType('offer');
		const ids = result.map((s) => s.id);
		expect(ids).toEqual(['w-trakcie', 'wygrany', 'przegrany']);
	});

	it('booking: 3 chipy (wygrany/zrealizowany/przegrany)', () => {
		const result = allowedStatusesForType('booking');
		const ids = result.map((s) => s.id);
		expect(ids).toEqual(['wygrany', 'zrealizowany', 'przegrany']);
	});

	it('każdy zwrócony chip ma label + emoji', () => {
		for (const type of ['lead', 'offer', 'booking'] as const) {
			for (const chip of allowedStatusesForType(type)) {
				expect(chip.label).toBeTruthy();
				expect(chip.emoji).toBeTruthy();
			}
		}
	});

	it('kolejność chipów zachowana z ALL_UNIFIED_STATUSES', () => {
		// Sprawdzamy że filter zachowuje kolejność (nie sortuje)
		const leadIds = allowedStatusesForType('lead').map((s) => s.id);
		const canonicalIndexes = leadIds.map((id) =>
			ALL_UNIFIED_STATUSES.findIndex((s) => s.id === id)
		);
		// Indexes powinny być rosnące
		for (let i = 1; i < canonicalIndexes.length; i++) {
			expect(canonicalIndexes[i]).toBeGreaterThan(canonicalIndexes[i - 1]);
		}
	});
});

describe('round-trip (unified → db → unified)', () => {
	it('lead: nowy → new → nowy', () => {
		const db = unifiedToDbStatus('lead', 'nowy');
		expect(dbStatusToUnified('lead', db)).toBe('nowy');
	});

	it('booking: zrealizowany → done → zrealizowany', () => {
		const db = unifiedToDbStatus('booking', 'zrealizowany');
		expect(dbStatusToUnified('booking', db)).toBe('zrealizowany');
	});

	it('offer: wygrany → accepted → wygrany', () => {
		const db = unifiedToDbStatus('offer', 'wygrany');
		expect(dbStatusToUnified('offer', db)).toBe('wygrany');
	});
});
