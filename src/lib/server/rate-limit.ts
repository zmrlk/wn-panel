/**
 * Token-bucket rate limiter — in-memory, per-key (np. IP).
 *
 * Algorytm:
 * - Każdy key ma bucket z `capacity` tokenów
 * - Tokeny regenerują się z szybkością `refillPerSecond`
 * - Request zjada 1 token; jeżeli brak → reject z retryAfter
 *
 * Zalety in-memory:
 * - Zero dependencies (bez Redis)
 * - Microsecondowy lookup
 * - Dla single-instance deploy wystarczy
 *
 * Ograniczenia:
 * - Restart procesu = czyszczenie wszystkich bucketów (attacker może to wykorzystać jeżeli restart częsty)
 * - Nie działa poprawnie w multi-instance bez sticky sessions
 * - Memory rośnie liniowo z liczbą unikalnych kluczy — cleanup TODO (v5.41)
 *
 * Dla v1.0 (single Proxmox VM, <100 rps) wystarczy. Redis/Upstash → v6+.
 */

export type RateLimitResult = {
	allowed: boolean;
	/** Ile ms musi czekać klient zanim dostanie 1 token (tylko gdy allowed=false) */
	retryAfterMs?: number;
	/** Ile tokenów zostało po tej operacji (do debugowania) */
	remaining: number;
};

export type RateLimiter = {
	/** Spróbuj zjeść 1 token dla danego klucza. Zwróć czy dozwolone. */
	hit(key: string): RateLimitResult;
	/** Ile unikalnych kluczy w pamięci (do monitoringu) */
	size(): number;
	/** Wyczyść wszystko (dla testów). */
	reset(): void;
};

type Bucket = {
	tokens: number;
	lastRefillMs: number;
};

export type RateLimiterOptions = {
	/** Max tokenów w buckecie. Klient może zrobić burst do tej liczby. */
	capacity: number;
	/** Ile tokenów regeneruje się na sekundę. */
	refillPerSecond: number;
	/** Źródło czasu — injected dla testów. Default: `Date.now`. */
	now?: () => number;
};

/**
 * Stwórz rate limiter.
 *
 * @example
 * const rl = createRateLimiter({ capacity: 10, refillPerSecond: 0.5 });
 * // 10 request burst, potem 1 token co 2 sekundy
 * if (!rl.hit(event.getClientAddress()).allowed) {
 *   return new Response('Too many requests', { status: 429 });
 * }
 */
export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
	const { capacity, refillPerSecond } = opts;
	const now = opts.now ?? Date.now;

	if (capacity <= 0) throw new Error('capacity must be > 0');
	if (refillPerSecond <= 0) throw new Error('refillPerSecond must be > 0');

	const buckets = new Map<string, Bucket>();

	function refillBucket(bucket: Bucket, currentMs: number): void {
		const elapsedMs = currentMs - bucket.lastRefillMs;
		if (elapsedMs <= 0) return;
		const regen = (elapsedMs / 1000) * refillPerSecond;
		bucket.tokens = Math.min(capacity, bucket.tokens + regen);
		bucket.lastRefillMs = currentMs;
	}

	return {
		hit(key: string): RateLimitResult {
			const currentMs = now();
			let bucket = buckets.get(key);
			if (!bucket) {
				bucket = { tokens: capacity, lastRefillMs: currentMs };
				buckets.set(key, bucket);
			} else {
				refillBucket(bucket, currentMs);
			}

			if (bucket.tokens >= 1) {
				bucket.tokens -= 1;
				return { allowed: true, remaining: Math.floor(bucket.tokens) };
			}

			// Reject — oblicz retryAfter na bazie brakujących tokenów
			const deficit = 1 - bucket.tokens;
			const retryAfterMs = Math.ceil((deficit / refillPerSecond) * 1000);
			return { allowed: false, retryAfterMs, remaining: 0 };
		},
		size(): number {
			return buckets.size;
		},
		reset(): void {
			buckets.clear();
		}
	};
}

/**
 * Helper — wyciągnij client IP z SvelteKit RequestEvent.
 * Honor X-Forwarded-For (za reverse proxy) i fall-back do getClientAddress().
 * Dla rate-limit per-IP.
 */
export function getClientKey(request: Request, fallback: () => string): string {
	const xff = request.headers.get('x-forwarded-for');
	if (xff) {
		// First IP = real client (rest to proxy chain)
		return xff.split(',')[0].trim();
	}
	const realIp = request.headers.get('x-real-ip');
	if (realIp) return realIp.trim();
	return fallback();
}
