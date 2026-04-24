import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pkg, item, stockMovement, booking } from '$lib/server/db/schema';
import { asc, desc, eq, isNull } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { redirect } from '@sveltejs/kit';

const ITEM_PHOTO_DIR = 'static/uploads/items';
const ITEM_PHOTO_MAX = 8 * 1024 * 1024; // 8 MB
const ITEM_PHOTO_EXT_RE = /^(jpg|jpeg|png|webp|gif)$/i;

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};
	const isAdmin = me.role === 'admin';

	// Non-admin: przekieruj na dashboard — magazyn tylko dla admin
	if (!isAdmin) throw redirect(303, '/dashboard');

	const [packages, items, movements] = await Promise.all([
		db.select().from(pkg).orderBy(asc(pkg.sortOrder)),
		db
			.select()
			.from(item)
			.where(isNull(item.archivedAt))
			.orderBy(asc(item.category), asc(item.name)),
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

	return { user: me, isAdmin, packages, items, movements, stats: { belowMin, atMin } };
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

	updateItem: async ({ request, locals }) => {
		const form = await request.formData();
		const id = form.get('id')?.toString();
		if (!id) return fail(400, { error: 'missing id' });
		const name = form.get('name')?.toString() ?? '';
		const sku = form.get('sku')?.toString() || null;
		const sizeLabel = form.get('sizeLabel')?.toString() || null;
		const color = form.get('color')?.toString() || null;
		const minQty = Number(form.get('minQty') ?? '0');
		const priceZl = Number(form.get('priceZl') ?? '0');

		// Stan magazynowy: oldQty + newQty → różnica idzie jako korekta stockMovement
		const oldQty = Number(form.get('oldQty') ?? '0');
		const newQty = Number(form.get('totalQty') ?? oldQty);
		const qtyDiff = newQty - oldQty;

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

		// Jeśli user zmienił stan magazynowy ręcznie — wystaw korektę stockMovement
		// (trigger w DB zaktualizuje tent.total_qty)
		if (qtyDiff !== 0) {
			await db.insert(stockMovement).values({
				itemId: id,
				direction: qtyDiff > 0 ? 'IN' : 'OUT',
				kind: qtyDiff > 0 ? 'korekta_plus' : 'korekta_minus',
				qty: Math.abs(qtyDiff),
				reason: `Korekta ręczna z magazynu: ${oldQty} → ${newQty}`,
				createdBy: locals.user?.id ?? null
			});
		}
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
	},

	// Soft delete — ukryj pozycję z listy (archivedAt=now). Zachowuje historię ruchów.
	archiveItem: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id')?.toString();
		if (!id) return fail(400);
		await db
			.update(item)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(eq(item.id, id));
		return { success: true };
	},

	// Upload zdjęcia per item (główne zdjęcie do PDF hero + listy)
	uploadItemPhoto: async ({ request }) => {
		const form = await request.formData();
		const itemId = form.get('itemId')?.toString();
		const file = form.get('file');

		if (!itemId) return fail(400, { error: 'Brak itemId' });
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Brak pliku' });
		}
		if (file.size > ITEM_PHOTO_MAX) {
			return fail(400, { error: 'Plik za duży (max 8 MB)' });
		}
		if (!file.type.startsWith('image/')) {
			return fail(400, { error: 'Tylko obrazy' });
		}
		const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
		if (!ITEM_PHOTO_EXT_RE.test(ext)) {
			return fail(400, { error: 'Nieprawidłowe rozszerzenie' });
		}

		await mkdir(ITEM_PHOTO_DIR, { recursive: true });
		const filename = `${itemId}-${Date.now()}.${ext}`;
		const fullPath = join(ITEM_PHOTO_DIR, filename);
		const bytes = new Uint8Array(await file.arrayBuffer());
		await writeFile(fullPath, bytes);

		const publicUrl = `/uploads/items/${filename}`;
		await db
			.update(item)
			.set({ mainPhotoUrl: publicUrl, updatedAt: new Date() })
			.where(eq(item.id, itemId));

		return { success: true, url: publicUrl };
	},

	// Usuń zdjęcie (czyści main_photo_url, plik zostaje na dysku jako historia)
	removeItemPhoto: async ({ request }) => {
		const form = await request.formData();
		const itemId = form.get('itemId')?.toString();
		if (!itemId) return fail(400);
		await db
			.update(item)
			.set({ mainPhotoUrl: null, updatedAt: new Date() })
			.where(eq(item.id, itemId));
		return { success: true };
	}
};
