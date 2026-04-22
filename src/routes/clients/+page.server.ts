import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { client, booking, offer } from '$lib/server/db/schema';
import { asc, eq, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	const search = url.searchParams.get('q')?.toLowerCase() ?? '';

	// Clients with aggregated stats (bookings + offers + lifetime value)
	const rows = await db
		.select({
			id: client.id,
			name: client.name,
			company: client.company,
			phone: client.phone,
			email: client.email,
			address: client.address,
			notes: client.notes,
			createdAt: client.createdAt,
			bookingsCount: sql<number>`count(distinct ${booking.id})::int`,
			lifetimeCents: sql<number>`coalesce(sum(distinct ${booking.priceCents}), 0)::int`
		})
		.from(client)
		.leftJoin(booking, eq(booking.clientId, client.id))
		.groupBy(client.id)
		.orderBy(asc(client.name));

	// Offers count per client (separate query — avoid double-count)
	const offerCounts = await db
		.select({
			clientId: offer.clientId,
			count: sql<number>`count(*)::int`,
			totalCents: sql<number>`coalesce(sum(${offer.totalCents}), 0)::int`
		})
		.from(offer)
		.groupBy(offer.clientId);
	const offerMap = new Map(offerCounts.map((r) => [r.clientId, r]));

	let clients = rows.map((r) => ({
		...r,
		offersCount: offerMap.get(r.id)?.count ?? 0,
		offersValueCents: offerMap.get(r.id)?.totalCents ?? 0
	}));

	if (search) {
		clients = clients.filter(
			(c) =>
				c.name.toLowerCase().includes(search) ||
				(c.company ?? '').toLowerCase().includes(search) ||
				(c.phone ?? '').includes(search) ||
				(c.email ?? '').toLowerCase().includes(search)
		);
	}

	const stats = {
		total: clients.length,
		withBookings: clients.filter((c) => c.bookingsCount > 0).length,
		totalLifetimeCents: clients.reduce((s, c) => s + c.lifetimeCents + c.offersValueCents, 0)
	};

	return { user, clients, stats, search };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const name = form.get('name')?.toString() ?? '';
		if (!name) return fail(400, { error: 'name required' });
		await db.insert(client).values({
			name,
			company: form.get('company')?.toString() || null,
			phone: form.get('phone')?.toString() || null,
			email: form.get('email')?.toString() || null,
			address: form.get('address')?.toString() || null,
			notes: form.get('notes')?.toString() || null
		});
		return { success: true };
	},
	update: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id')?.toString();
		if (!id) return fail(400);
		await db
			.update(client)
			.set({
				name: form.get('name')?.toString() ?? '',
				company: form.get('company')?.toString() || null,
				phone: form.get('phone')?.toString() || null,
				email: form.get('email')?.toString() || null,
				address: form.get('address')?.toString() || null,
				notes: form.get('notes')?.toString() || null,
				updatedAt: new Date()
			})
			.where(eq(client.id, id));
		return { success: true };
	}
};
