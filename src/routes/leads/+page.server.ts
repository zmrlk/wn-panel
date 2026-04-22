import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { lead } from '$lib/server/db/schema';
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

	const leads = await db.select().from(lead).orderBy(desc(lead.createdAt));

	const counts = {
		all: leads.length,
		new: 0,
		contacted: 0,
		qualified: 0,
		quoted: 0,
		won: 0,
		lost: 0
	};
	for (const l of leads) {
		if (l.status in counts) counts[l.status as keyof typeof counts] += 1;
	}

	let filtered = leads;
	if (statusFilter !== 'all') {
		filtered = leads.filter((l) => l.status === statusFilter);
	}

	return { user, leads: filtered, counts, statusFilter };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const name = form.get('name')?.toString() ?? '';
		if (!name) return fail(400, { error: 'name required' });
		await db.insert(lead).values({
			name,
			company: form.get('company')?.toString() || null,
			phone: form.get('phone')?.toString() || null,
			email: form.get('email')?.toString() || null,
			source: form.get('source')?.toString() || 'website',
			eventName: form.get('eventName')?.toString() || null,
			eventDateHint: form.get('eventDateHint')?.toString() || null,
			guestsCount: Number(form.get('guestsCount') ?? '0') || null,
			venueHint: form.get('venueHint')?.toString() || null,
			message: form.get('message')?.toString() || null,
			status: 'new'
		});
		return { success: true };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id')?.toString();
		if (!id) return fail(400);
		await db
			.update(lead)
			.set({
				name: form.get('name')?.toString() ?? '',
				company: form.get('company')?.toString() || null,
				phone: form.get('phone')?.toString() || null,
				email: form.get('email')?.toString() || null,
				source: form.get('source')?.toString() || 'website',
				eventName: form.get('eventName')?.toString() || null,
				eventDateHint: form.get('eventDateHint')?.toString() || null,
				guestsCount: Number(form.get('guestsCount') ?? '0') || null,
				venueHint: form.get('venueHint')?.toString() || null,
				notes: form.get('notes')?.toString() || null,
				status: form.get('status')?.toString() ?? 'new',
				updatedAt: new Date()
			})
			.where(eq(lead.id, id));
		return { success: true };
	},

	updateStatus: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id')?.toString();
		const status = form.get('status')?.toString();
		if (!id || !status) return fail(400);
		await db.update(lead).set({ status, updatedAt: new Date() }).where(eq(lead.id, id));
		return { success: true };
	}
};
