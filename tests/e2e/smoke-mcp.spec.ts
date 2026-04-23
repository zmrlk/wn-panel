import { test, expect } from '@playwright/test';

/**
 * Smoke: MCP endpoints — validation + CORS.
 * NIE tworzymy rezerwacji (brak teardown) — tylko sprawdzamy że endpointy
 * odpowiadają i walidują wejście poprawnie.
 *
 * Pokrycie happy-path + real reservation create → v5.39 (po refaktorze)
 * albo osobny test z DB transaction + rollback.
 */

const MCP_BASE = '/api/mcp';

test.describe('MCP endpoints — validation', () => {
	test('OPTIONS /reservation zwraca CORS headers', async ({ request }) => {
		const res = await request.fetch(`${MCP_BASE}/reservation`, { method: 'OPTIONS' });
		expect(res.status()).toBe(204);
		expect(res.headers()['access-control-allow-origin']).toBe('*');
		expect(res.headers()['access-control-allow-methods']).toContain('POST');
	});

	test('POST /reservation bez body → 400 Invalid JSON', async ({ request }) => {
		const res = await request.post(`${MCP_BASE}/reservation`, {
			data: 'not json' as unknown as object,
			headers: { 'Content-Type': 'text/plain' }
		});
		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toContain('Invalid JSON');
	});

	test('POST /reservation bez wymaganych pól → 400', async ({ request }) => {
		const res = await request.post(`${MCP_BASE}/reservation`, {
			data: { clientName: 'Test' } // brak reszty
		});
		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toMatch(/clientEmail|eventName|eventStartDate|eventEndDate/);
	});

	test('POST /reservation pusta lista items → 400', async ({ request }) => {
		const res = await request.post(`${MCP_BASE}/reservation`, {
			data: {
				clientName: 'Test',
				clientEmail: 'test@example.com',
				eventName: 'Test event',
				eventStartDate: '2027-06-01',
				eventEndDate: '2027-06-01',
				items: []
			}
		});
		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.error).toContain('Pusta lista');
	});

	test('POST /reservation invalid tier → 400', async ({ request }) => {
		const res = await request.post(`${MCP_BASE}/reservation`, {
			data: {
				clientName: 'Test',
				clientEmail: 'test@example.com',
				eventName: 'Test event',
				eventStartDate: '2027-06-01',
				eventEndDate: '2027-06-01',
				items: [{ itemId: 'ghost', quantity: 1 }],
				tier: 'vip-platinum' // nie istnieje
			}
		});
		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.error).toMatch(/tier/i);
	});

	test('POST /reservation z nie-UUID itemId → 400 (nie 500)', async ({ request }) => {
		// Regression test: pg wcześniej rzucał 22P02 → 500. Teraz validujemy UUID pre-query.
		const res = await request.post(`${MCP_BASE}/reservation`, {
			data: {
				clientName: 'Test Klient',
				clientEmail: 'ghost@example.com',
				eventName: 'Ghost event',
				eventStartDate: '2027-06-01',
				eventEndDate: '2027-06-02',
				items: [{ itemId: 'nonexistent-tent-id-xyz', quantity: 1 }]
			}
		});
		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toMatch(/UUID|format/i);
	});

	test('POST /reservation z poprawnym UUID ale nie-istniejącym → 400', async ({ request }) => {
		const res = await request.post(`${MCP_BASE}/reservation`, {
			data: {
				clientName: 'Test Klient',
				clientEmail: 'ghost@example.com',
				eventName: 'Ghost event',
				eventStartDate: '2027-06-01',
				eventEndDate: '2027-06-02',
				items: [{ itemId: '00000000-0000-0000-0000-000000000000', quantity: 1 }]
			}
		});
		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toMatch(/nie istnieją|archived/i);
	});
});

test.describe('MCP /availability', () => {
	test('GET /availability odpowiada (może być pusty array)', async ({ request }) => {
		const res = await request.get(
			`${MCP_BASE}/availability?startDate=2027-06-01&endDate=2027-06-07`
		);
		expect(res.status()).toBeLessThan(500);
	});
});

test.describe('MCP /openapi', () => {
	test('GET /openapi zwraca OpenAPI 3.1 spec', async ({ request }) => {
		const res = await request.get(`${MCP_BASE}/openapi`);
		expect(res.status()).toBe(200);
		const spec = await res.json();
		expect(spec.openapi).toMatch(/^3\.[01]/);
		expect(spec.paths).toBeDefined();
	});
});
