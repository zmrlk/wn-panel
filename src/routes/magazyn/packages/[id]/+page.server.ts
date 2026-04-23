import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pkg, pkgItem, item } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	const [p] = await db.select().from(pkg).where(eq(pkg.id, params.id)).limit(1);
	if (!p) throw error(404, 'Pakiet nie istnieje');

	const [pkgItems, allItems] = await Promise.all([
		db
			.select({
				id: pkgItem.id,
				packageId: pkgItem.packageId,
				itemId: pkgItem.itemId,
				customLabel: pkgItem.customLabel,
				quantity: pkgItem.quantity,
				sortOrder: pkgItem.sortOrder,
				itemName: item.name,
				itemCategory: item.category,
				itemTotalQty: item.totalQty
			})
			.from(pkgItem)
			.leftJoin(item, eq(pkgItem.itemId, item.id))
			.where(eq(pkgItem.packageId, params.id))
			.orderBy(asc(pkgItem.sortOrder)),
		db.select().from(item).orderBy(asc(item.category), asc(item.name))
	]);

	return { user, pkg: p, pkgItems, allItems };
};

export const actions: Actions = {
	updateMeta: async ({ request, params }) => {
		const form = await request.formData();
		const name = form.get('name')?.toString() ?? '';
		const description = form.get('description')?.toString() || null;
		const priceFromZl = Number(form.get('priceFromZl') ?? '0');
		const priceToZlRaw = form.get('priceToZl')?.toString() ?? '';
		const priceToZl = priceToZlRaw ? Number(priceToZlRaw) : null;
		const minGuests = Number(form.get('minGuests') ?? '0') || null;
		const maxGuests = Number(form.get('maxGuests') ?? '0') || null;
		const areaM2 = Number(form.get('areaM2') ?? '0') || null;
		const setupMinutes = Number(form.get('setupMinutes') ?? '0') || null;
		const includesDelivery = form.get('includesDelivery') === 'on';
		const includesInstall = form.get('includesInstall') === 'on';
		const active = form.get('active') === 'on';
		await db
			.update(pkg)
			.set({
				name,
				description,
				priceFromCents: Math.round(priceFromZl * 100),
				priceToCents: priceToZl !== null ? Math.round(priceToZl * 100) : null,
				minGuests,
				maxGuests,
				areaM2,
				setupMinutes,
				includesDelivery,
				includesInstall,
				active,
				updatedAt: new Date()
			})
			.where(eq(pkg.id, params.id));
		return { success: true };
	},

	addItem: async ({ request, params }) => {
		const form = await request.formData();
		const itemId = form.get('itemId')?.toString() || null;
		const customLabel = form.get('customLabel')?.toString() || null;
		const quantity = Number(form.get('quantity') ?? '1');
		if (!itemId && !customLabel) return fail(400, { error: 'itemId lub customLabel' });
		const [max] = await db
			.select({ s: pkgItem.sortOrder })
			.from(pkgItem)
			.where(eq(pkgItem.packageId, params.id))
			.orderBy(asc(pkgItem.sortOrder));
		const nextSort = (max?.s ?? 0) + 10;
		await db.insert(pkgItem).values({
			packageId: params.id,
			itemId,
			customLabel,
			quantity,
			sortOrder: nextSort
		});
		return { success: true };
	},

	updateItem: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id')?.toString();
		const quantity = Number(form.get('quantity') ?? '1');
		if (!id || quantity < 0) return fail(400);
		await db.update(pkgItem).set({ quantity }).where(eq(pkgItem.id, id));
		return { success: true };
	},

	removeItem: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id')?.toString();
		if (!id) return fail(400);
		await db.delete(pkgItem).where(eq(pkgItem.id, id));
		return { success: true };
	}
};
