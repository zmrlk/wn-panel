/**
 * Shared rate limiters — pre-configured per-endpoint.
 * Moduł singleton (importowany = 1 instance limiter).
 *
 * Per-endpoint config (dobrane pod realistyczne use case):
 * - MCP reservation: 10/min — AI booking nie powinno robić burstów
 * - MCP availability: 30/min — łatwiej spam (GET), pozwalamy więcej
 * - public/lead: 5/min — form submit, bot-control critical
 *
 * TODO v5.41: memory cleanup (buckets starsze niż 10 min → remove)
 * TODO v6: Redis backend dla multi-instance
 */

import { createRateLimiter } from './rate-limit';

/** MCP POST /reservation — 10 req/min burst, refill 1 token / 6s */
export const mcpReservationLimiter = createRateLimiter({
	capacity: 10,
	refillPerSecond: 10 / 60
});

/** MCP GET /availability — 30 req/min burst, refill 1 token / 2s */
export const mcpAvailabilityLimiter = createRateLimiter({
	capacity: 30,
	refillPerSecond: 30 / 60
});

/** /api/public/lead POST — 5 req/min burst, refill 1 token / 12s */
export const publicLeadLimiter = createRateLimiter({
	capacity: 5,
	refillPerSecond: 5 / 60
});

/** /auth/login GET — 10 req/min burst, refill 1 token / 6s (brute force guard) */
export const authLoginLimiter = createRateLimiter({
	capacity: 10,
	refillPerSecond: 10 / 60
});
