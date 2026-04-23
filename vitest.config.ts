import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

/**
 * Vitest config — unit tests dla pure helpers/services.
 *
 * Ekskluzja e2e (Playwright) — te są w tests/e2e/ z innym config.
 */
export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['tests/unit/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
		exclude: ['tests/e2e/**', 'node_modules/**'],
		environment: 'node',
		globals: false
	},
	resolve: {
		alias: {
			$lib: '/src/lib'
		}
	}
});
