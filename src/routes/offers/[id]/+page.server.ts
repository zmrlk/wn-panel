import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { offer, offerItem, client, item, appSetting, offerDocument } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import QRCode from 'qrcode';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	// ═══ SNAPSHOT MODE: jeśli ?version=<id> → renderuj z offer_document ═══
	const versionId = url.searchParams.get('version');
	if (versionId) {
		const [doc] = await db
			.select()
			.from(offerDocument)
			.where(eq(offerDocument.id, versionId))
			.limit(1);
		if (!doc) throw error(404, { message: 'Snapshot nie istnieje' });
		if (doc.offerId !== params.id) throw error(400, { message: 'Snapshot należy do innej oferty' });

		const snap = doc.snapshot as Record<string, unknown>;
		const snapOffer = (snap.offer ?? {}) as Record<string, unknown>;
		const snapClient = (snap.client ?? {}) as Record<string, unknown>;
		return {
			user,
			offer: {
				id: snapOffer.id ?? params.id,
				number: snapOffer.number ?? '?',
				eventName: snapOffer.eventName,
				eventStartDate: snapOffer.eventStartDate,
				eventEndDate: snapOffer.eventEndDate,
				venue: snapOffer.venue,
				totalCents: snapOffer.totalCents,
				validUntil: snapOffer.validUntil,
				status: snapOffer.status,
				sentAt: doc.sentAt,
				viewedAt: null,
				acceptedAt: null,
				notes: snapOffer.notes,
				createdAt: doc.createdAt,
				clientId: snapClient.id ?? null,
				clientName: snapClient.name ?? null,
				clientCompany: snapClient.company ?? null,
				clientPhone: snapClient.phone ?? null,
				clientEmail: snapClient.email ?? null,
				clientAddress: snapClient.address ?? null
			},
			items: (snap.items as unknown[]) ?? [],
			primaryTent: snap.primaryTent ?? null,
			company: snap.company ?? {},
			qrSvg: snap.qrSvg ?? '',
			qrTargetUrl: snap.qrTargetUrl ?? '',
			snapshotInfo: {
				id: doc.id,
				capturedAt: doc.createdAt,
				note: doc.note,
				sentToEmail: doc.sentToEmail
			}
		};
	}

	const [o] = await db
		.select({
			id: offer.id,
			number: offer.number,
			eventName: offer.eventName,
			eventStartDate: offer.eventStartDate,
			eventEndDate: offer.eventEndDate,
			venue: offer.venue,
			totalCents: offer.totalCents,
			validUntil: offer.validUntil,
			status: offer.status,
			sentAt: offer.sentAt,
			viewedAt: offer.viewedAt,
			acceptedAt: offer.acceptedAt,
			notes: offer.notes,
			createdAt: offer.createdAt,
			clientId: offer.clientId,
			clientName: client.name,
			clientCompany: client.company,
			clientPhone: client.phone,
			clientEmail: client.email,
			clientAddress: client.address
		})
		.from(offer)
		.leftJoin(client, eq(offer.clientId, client.id))
		.where(eq(offer.id, params.id))
		.limit(1);

	if (!o) throw error(404, { message: 'Oferta nie istnieje' });

	const items = await db.select().from(offerItem).where(eq(offerItem.offerId, params.id));

	// Primary tent — hero dla cover: pierwszy namiot z magazynu w ofercie
	let primaryTent: {
		id: string;
		name: string;
		sizeLabel: string | null;
		widthM: number | null;
		lengthM: number | null;
		mainPhotoUrl: string | null;
		category: string | null;
		qty: number;
	} | null = null;

	const tentItems = items.filter((i) => i.tentId);
	if (tentItems.length > 0) {
		const tentIds = tentItems.map((t) => t.tentId!);
		const tents = await db
			.select({
				id: item.id,
				name: item.name,
				sizeLabel: item.sizeLabel,
				widthM: item.widthM,
				lengthM: item.lengthM,
				mainPhotoUrl: item.mainPhotoUrl,
				category: item.category
			})
			.from(item)
			.where(inArray(item.id, tentIds));

		// Preferuj kategorię "Namioty", fallback: pierwszy
		const namiot = tents.find((t) => t.category === 'Namioty') ?? tents[0];
		if (namiot) {
			const qty = tentItems.find((ti) => ti.tentId === namiot.id)?.quantity ?? 1;
			// Fallback photo — deterministyczny z id (żeby ten sam namiot zawsze miał to samo zdjęcie w ofertach)
			let photoUrl = namiot.mainPhotoUrl;
			if (!photoUrl) {
				const hex = namiot.id.replace(/-/g, '').slice(0, 2);
				const n = (parseInt(hex, 16) % 14) + 1;
				photoUrl = `/photos/namiot-${n}.webp`;
			}
			primaryTent = { ...namiot, mainPhotoUrl: photoUrl, qty };
		}
	}

	// Company settings — dane firmy do stopki + kontaktu
	const [companySetting] = await db
		.select()
		.from(appSetting)
		.where(eq(appSetting.key, 'company'))
		.limit(1);
	const company = (companySetting?.value ?? {}) as Partial<{
		tradeName: string;
		legalName: string;
		address: string;
		email: string;
		phone: string;
		www: string;
	}>;

	// QR code → link do strony firmy z numerem oferty (trackable)
	const wwwHost = (company.www ?? 'wolnynamiot.pl').replace(/^https?:\/\//, '');
	const qrTargetUrl = `https://${wwwHost}/?oferta=${encodeURIComponent(o.number)}`;
	const qrSvg = await QRCode.toString(qrTargetUrl, {
		type: 'svg',
		errorCorrectionLevel: 'M',
		margin: 0,
		width: 180
	});

	return { user, offer: o, items, primaryTent, company, qrSvg, qrTargetUrl };
};
