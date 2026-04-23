import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { pkg, pkgItem, item } from '$lib/server/db/schema';
import { asc, eq, isNull } from 'drizzle-orm';

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: RequestHandler = async () =>
	new Response(null, { status: 204, headers: CORS });

/**
 * GET /api/mcp/pricing
 * Zwraca: pakiety + items z cenami. Dla ChatGPT/Claude/Perplexity do rekomendacji.
 */
export const GET: RequestHandler = async () => {
	const [packages, items] = await Promise.all([
		db
			.select()
			.from(pkg)
			.where(eq(pkg.active, true))
			.orderBy(asc(pkg.sortOrder)),
		db
			.select()
			.from(item)
			.where(isNull(item.archivedAt))
			.orderBy(asc(item.category), asc(item.name))
	]);

	// Pobierz package_items dla każdego pakietu
	const allPkgItems = await db
		.select({
			packageId: pkgItem.packageId,
			itemId: pkgItem.itemId,
			customLabel: pkgItem.customLabel,
			quantity: pkgItem.quantity,
			itemName: item.name
		})
		.from(pkgItem)
		.leftJoin(item, eq(pkgItem.itemId, item.id));

	const itemsByPkg = new Map<string, typeof allPkgItems>();
	for (const pi of allPkgItems) {
		if (!itemsByPkg.has(pi.packageId)) itemsByPkg.set(pi.packageId, []);
		itemsByPkg.get(pi.packageId)!.push(pi);
	}

	return json(
		{
			packages: packages.map((p) => ({
				id: p.id,
				slug: p.slug,
				name: p.name,
				description: p.description,
				tier: p.tier,
				price_from_zl: p.priceFromCents / 100,
				price_to_zl: p.priceToCents ? p.priceToCents / 100 : null,
				min_guests: p.minGuests,
				max_guests: p.maxGuests,
				area_m2: p.areaM2,
				setup_minutes: p.setupMinutes,
				delivery_type: p.deliveryType,
				includes_delivery: p.includesDelivery,
				includes_install: p.includesInstall,
				includes: p.includes ?? [],
				items: (itemsByPkg.get(p.id) ?? []).map((pi) => ({
					name: pi.itemName ?? pi.customLabel ?? '—',
					quantity: pi.quantity,
					custom: !pi.itemId
				}))
			})),
			items: items.map((it) => ({
				id: it.id,
				sku: it.sku,
				name: it.name,
				category: it.category,
				size: it.sizeLabel,
				color: it.color,
				unit: it.unit,
				total_qty: it.totalQty,
				price_per_day_zl: it.pricePerDayCents ? it.pricePerDayCents / 100 : null
			})),
			updated_at: new Date().toISOString()
		},
		{ headers: CORS }
	);
};
