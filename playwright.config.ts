import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — e2e smoke tests dla wn-panel.
 *
 * webServer: uruchamia `npm run dev` automatycznie przed testami.
 * Port 5173 = SvelteKit/Vite default.
 *
 * Uruchamianie:
 *   npm run test:e2e                 # wszystko headless
 *   npx playwright test --ui         # tryb UI (debug)
 *   npx playwright test smoke-mcp    # pojedynczy spec
 */
export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: false, // cookie-based auth — unikamy race
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1, // DB state shared — seq safer na MVP
	reporter: process.env.CI ? 'github' : 'list',
	timeout: 30_000,
	expect: { timeout: 5_000 },
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		actionTimeout: 10_000,
		navigationTimeout: 15_000
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
		stdout: 'ignore',
		stderr: 'pipe'
	}
});
