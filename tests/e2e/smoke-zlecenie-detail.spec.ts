import { test, expect, type Page } from '@playwright/test';

/**
 * Smoke test dla zlecenia detail page.
 * Pokrywa extract TimelineSection + cały booking detail flow (v5.39).
 *
 * Strategia: ustawiamy admin cookie + próbujemy kilka strategii:
 * 1. Goto do /zlecenia list → parse DOM dla zwraca compound id
 * 2. Fallback do "new" booking (dowolny UUID — jeżeli da 404 to known bug)
 */

async function setAdminCookie(page: Page) {
	await page.context().addCookies([
		{
			name: 'wn-user-id',
			value: 'u-karol',
			domain: 'localhost',
			path: '/',
			httpOnly: true,
			secure: false,
			sameSite: 'Lax'
		}
	]);
}

/**
 * Pobiera compound id (np. "booking-abc-def...") z widoku /zlecenia,
 * parsując DOM przez page.evaluate (pomija JS navigation timing).
 */
async function firstCompoundId(page: Page, tab = 'booking'): Promise<string | null> {
	await page.goto(`/zlecenia?tab=${tab}`);
	const row = page.locator(`tr.row.type-${tab}`).first();
	if ((await row.count()) === 0) {
		// Fallback: dowolny row
		const anyRow = page.locator('tr.row.clickable').first();
		if ((await anyRow.count()) === 0) return null;
		return anyRow.getAttribute('data-compound-id');
	}
	return row.getAttribute('data-compound-id');
}

test.describe('Zlecenie detail page', () => {
	test('booking detail ładuje się (dowolny booking z DB)', async ({ page }) => {
		await setAdminCookie(page);
		const compound = await firstCompoundId(page, 'booking');
		if (!compound) {
			test.skip(true, 'Brak bookings w DB');
			return;
		}
		const res = await page.goto(`/zlecenia/${compound}`);
		expect(res?.status()).toBeLessThan(500);
	});

	test('detail page ma kluczowe sekcje (back, h1, klient, event, status)', async ({ page }) => {
		await setAdminCookie(page);
		const compound = await firstCompoundId(page);
		if (!compound) {
			test.skip(true, 'Brak rows');
			return;
		}
		await page.goto(`/zlecenia/${compound}`);
		await expect(page.locator('a.back-link')).toBeVisible();
		await expect(page.locator('header.topbar h1').first()).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Klient', exact: true })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Event', exact: true })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Status', exact: true })).toBeVisible();
	});

	test('booking detail: Przebieg + timeline li (TimelineSection extract)', async ({ page }) => {
		await setAdminCookie(page);
		const compound = await firstCompoundId(page, 'booking');
		if (!compound) {
			test.skip(true, 'Brak bookings');
			return;
		}
		await page.goto(`/zlecenia/${compound}`);
		await expect(page.getByRole('heading', { name: 'Przebieg', exact: true })).toBeVisible();
		await expect(page.locator('ul.timeline li').first()).toBeVisible();
	});

	test('invalid UUID → 404, nie 500 (regression pg 22P02)', async ({ page }) => {
		await setAdminCookie(page);
		const res = await page.goto('/zlecenia/booking-not-a-real-uuid');
		expect(res?.status()).toBe(404);
	});

	test('nieznany typ → 400', async ({ page }) => {
		await setAdminCookie(page);
		const res = await page.goto('/zlecenia/alien-00000000-0000-0000-0000-000000000000');
		expect(res?.status()).toBe(400);
	});

	test('poprawny UUID, ale nieistniejący → 404', async ({ page }) => {
		await setAdminCookie(page);
		const res = await page.goto('/zlecenia/booking-00000000-0000-0000-0000-000000000000');
		expect(res?.status()).toBe(404);
	});
});
