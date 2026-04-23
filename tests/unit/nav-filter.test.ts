import { describe, it, expect } from 'vitest';
import {
	filterNavForRole,
	NAV_ITEMS,
	ADMIN_NAV_ITEMS
} from '$lib/constants/icons';

describe('filterNavForRole', () => {
	it('admin widzi wszystkie NAV_ITEMS', () => {
		const result = filterNavForRole(NAV_ITEMS, true);
		expect(result).toEqual(NAV_ITEMS);
		expect(result.length).toBe(NAV_ITEMS.length);
	});

	it('employee widzi tylko non-adminOnly', () => {
		const result = filterNavForRole(NAV_ITEMS, false);
		// Tylko dashboard (bez adminOnly)
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('dashboard');
	});

	it('employee NIE widzi zlecenia/tents/team', () => {
		const result = filterNavForRole(NAV_ITEMS, false);
		const ids = result.map((i) => i.id);
		expect(ids).not.toContain('zlecenia');
		expect(ids).not.toContain('tents');
		expect(ids).not.toContain('team');
	});

	it('admin widzi zlecenia/tents/team', () => {
		const result = filterNavForRole(NAV_ITEMS, true);
		const ids = result.map((i) => i.id);
		expect(ids).toContain('zlecenia');
		expect(ids).toContain('tents');
		expect(ids).toContain('team');
	});

	it('dashboard ZAWSZE widoczny (obie role)', () => {
		const admin = filterNavForRole(NAV_ITEMS, true);
		const employee = filterNavForRole(NAV_ITEMS, false);
		expect(admin.map((i) => i.id)).toContain('dashboard');
		expect(employee.map((i) => i.id)).toContain('dashboard');
	});

	it('pusta lista → pusta lista (obie role)', () => {
		expect(filterNavForRole([], true)).toEqual([]);
		expect(filterNavForRole([], false)).toEqual([]);
	});

	it('generyczna — działa z dowolnym kształtem', () => {
		const items = [
			{ name: 'public', adminOnly: false },
			{ name: 'secret', adminOnly: true },
			{ name: 'no-flag' } // brak pola = widoczny dla wszystkich
		];
		expect(filterNavForRole(items, false)).toHaveLength(2);
		expect(filterNavForRole(items, true)).toHaveLength(3);
	});

	it('brak pola adminOnly = widoczny dla wszystkich', () => {
		const items: { id: string; adminOnly?: boolean }[] = [{ id: 'a' }, { id: 'b' }];
		expect(filterNavForRole(items, false)).toEqual(items);
		expect(filterNavForRole(items, true)).toEqual(items);
	});

	it('ADMIN_NAV_ITEMS (settings) — sanity check struktury', () => {
		expect(ADMIN_NAV_ITEMS).toHaveLength(1);
		expect(ADMIN_NAV_ITEMS[0].id).toBe('settings');
		expect(ADMIN_NAV_ITEMS[0].href).toBe('/settings');
	});
});

describe('NAV_ITEMS struktura', () => {
	it('każdy item ma id, label, href', () => {
		for (const item of NAV_ITEMS) {
			expect(item.id).toBeTruthy();
			expect(item.label).toBeTruthy();
			expect(item.href).toBeTruthy();
		}
	});

	it('href zaczyna się od /', () => {
		for (const item of NAV_ITEMS) {
			expect(item.href.startsWith('/')).toBe(true);
		}
	});

	it('id są unikalne', () => {
		const ids = NAV_ITEMS.map((i) => i.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('href są unikalne', () => {
		const hrefs = NAV_ITEMS.map((i) => i.href);
		expect(new Set(hrefs).size).toBe(hrefs.length);
	});

	it('dashboard NIE jest adminOnly (employee musi mieć dostęp)', () => {
		const dashboard = NAV_ITEMS.find((i) => i.id === 'dashboard');
		expect(dashboard).toBeDefined();
		expect(dashboard?.adminOnly).toBeFalsy();
	});
});
