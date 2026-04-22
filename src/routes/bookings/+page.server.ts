import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { booking, client } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	const statusFilter = url.searchParams.get('status') ?? 'all';

	const rows = await db
		.select({
			id: booking.id,
			eventName: booking.eventName,
			startDate: booking.startDate,
			endDate: booking.endDate,
			venue: booking.venue,
			status: booking.status,
			priceCents: booking.priceCents,
			notes: booking.notes,
			createdAt: booking.createdAt,
			clientId: booking.clientId,
			clientName: client.name,
			clientCompany: client.company,
			clientPhone: client.phone
		})
		.from(booking)
		.leftJoin(client, eq(booking.clientId, client.id))
		.orderBy(desc(booking.startDate));

	const counts = {
		all: rows.length,
		draft: 0,
		confirmed: 0,
		'in-progress': 0,
		done: 0,
		cancelled: 0
	};
	for (const r of rows) {
		if (r.status in counts) counts[r.status as keyof typeof counts] += 1;
	}

	let bookings = rows;
	if (statusFilter !== 'all') {
		bookings = rows.filter((r) => r.status === statusFilter);
	}

	const confirmedValue = rows
		.filter((r) => r.status === 'confirmed' || r.status === 'done')
		.reduce((s, r) => s + (r.priceCents ?? 0), 0);

	// Client list dla inline add
	const clients = await db.select().from(client);

	return { user, bookings, counts, statusFilter, confirmedValue, clients };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const clientId = form.get('clientId')?.toString();
		const eventName = form.get('eventName')?.toString() ?? '';
		const startDate = form.get('startDate')?.toString();
		const endDate = form.get('endDate')?.toString();

		if (!clientId || !eventName || !startDate || !endDate) {
			return fail(400, { error: 'missing fields' });
		}

		await db.insert(booking).values({
			clientId,
			eventName,
			startDate,
			endDate,
			venue: form.get('venue')?.toString() || null,
			status: form.get('status')?.toString() ?? 'draft',
			priceCents: Math.round(Number(form.get('priceZl') ?? '0') * 100) || null,
			notes: form.get('notes')?.toString() || null
		});
		return { success: true };
	},

	updateStatus: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id')?.toString();
		const status = form.get('status')?.toString();
		if (!id || !status) return fail(400);
		await db.update(booking).set({ status, updatedAt: new Date() }).where(eq(booking.id, id));
		return { success: true };
	}
};
