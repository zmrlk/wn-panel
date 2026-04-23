import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { checkAvailability } from '$lib/server/availability-check';
import { isValidIsoDate } from '$lib/availability';

/**
 * POST /api/availability
 * Body: { from, to, items: [{itemId, requested}], excludeBookingId? }
 * Response: AvailabilityResult
 */

type RequestBody = {
	from: unknown;
	to: unknown;
	items: unknown;
	excludeBookingId?: unknown;
};

export const POST: RequestHandler = async ({ request }) => {
	const raw = (await request.json().catch(() => null)) as RequestBody | null;
	if (!raw) throw error(400, 'Nieprawidłowy JSON');

	const { from, to, items, excludeBookingId } = raw;
	if (typeof from !== 'string' || !isValidIsoDate(from)) {
		throw error(400, 'from: wymagany format YYYY-MM-DD');
	}
	if (typeof to !== 'string' || !isValidIsoDate(to)) {
		throw error(400, 'to: wymagany format YYYY-MM-DD');
	}
	if (from > to) throw error(400, 'from nie może być większe niż to');
	if (!Array.isArray(items) || items.length === 0) {
		throw error(400, 'items: niepusta tablica wymagana');
	}

	const parsed = items.map((i, idx) => {
		if (!i || typeof i !== 'object') throw error(400, `items[${idx}]: obiekt wymagany`);
		const o = i as Record<string, unknown>;
		if (typeof o.itemId !== 'string' || o.itemId.length < 8) {
			throw error(400, `items[${idx}].itemId: string wymagany`);
		}
		const req = Number(o.requested);
		if (!Number.isFinite(req) || req < 0) {
			throw error(400, `items[${idx}].requested: nieujemna liczba wymagana`);
		}
		return { itemId: o.itemId, requested: Math.floor(req) };
	});

	const exclude =
		typeof excludeBookingId === 'string' && excludeBookingId.length > 0
			? excludeBookingId
			: null;

	const result = await checkAvailability(from, to, parsed, exclude);
	return json(result);
};
