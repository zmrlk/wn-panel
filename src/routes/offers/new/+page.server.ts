import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pkg, pkgItem, item, client, offer, offerItem, lead, appSetting } from '$lib/server/db/schema';
import { asc, sql, eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	const [packages, packageItems, items, clients] = await Promise.all([
		db.select().from(pkg).where(eq(pkg.active, true)).orderBy(asc(pkg.sortOrder)),
		db
			.select({
				packageId: pkgItem.packageId,
				itemId: pkgItem.itemId,
				customLabel: pkgItem.customLabel,
				quantity: pkgItem.quantity,
				itemName: item.name,
				itemPriceCents: item.pricePerDayCents
			})
			.from(pkgItem)
			.leftJoin(item, eq(pkgItem.itemId, item.id)),
		db.select().from(item).orderBy(asc(item.category), asc(item.name)),
		db.select().from(client).orderBy(asc(client.name))
	]);

	// Prefill z leadId (jeśli user przyszedł z /zlecenia/lead-X "+ Oferta z leada")
	let prefill: {
		leadId?: string;
		clientName?: string;
		clientPhone?: string;
		clientEmail?: string;
		eventName?: string;
		eventStartDate?: string;
		eventEndDate?: string;
		venue?: string;
		notes?: string;
		guestsCount?: number | null;
	} | null = null;

	const leadId = url.searchParams.get('leadId');
	if (leadId) {
		const [l] = await db.select().from(lead).where(eq(lead.id, leadId)).limit(1);
		if (l) {
			prefill = {
				leadId: l.id,
				clientName: l.name,
				clientPhone: l.phone ?? undefined,
				clientEmail: l.email ?? undefined,
				eventName: l.eventName ?? '',
				eventStartDate: l.eventDateHint ?? '',
				eventEndDate: l.eventDateHint ?? '',
				venue: l.venueHint ?? '',
				notes: l.message ? `Z leada: ${l.message}` : '',
				guestsCount: l.guestsCount
			};
		}
	}

	return { user, isAdmin: (user?.role ?? 'admin') === 'admin', packages, packageItems, items, clients, prefill };
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

		// Numeracja z app_setting.offers (konfigurowane w /settings)
		const [offersSetting] = await db
			.select()
			.from(appSetting)
			.where(eq(appSetting.key, 'offers'))
			.limit(1);
		const cfg = (offersSetting?.value ?? {}) as {
			prefix?: string;
			year?: number;
			nextNumber?: number;
		};
		const prefix = cfg.prefix ?? 'OFF';
		const year = cfg.year ?? new Date().getFullYear();
		const nextNum = Math.max(1, cfg.nextNumber ?? 1);
		const number = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;

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

		const leadIdFromForm = form.get('leadId')?.toString() || null;

		// Insert offer (link do leada jeśli z leadId)
		const [created] = await db
			.insert(offer)
			.values({
				number,
				leadId: leadIdFromForm,
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

		// Inkrementuj nextNumber w settings (żeby następna oferta miała +1)
		await db
			.update(appSetting)
			.set({
				value: { ...cfg, prefix, year, nextNumber: nextNum + 1, validDays: cfg.validDays ?? 14 },
				updatedAt: new Date()
			})
			.where(eq(appSetting.key, 'offers'));

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

		// Jeśli z leada → auto-set lead.status = 'quoted' + link convertedToClientId
		if (leadIdFromForm) {
			await db
				.update(lead)
				.set({
					status: 'quoted',
					convertedToClientId: resolvedClientId,
					updatedAt: new Date()
				})
				.where(eq(lead.id, leadIdFromForm));
		}

		// Redirect do detail oferty (żeby user widział PDF od razu)
		throw redirect(303, `/zlecenia/offer-${created.id}`);
	}
};
