import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { offer, offerItem, client, item, appSetting, offerDocument } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import QRCode from 'qrcode';

// Shared types — live i snapshot branche zwracają TEN SAM kształt (snapshot to serializowany kadr live).
type CompanySettings = Partial<{
	tradeName: string;
	legalName: string;
	address: string;
	email: string;
	phone: string;
	www: string;
}>;
type PrimaryTent = {
	id: string;
	name: string;
	sizeLabel: string | null;
	widthM: number | null;
	lengthM: number | null;
	mainPhotoUrl: string | null;
	category: string | null;
	qty: number;
} | null;
type OfferShape = {
	id: string;
	number: string;
	eventName: string | null;
	eventStartDate: string | null;
	eventEndDate: string | null;
	venue: string | null;
	totalCents: number;
	validUntil: string | null;
	status: string;
	sentAt: Date | null;
	viewedAt: Date | null;
	acceptedAt: Date | null;
	notes: string | null;
	createdAt: Date;
	clientId: string | null;
	clientName: string | null;
	clientCompany: string | null;
	clientPhone: string | null;
	clientEmail: string | null;
	clientAddress: string | null;
};
type OfferItemShape = {
	id: string;
	offerId: string;
	tentId: string | null;
	description: string;
	quantity: number;
	unitPriceCents: number;
	lineTotalCents: number;
};

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
		const offerShaped: OfferShape = {
			id: (snapOffer.id as string) ?? params.id,
			number: (snapOffer.number as string) ?? '?',
			eventName: (snapOffer.eventName as string | null) ?? null,
			eventStartDate: (snapOffer.eventStartDate as string | null) ?? null,
			eventEndDate: (snapOffer.eventEndDate as string | null) ?? null,
			venue: (snapOffer.venue as string | null) ?? null,
			totalCents: (snapOffer.totalCents as number) ?? 0,
			validUntil: (snapOffer.validUntil as string | null) ?? null,
			status: (snapOffer.status as string) ?? 'draft',
			sentAt: doc.sentAt,
			viewedAt: null,
			acceptedAt: null,
			notes: (snapOffer.notes as string | null) ?? null,
			createdAt: doc.createdAt,
			clientId: (snapClient.id as string | null) ?? null,
			clientName: (snapClient.name as string | null) ?? null,
			clientCompany: (snapClient.company as string | null) ?? null,
			clientPhone: (snapClient.phone as string | null) ?? null,
			clientEmail: (snapClient.email as string | null) ?? null,
			clientAddress: (snapClient.address as string | null) ?? null
		};
		return {
			user,
			offer: offerShaped,
			items: ((snap.items as unknown[]) ?? []) as OfferItemShape[],
			primaryTent: (snap.primaryTent ?? null) as PrimaryTent,
			company: (snap.company ?? {}) as CompanySettings,
			qrSvg: (snap.qrSvg ?? '') as string,
			qrTargetUrl: (snap.qrTargetUrl ?? '') as string,
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
	let primaryTent: PrimaryTent = null;

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
	const company = (companySetting?.value ?? {}) as CompanySettings;

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
