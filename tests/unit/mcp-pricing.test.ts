import { describe, it, expect } from 'vitest';
import {
	calcDays,
	markupForTier,
	calcTotalCents,
	applyMarkup,
	MCP_PREMIUM_MARKUP,
	MCP_NORMAL_MARKUP,
	type McpItemPrice
} from '$lib/mcp-pricing';

describe('calcDays', () => {
	it('same day = 1 dzień', () => {
		expect(calcDays('2026-05-01', '2026-05-01')).toBe(1);
	});

	it('weekend (pt-nd) = 3 dni', () => {
		expect(calcDays('2026-05-01', '2026-05-03')).toBe(3);
	});

	it('tydzień = 7 dni', () => {
		expect(calcDays('2026-05-01', '2026-05-07')).toBe(7);
	});

	it('reversed dates zwraca min 1 (safety)', () => {
		// end < start — nie powinno się zdarzyć, ale nie crash
		expect(calcDays('2026-05-10', '2026-05-01')).toBe(1);
	});

	it('miesiąc maj = 31 dni', () => {
		expect(calcDays('2026-05-01', '2026-05-31')).toBe(31);
	});
});

describe('markupForTier', () => {
	it('normal → 1.0', () => {
		expect(markupForTier('normal')).toBe(1.0);
		expect(markupForTier('normal')).toBe(MCP_NORMAL_MARKUP);
	});

	it('premium → 1.2', () => {
		expect(markupForTier('premium')).toBe(1.2);
		expect(markupForTier('premium')).toBe(MCP_PREMIUM_MARKUP);
	});
});

describe('applyMarkup', () => {
	it('normal: 100 zł/dzień → 100 zł (bez markup)', () => {
		expect(applyMarkup(10000, 'normal')).toBe(10000);
	});

	it('premium: 100 zł/dzień → 120 zł (+20%)', () => {
		expect(applyMarkup(10000, 'premium')).toBe(12000);
	});

	it('null price → 0', () => {
		expect(applyMarkup(null, 'normal')).toBe(0);
		expect(applyMarkup(null, 'premium')).toBe(0);
	});

	it('zaokrągla do int (premium: 333 × 1.2 = 399.6 → 400)', () => {
		expect(applyMarkup(333, 'premium')).toBe(400);
	});

	it('zero cena → zero', () => {
		expect(applyMarkup(0, 'premium')).toBe(0);
	});
});

describe('calcTotalCents', () => {
	const prices: Map<string, McpItemPrice> = new Map([
		['tent-1', { id: 'tent-1', pricePerDayCents: 50000 }], // 500 zł/dzień
		['tent-2', { id: 'tent-2', pricePerDayCents: 30000 }], // 300 zł/dzień
		['free-item', { id: 'free-item', pricePerDayCents: null }]
	]);

	it('1 namiot × 2 dni × normal = 1000 zł', () => {
		const total = calcTotalCents([{ itemId: 'tent-1', quantity: 1 }], prices, 2, 'normal');
		expect(total).toBe(100000); // 500 × 1 × 2 × 1.0 = 1000 zł
	});

	it('1 namiot × 2 dni × premium = 1200 zł (+20%)', () => {
		const total = calcTotalCents([{ itemId: 'tent-1', quantity: 1 }], prices, 2, 'premium');
		expect(total).toBe(120000); // 500 × 1 × 2 × 1.2 = 1200 zł
	});

	it('wiele itemów: 2× tent-1 + 3× tent-2, 1 dzień, normal', () => {
		const total = calcTotalCents(
			[
				{ itemId: 'tent-1', quantity: 2 },
				{ itemId: 'tent-2', quantity: 3 }
			],
			prices,
			1,
			'normal'
		);
		// (500×2×1) + (300×3×1) = 1000 + 900 = 1900 zł
		expect(total).toBe(190000);
	});

	it('wiele itemów, premium (+20%)', () => {
		const total = calcTotalCents(
			[
				{ itemId: 'tent-1', quantity: 2 },
				{ itemId: 'tent-2', quantity: 3 }
			],
			prices,
			1,
			'premium'
		);
		// 190000 × 1.2 = 228000
		expect(total).toBe(228000);
	});

	it('null price → nie dodaje do total', () => {
		const total = calcTotalCents(
			[
				{ itemId: 'tent-1', quantity: 1 },
				{ itemId: 'free-item', quantity: 5 }
			],
			prices,
			1,
			'normal'
		);
		expect(total).toBe(50000); // tylko tent-1
	});

	it('unknown item (nie w mapie) → ignorowany, nie crash', () => {
		const total = calcTotalCents(
			[
				{ itemId: 'tent-1', quantity: 1 },
				{ itemId: 'ghost-item', quantity: 10 }
			],
			prices,
			1,
			'normal'
		);
		expect(total).toBe(50000);
	});

	it('pusta lista items → 0', () => {
		expect(calcTotalCents([], prices, 1, 'normal')).toBe(0);
	});

	it('zaokrąglenie (premium): 333 × 1 × 1 × 1.2 = 399.6 → 400', () => {
		const odd: Map<string, McpItemPrice> = new Map([
			['x', { id: 'x', pricePerDayCents: 333 }]
		]);
		expect(calcTotalCents([{ itemId: 'x', quantity: 1 }], odd, 1, 'premium')).toBe(400);
	});

	it('realistyczny scenariusz: wesele 50-osobowe, 3 dni, premium', () => {
		// 1× duży namiot (1500 zł/dzień) + 50× krzesło (20 zł/dzień)
		const weddingPrices: Map<string, McpItemPrice> = new Map([
			['big-tent', { id: 'big-tent', pricePerDayCents: 150000 }],
			['chair', { id: 'chair', pricePerDayCents: 2000 }]
		]);
		const total = calcTotalCents(
			[
				{ itemId: 'big-tent', quantity: 1 },
				{ itemId: 'chair', quantity: 50 }
			],
			weddingPrices,
			3,
			'premium'
		);
		// (1500×1×3) + (20×50×3) = 4500 + 3000 = 7500 zł × 1.2 = 9000 zł
		expect(total).toBe(900000);
	});
});
