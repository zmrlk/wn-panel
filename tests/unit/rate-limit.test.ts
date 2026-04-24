import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRateLimiter } from '$lib/server/rate-limit';

describe('createRateLimiter — validation', () => {
	it('capacity 0 → throw', () => {
		expect(() => createRateLimiter({ capacity: 0, refillPerSecond: 1 })).toThrow();
	});

	it('capacity -1 → throw', () => {
		expect(() => createRateLimiter({ capacity: -1, refillPerSecond: 1 })).toThrow();
	});

	it('refillPerSecond 0 → throw', () => {
		expect(() => createRateLimiter({ capacity: 10, refillPerSecond: 0 })).toThrow();
	});
});

describe('createRateLimiter — pojedynczy klucz', () => {
	let mockTime = 0;
	const now = () => mockTime;

	beforeEach(() => {
		mockTime = 0;
	});

	it('pierwszy hit = allowed, pełny capacity', () => {
		const rl = createRateLimiter({ capacity: 3, refillPerSecond: 1, now });
		const result = rl.hit('ip-1');
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(2);
	});

	it('hit do wyczerpania capacity (3 hits, burst)', () => {
		const rl = createRateLimiter({ capacity: 3, refillPerSecond: 1, now });
		expect(rl.hit('ip-1').allowed).toBe(true); // 2 left
		expect(rl.hit('ip-1').allowed).toBe(true); // 1 left
		expect(rl.hit('ip-1').allowed).toBe(true); // 0 left
		expect(rl.hit('ip-1').allowed).toBe(false); // reject
	});

	it('po odrzuceniu — retryAfterMs jest set', () => {
		const rl = createRateLimiter({ capacity: 2, refillPerSecond: 1, now });
		rl.hit('ip-1');
		rl.hit('ip-1');
		const result = rl.hit('ip-1');
		expect(result.allowed).toBe(false);
		expect(result.retryAfterMs).toBeGreaterThan(0);
		expect(result.retryAfterMs).toBeLessThanOrEqual(1000); // 1 token at 1/s = 1000ms
	});

	it('refill po upływie czasu', () => {
		const rl = createRateLimiter({ capacity: 2, refillPerSecond: 1, now });
		rl.hit('ip-1'); // tokens: 1
		rl.hit('ip-1'); // tokens: 0
		expect(rl.hit('ip-1').allowed).toBe(false);

		// Advance 1s → +1 token regen
		mockTime += 1000;
		expect(rl.hit('ip-1').allowed).toBe(true);
		expect(rl.hit('ip-1').allowed).toBe(false); // znowu wyczerpane
	});

	it('refill cap capacity (nie przekracza)', () => {
		const rl = createRateLimiter({ capacity: 3, refillPerSecond: 1, now });
		rl.hit('ip-1'); // tokens: 2

		// Advance 100s → teoretycznie +100 ale cap = 3
		mockTime += 100_000;

		// Tokens capped at 3 — próbujemy 3 hits
		expect(rl.hit('ip-1').allowed).toBe(true); // 2
		expect(rl.hit('ip-1').allowed).toBe(true); // 1
		expect(rl.hit('ip-1').allowed).toBe(true); // 0
		expect(rl.hit('ip-1').allowed).toBe(false); // reject
	});

	it('slow refill (co 2s 1 token)', () => {
		const rl = createRateLimiter({ capacity: 2, refillPerSecond: 0.5, now });
		rl.hit('ip-1'); // 1
		rl.hit('ip-1'); // 0
		expect(rl.hit('ip-1').allowed).toBe(false);

		mockTime += 1000; // 0.5 token → still < 1
		expect(rl.hit('ip-1').allowed).toBe(false);

		mockTime += 1000; // total 2s → 1 token
		expect(rl.hit('ip-1').allowed).toBe(true);
	});
});

describe('createRateLimiter — wiele kluczy niezależne', () => {
	let mockTime = 0;
	const now = () => mockTime;

	beforeEach(() => {
		mockTime = 0;
	});

	it('bucket per-klucz (ip-1 i ip-2 niezależne)', () => {
		const rl = createRateLimiter({ capacity: 2, refillPerSecond: 1, now });
		rl.hit('ip-1');
		rl.hit('ip-1');
		expect(rl.hit('ip-1').allowed).toBe(false); // ip-1 exhausted

		// ip-2 ma świeży bucket
		expect(rl.hit('ip-2').allowed).toBe(true);
		expect(rl.hit('ip-2').allowed).toBe(true);
		expect(rl.hit('ip-2').allowed).toBe(false); // teraz też exhausted
	});

	it('size() zlicza unikalne klucze', () => {
		const rl = createRateLimiter({ capacity: 5, refillPerSecond: 1, now });
		expect(rl.size()).toBe(0);
		rl.hit('ip-1');
		expect(rl.size()).toBe(1);
		rl.hit('ip-2');
		expect(rl.size()).toBe(2);
		rl.hit('ip-1'); // już jest w bucketach
		expect(rl.size()).toBe(2);
	});

	it('reset() czyści wszystko', () => {
		const rl = createRateLimiter({ capacity: 2, refillPerSecond: 1, now });
		rl.hit('ip-1');
		rl.hit('ip-1');
		expect(rl.hit('ip-1').allowed).toBe(false);

		rl.reset();
		expect(rl.size()).toBe(0);
		expect(rl.hit('ip-1').allowed).toBe(true); // bucket znowu full
	});
});

describe('createRateLimiter — realistyczny scenariusz MCP', () => {
	let mockTime = 0;
	const now = () => mockTime;

	it('MCP reservation: 10 req/min burst, 0.166 token/sec refill', () => {
		// 10 req/min = 10 burst, potem 1 token / 6s (60/10 = 6s per token)
		const rl = createRateLimiter({ capacity: 10, refillPerSecond: 10 / 60, now });

		// Burst 10 requestów OK
		for (let i = 0; i < 10; i++) {
			expect(rl.hit('attacker').allowed, `request ${i + 1}`).toBe(true);
		}
		// 11th rejected
		expect(rl.hit('attacker').allowed).toBe(false);

		// 6s później — 1 token regen
		mockTime += 6000;
		expect(rl.hit('attacker').allowed).toBe(true);
		expect(rl.hit('attacker').allowed).toBe(false); // znowu

		// Minuta później — burst znowu możliwy (cap=10 po 60s regen)
		mockTime += 60_000;
		for (let i = 0; i < 10; i++) {
			expect(rl.hit('attacker').allowed).toBe(true);
		}
	});

	it('/api/public/lead: 5 req/min burst (kontrola spamu)', () => {
		const rl = createRateLimiter({ capacity: 5, refillPerSecond: 5 / 60, now });
		for (let i = 0; i < 5; i++) {
			expect(rl.hit('bot').allowed).toBe(true);
		}
		const rejected = rl.hit('bot');
		expect(rejected.allowed).toBe(false);
		expect(rejected.retryAfterMs).toBeGreaterThan(0);
		// Retry after ~12s (1/0.0833)
		expect(rejected.retryAfterMs).toBeLessThanOrEqual(12_000);
	});
});

describe('createRateLimiter — domyślna clock Date.now', () => {
	it('działa bez custom now (real clock)', () => {
		const rl = createRateLimiter({ capacity: 2, refillPerSecond: 1 });
		expect(rl.hit('x').allowed).toBe(true);
		expect(rl.hit('x').allowed).toBe(true);
		expect(rl.hit('x').allowed).toBe(false);
	});

	it('vi.useFakeTimers nie jest wymagany, ale działa', () => {
		vi.useFakeTimers();
		const rl = createRateLimiter({ capacity: 2, refillPerSecond: 1 });
		rl.hit('x');
		rl.hit('x');
		expect(rl.hit('x').allowed).toBe(false);

		vi.advanceTimersByTime(1000);
		expect(rl.hit('x').allowed).toBe(true);

		vi.useRealTimers();
	});
});
