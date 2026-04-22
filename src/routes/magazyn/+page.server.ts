import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pkg, item, stockMovement, booking } from '$lib/server/db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	const [packages, items, movements] = await Promise.all([
		db.select().from(pkg).orderBy(asc(pkg.sortOrder)),
		db.select().from(item).orderBy(asc(item.category), asc(item.name)),
		db
			.select({
				id: stockMovement.id,
				itemId: stockMovement.itemId,
				itemName: item.name,
				itemSku: item.sku,
				direction: stockMovement.direction,
				kind: stockMovement.kind,
				qty: stockMovement.qty,
				priceCents: stockMovement.priceCents,
				bookingId: stockMovement.bookingId,
				bookingEvent: booking.eventName,
				reason: stockMovement.reason,
				notes: stockMovement.notes,
				createdAt: stockMovement.createdAt
			})
			.from(stockMovement)
			.leftJoin(item, eq(stockMovement.itemId, item.id))
			.leftJoin(booking, eq(stockMovement.bookingId, booking.id))
			.orderBy(desc(stockMovement.createdAt))
			.limit(50)
	]);

	// Alerts (poniżej min)
	const belowMin = items.filter((i) => i.totalQty < i.minQty).length;
	const atMin = items.filter((i) => i.totalQty === i.minQty && i.minQty > 0).length;

	return { user, packages, items, movements, stats: { belowMin, atMin } };
};

export const actions: Actions = {
	updatePackage: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id')?.toString();
		if (!id) return fail(400, { error: 'missing id' });
		const name = form.get('name')?.toString() ?? '';
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
			.where(eq(pkg.id, id));
		return { success: true };
	},

	updateItem: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id')?.toString();
		if (!id) return fail(400, { error: 'missing id' });
		const name = form.get('name')?.toString() ?? '';
		const sku = form.get('sku')?.toString() || null;
		const sizeLabel = form.get('sizeLabel')?.toString() || null;
		const color = form.get('color')?.toString() || null;
		const minQty = Number(form.get('minQty') ?? '0');
		const priceZl = Number(form.get('priceZl') ?? '0');
		await db
			.update(item)
			.set({
				name,
				sku,
				sizeLabel,
				color,
				minQty,
				pricePerDayCents: priceZl ? Math.round(priceZl * 100) : null,
				updatedAt: new Date()
			})
			.where(eq(item.id, id));
		return { success: true };
	},

	addItem: async ({ request }) => {
		const form = await request.formData();
		const name = form.get('name')?.toString() ?? '';
		const sku = form.get('sku')?.toString() || null;
		const category = form.get('category')?.toString() ?? 'Namioty';
		const sizeLabel = form.get('sizeLabel')?.toString() || null;
		const color = form.get('color')?.toString() || null;
		const qty = Number(form.get('qty') ?? '0');
		const minQty = Number(form.get('minQty') ?? '0');
		const priceZl = Number(form.get('priceZl') ?? '0');

		if (!name) return fail(400, { error: 'name required' });

		const [created] = await db
			.insert(item)
			.values({
				name,
				sku,
				category,
				itemType:
					category === 'Namioty'
						? 'tent'
						: category === 'Stoły'
							? 'table'
							: category === 'Krzesła'
								? 'chair'
								: category === 'Ławki'
									? 'bench'
									: category === 'Oświetlenie'
										? 'light'
										: 'accessory',
				sizeLabel,
				color,
				totalQty: 0, // movement wypełni
				minQty,
				pricePerDayCents: priceZl ? Math.round(priceZl * 100) : null
			})
			.returning();

		// Auto zakup movement (żeby trigger zaktualizował totalQty)
		if (qty > 0 && created) {
			await db.insert(stockMovement).values({
				itemId: created.id,
				direction: 'IN',
				kind: 'zakup',
				qty,
				reason: 'Dodano pozycję + stan początkowy'
			});
		}
		return { success: true };
	},

	addMovement: async ({ request }) => {
		const form = await request.formData();
		const itemId = form.get('itemId')?.toString();
		const direction = form.get('direction')?.toString() as 'IN' | 'OUT';
		const kind = form.get('kind')?.toString() ?? '';
		const qty = Number(form.get('qty') ?? '0');
		const reason = form.get('reason')?.toString() ?? '';
		if (!itemId || !direction || !kind || qty <= 0) return fail(400);
		await db.insert(stockMovement).values({ itemId, direction, kind, qty, reason });
		return { success: true };
	}
};
