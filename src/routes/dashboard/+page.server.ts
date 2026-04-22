import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, schema } from '$lib/server/db';
import { sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Smoke test: count rows in business tables
	const [{ count: tents }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(schema.tent);
	const [{ count: clients }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(schema.client);
	const [{ count: bookings }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(schema.booking);

	return {
		user: locals.user,
		stats: {
			tents,
			clients,
			bookings
		}
	};
};
