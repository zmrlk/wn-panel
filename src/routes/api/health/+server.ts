import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';

/**
 * GET /api/health — liveness + DB connectivity check.
 * Używane przez:
 * - Docker HEALTHCHECK (wget na :3000/api/health)
 * - Cloudflare Tunnel monitor
 * - manual smoke test
 */
export const GET: RequestHandler = async () => {
	const startedAt = Date.now();
	let dbStatus: 'up' | 'down' = 'down';
	let dbError: string | null = null;
	try {
		await db.execute(sql`SELECT 1`);
		dbStatus = 'up';
	} catch (e) {
		dbError = e instanceof Error ? e.message : String(e);
	}
	const latencyMs = Date.now() - startedAt;
	const ok = dbStatus === 'up';
	return json(
		{
			status: ok ? 'ok' : 'degraded',
			db: dbStatus,
			latencyMs,
			ts: new Date().toISOString(),
			...(dbError ? { dbError } : {})
		},
		{ status: ok ? 200 : 503 }
	);
};
