import { test, expect } from '@playwright/test';

/**
 * Smoke: role-based access.
 * - Admin (Karol/Pepe) → dashboard, /zlecenia, /team, /settings, /magazyn
 * - Employee (Mateusz) → dashboard tylko; /team/ /settings/ /zlecenia → redirect
 *
 * User switching via cookie `wn-user-id` (v5.29 pre-Keycloak).
 */

// Seed users (src/lib/server/db/seed/*)
const ADMIN_ID = 'u-karol';
const EMPLOYEE_ID = 'u-mateusz';

async function setUser(context: import('@playwright/test').BrowserContext, userId: string) {
	await context.addCookies([
		{
			name: 'wn-user-id',
			value: userId,
			domain: 'localhost',
			path: '/',
			httpOnly: true,
			secure: false,
			sameSite: 'Lax'
		}
	]);
}

test.describe('Admin access (Karol)', () => {
	test.beforeEach(async ({ context }) => setUser(context, ADMIN_ID));

	test('/dashboard dostępny', async ({ page }) => {
		const res = await page.goto('/dashboard');
		expect(res?.status()).toBeLessThan(500);
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('/zlecenia dostępny', async ({ page }) => {
		await page.goto('/zlecenia');
		await expect(page).toHaveURL(/\/zlecenia/);
	});

	test('/team dostępny', async ({ page }) => {
		await page.goto('/team');
		await expect(page).toHaveURL(/\/team/);
	});

	test('/settings dostępny', async ({ page }) => {
		await page.goto('/settings');
		await expect(page).toHaveURL(/\/settings/);
	});

	test('sidebar: admin widzi wszystkie 4 sekcje + settings', async ({ page }) => {
		await page.goto('/dashboard');
		// NAV_ITEMS: dashboard + zlecenia + tents + team
		await expect(page.locator('a.rail-item[href="/dashboard"]')).toBeVisible();
		await expect(page.locator('a.rail-item[href="/zlecenia"]')).toBeVisible();
		await expect(page.locator('a.rail-item[href="/magazyn"]')).toBeVisible();
		await expect(page.locator('a.rail-item[href="/team"]')).toBeVisible();
		// ADMIN_NAV_ITEMS: settings
		await expect(page.locator('a.rail-item[href="/settings"]')).toBeVisible();
	});
});

test.describe('Employee access (Mateusz)', () => {
	test.beforeEach(async ({ context }) => setUser(context, EMPLOYEE_ID));

	test('/dashboard dostępny', async ({ page }) => {
		const res = await page.goto('/dashboard');
		expect(res?.status()).toBeLessThan(500);
	});

	test('/team redirect do /dashboard', async ({ page }) => {
		await page.goto('/team');
		// Team ma guard: role !== admin → redirect 303 /dashboard
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('sidebar: employee NIE widzi zlecenia/magazyn/team/settings', async ({ page }) => {
		await page.goto('/dashboard');
		// Dashboard zawsze widoczny
		await expect(page.locator('a.rail-item[href="/dashboard"]')).toBeVisible();
		// Admin-only ukryte
		await expect(page.locator('a.rail-item[href="/zlecenia"]')).toHaveCount(0);
		await expect(page.locator('a.rail-item[href="/magazyn"]')).toHaveCount(0);
		await expect(page.locator('a.rail-item[href="/team"]')).toHaveCount(0);
		await expect(page.locator('a.rail-item[href="/settings"]')).toHaveCount(0);
	});
});
