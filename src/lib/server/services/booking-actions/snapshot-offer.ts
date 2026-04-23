import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db } from '$lib/server/db';
import {
	offer,
	offerItem,
	client,
	item,
	appSetting,
	offerDocument
} from '$lib/server/db/schema';
import { parseCompoundId } from '$lib/compound-id';

/**
 * Snapshot oferty — migawka stanu w `offer_document`.
 *
 * Trigger: klik "📸 Zrób snapshot" w detailu oferty (admin).
 * Zapisuje JSON {offer, items, client, primaryTent, company, totals}
 * żeby po edycji oferty widzieć CO klient dostał.
 *
 * Po snapshot statusie oferty `draft` ustawia się `sent` + `sent_at = now()`.
 * Jeśli offer już jest w innym statusie (accepted/sent/itp), status nie
 * zmienia się — snapshot to dodatkowa wersja.
 */
export async function snapshotOffer(event: RequestEvent) {
	const parsed = parseCompoundId(event.params.compoundId!);
	if (!parsed.ok || parsed.type !== 'offer') {
		return fail(400, { error: 'Snapshot dostępny tylko dla oferty' });
	}
	const offerId = parsed.id;

	// 1. Pobierz offer + client
	const [row] = await db
		.select({
			offer,
			client
		})
		.from(offer)
		.leftJoin(client, eq(client.id, offer.clientId))
		.where(eq(offer.id, offerId))
		.limit(1);
	if (!row) return fail(404, { error: 'Oferta nie istnieje' });
	const { offer: o, client: c } = row;

	// 2. Items + dociąganie namiotów (primary tent)
	const items = await db.select().from(offerItem).where(eq(offerItem.offerId, offerId));
	const tentItems = items.filter((i) => i.tentId);
	let primaryTent: Record<string, unknown> | null = null;
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
		const namiot = tents.find((t) => t.category === 'Namioty') ?? tents[0];
		if (namiot) {
			const qty = tentItems.find((ti) => ti.tentId === namiot.id)?.quantity ?? 1;
			let photoUrl = namiot.mainPhotoUrl;
			if (!photoUrl) {
				const hex = namiot.id.replace(/-/g, '').slice(0, 2);
				const n = (parseInt(hex, 16) % 14) + 1;
				photoUrl = `/photos/namiot-${n}.webp`;
			}
			primaryTent = { ...namiot, mainPhotoUrl: photoUrl, qty };
		}
	}

	// 3. Company settings
	const [companyRow] = await db
		.select()
		.from(appSetting)
		.where(eq(appSetting.key, 'company'))
		.limit(1);
	const company = (companyRow?.value ?? {}) as Record<string, unknown>;

	// 4. QR code — z numerem i wersja (dodamy po insert)
	const wwwHost = ((company.www as string) ?? 'wolnynamiot.pl').replace(/^https?:\/\//, '');

	// 5. Form — optional note
	const form = await event.request.formData();
	const note = form.get('note')?.toString() || null;
	const sentToEmail = form.get('sentToEmail')?.toString() || c?.email || null;

	// 6. Insert snapshot
	const snapshot = {
		version: 1,
		capturedAt: new Date().toISOString(),
		offer: {
			id: o.id,
			number: o.number,
			eventName: o.eventName,
			eventStartDate: o.eventStartDate,
			eventEndDate: o.eventEndDate,
			venue: o.venue,
			totalCents: o.totalCents,
			validUntil: o.validUntil,
			notes: o.notes,
			status: o.status
		},
		client: c
			? { id: c.id, name: c.name, company: c.company, phone: c.phone, email: c.email, address: c.address }
			: null,
		items: items.map((i) => ({
			tentId: i.tentId,
			description: i.description,
			quantity: i.quantity,
			unitPriceCents: i.unitPriceCents,
			lineTotalCents: i.lineTotalCents
		})),
		primaryTent,
		company
	};

	const [doc] = await db
		.insert(offerDocument)
		.values({
			offerId,
			snapshot,
			note,
			sentToEmail,
			createdBy: event.locals.user?.id ?? null
		})
		.returning({ id: offerDocument.id });

	// 7. QR z trackable version linkiem → zapisz w snapshot (update)
	const qrTargetUrl = `https://${wwwHost}/?oferta=${encodeURIComponent(o.number)}&v=${doc.id}`;
	try {
		const qrSvg = await QRCode.toString(qrTargetUrl, {
			type: 'svg',
			errorCorrectionLevel: 'M',
			margin: 0,
			width: 180
		});
		(snapshot as Record<string, unknown>).qrSvg = qrSvg;
		(snapshot as Record<string, unknown>).qrTargetUrl = qrTargetUrl;
		await db
			.update(offerDocument)
			.set({ snapshot })
			.where(eq(offerDocument.id, doc.id));
	} catch {
		// jeśli QR fail — zostawia snapshot bez QR (live PDF view nadal zadziała)
	}

	// 8. Status — jeśli draft → sent
	if (o.status === 'draft') {
		await db
			.update(offer)
			.set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() })
			.where(eq(offer.id, offerId));
	}

	// Redirect → detail oferty z info o snapshocie
	throw redirect(303, `/zlecenia/${event.params.compoundId}?snapshot=${doc.id}`);
}
