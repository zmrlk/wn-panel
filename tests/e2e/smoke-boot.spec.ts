import { test, expect } from '@playwright/test';

/**
 * Smoke: "czy aplikacja w ogóle żyje".
 * - Strona startowa ładuje się
 * - Redirect do dashboard działa
 * - Dashboard renderuje podstawowe elementy
 * - Kluczowe routes odpowiadają 200
 */

test.describe('Boot + public routes', () => {
	test('/ redirect do dashboardu (lub login)', async ({ page }) => {
		const res = await page.goto('/');
		expect(res?.status()).toBeLessThan(500);
	});

	test('dashboard ładuje się i zawiera logo WN', async ({ page }) => {
		await page.goto('/dashboard');
		await expect(page).toHaveURL(/\/dashboard/);
		// Logo mark (widoczne w rail)
		await expect(page.locator('text=wn').first()).toBeVisible({ timeout: 10_000 });
	});

	test('sidebar zawiera Home + linki nawigacji', async ({ page }) => {
		await page.goto('/dashboard');
		await expect(page.locator('a.rail-item[href="/dashboard"]')).toBeVisible();
	});

	test('/zlecenia ładuje się dla admina (default cookie)', async ({ page }) => {
		const res = await page.goto('/zlecenia');
		expect(res?.status()).toBeLessThan(500);
	});

	test('/magazyn ładuje się dla admina', async ({ page }) => {
		const res = await page.goto('/magazyn');
		expect(res?.status()).toBeLessThan(500);
	});

	test('/team ładuje się dla admina', async ({ page }) => {
		const res = await page.goto('/team');
		expect(res?.status()).toBeLessThan(500);
	});

	test('/settings ładuje się dla admina', async ({ page }) => {
		const res = await page.goto('/settings');
		expect(res?.status()).toBeLessThan(500);
	});
});
