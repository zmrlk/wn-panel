import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pkg, item, client, offer, offerItem } from '$lib/server/db/schema';
import { asc, sql, eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	const [packages, items, clients] = await Promise.all([
		db.select().from(pkg).where(eq(pkg.active, true)).orderBy(asc(pkg.sortOrder)),
		db.select().from(item).orderBy(asc(item.category), asc(item.name)),
		db.select().from(client).orderBy(asc(client.name))
	]);

	return { user, packages, items, clients };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();

		const clientId = form.get('clientId')?.toString() || null;
		const newClientName = form.get('newClientName')?.toString() ?? '';
		const newClientPhone = form.get('newClientPhone')?.toString() || null;
		const newClientEmail = form.get('newClientEmail')?.toString() || null;

		const eventName = form.get('eventName')?.toString() ?? '';
		const eventStartDate = form.get('eventStartDate')?.toString() ?? '';
		const eventEndDate = form.get('eventEndDate')?.toString() ?? '';
		const venue = form.get('venue')?.toString() || null;
		const notes = form.get('notes')?.toString() || null;

		if (!eventName || !eventStartDate || !eventEndDate) {
			return fail(400, { error: 'Brak nazwy eventu lub dat' });
		}

		// Create new client if needed
		let resolvedClientId = clientId;
		if (!resolvedClientId && newClientName) {
			const [c] = await db
				.insert(client)
				.values({
					name: newClientName,
					phone: newClientPhone,
					email: newClientEmail
				})
				.returning();
			resolvedClientId = c.id;
		}

		if (!resolvedClientId) {
			return fail(400, { error: 'Wybierz klienta lub wpisz nowego' });
		}

		// Next offer number (OFF-2026-XXXX)
		const [{ maxNum }] = await db
			.select({
				maxNum: sql<string>`COALESCE(MAX(CAST(SUBSTRING("number" FROM 'OFF-2026-(\\d+)') AS INTEGER)), 0)`
			})
			.from(offer);
		const nextNum = (Number(maxNum) || 0) + 1;
		const number = `OFF-2026-${String(nextNum).padStart(4, '0')}`;

		// Parse items (form has item_0_id, item_0_qty, item_0_days, item_0_price, item_1_id, ...)
		type Line = { itemId: string | null; desc: string; qty: number; days: number; unitPrice: number; lineTotal: number };
		const lines: Line[] = [];
		let i = 0;
		while (form.has(`item_${i}_desc`)) {
			const itemId = form.get(`item_${i}_id`)?.toString() || null;
			const desc = form.get(`item_${i}_desc`)?.toString() ?? '';
			const qty = Number(form.get(`item_${i}_qty`) ?? '0');
			const days = Number(form.get(`item_${i}_days`) ?? '1');
			const unitPrice = Number(form.get(`item_${i}_price`) ?? '0');
			if (qty > 0 && desc) {
				const lineTotal = qty * days * unitPrice;
				lines.push({ itemId, desc, qty, days, unitPrice, lineTotal });
			}
			i++;
		}

		const totalCents = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100);

		// Insert offer
		const [created] = await db
			.insert(offer)
			.values({
				number,
				clientId: resolvedClientId,
				eventName,
				eventStartDate,
				eventEndDate,
				venue,
				totalCents,
				status: 'draft',
				notes
			})
			.returning();

		// Insert offer items
		if (lines.length > 0) {
			await db.insert(offerItem).values(
				lines.map((l) => ({
					offerId: created.id,
					tentId: l.itemId,
					description: l.desc,
					quantity: l.qty,
					unitPriceCents: Math.round(l.unitPrice * 100),
					lineTotalCents: Math.round(l.lineTotal * 100)
				}))
			);
		}

		throw redirect(303, '/offers');
	}
};
