import { fail, type RequestEvent } from '@sveltejs/kit';
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
 * Wyślij ofertę email (tylko dla type=offer).
 *
 * Flow:
 * 1. Pobierz ofertę + klienta + items + primary tent + company
 * 2. Snapshot stanu → offer_document (taki sam jak snapshot-offer.ts)
 * 3. Wyrenderuj template offer_sent z linkiem do snapshot wersji
 * 4. sendEmail (Resend albo dev console fallback) — zaloguj resendId do snapshot
 * 5. Update offer.status='sent' + sentAt
 *
 * Dev mode (brak RESEND_API_KEY): sendEmail loguje do console + email_log.
 * Prod mode: prawdziwy send przez Resend API.
 */
export async function sendOfferEmail(event: RequestEvent) {
	const { getTemplate, renderTemplate, sendEmail } = await import('$lib/server/email');

	const parsed = parseCompoundId(event.params.compoundId!);
	if (!parsed.ok || parsed.type !== 'offer') {
		return fail(400, { error: 'Tylko dla ofert' });
	}
	const { id: offerId } = parsed;

	// 1. Pobierz pełen kontekst
	const [row] = await db
		.select({ offer, client })
		.from(offer)
		.leftJoin(client, eq(client.id, offer.clientId))
		.where(eq(offer.id, offerId))
		.limit(1);
	if (!row) return fail(404);
	const { offer: o, client: c } = row;
	if (!c?.email) return fail(400, { error: 'Klient nie ma emaila' });

	const items = await db.select().from(offerItem).where(eq(offerItem.offerId, offerId));

	// Primary tent (z fallback photo)
	let primaryTent: Record<string, unknown> | null = null;
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

	const [companyRow] = await db
		.select()
		.from(appSetting)
		.where(eq(appSetting.key, 'company'))
		.limit(1);
	const company = (companyRow?.value ?? {}) as Record<string, unknown>;

	// 2. Insert snapshot (bez QR jeszcze — QR potrzebuje doc.id)
	const baseSnapshot = {
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
		client: { id: c.id, name: c.name, company: c.company, phone: c.phone, email: c.email, address: c.address },
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
			snapshot: baseSnapshot,
			note: 'Snapshot przy wysłaniu emaila',
			sentToEmail: c.email,
			createdBy: event.locals.user?.id ?? null
		})
		.returning({ id: offerDocument.id });

	// 3. Generuj QR + zapisz pełny snapshot
	const wwwHost = ((company.www as string) ?? 'wolnynamiot.pl').replace(/^https?:\/\//, '');
	const offerLink = `${event.url.origin}/offers/${offerId}?version=${doc.id}`;
	const qrTargetUrl = `https://${wwwHost}/?oferta=${encodeURIComponent(o.number)}&v=${doc.id}`;
	try {
		const qrSvg = await QRCode.toString(qrTargetUrl, {
			type: 'svg',
			errorCorrectionLevel: 'M',
			margin: 0,
			width: 180
		});
		const fullSnapshot = { ...baseSnapshot, qrSvg, qrTargetUrl };
		await db.update(offerDocument).set({ snapshot: fullSnapshot }).where(eq(offerDocument.id, doc.id));
	} catch {
		// jeśli QR fail — snapshot zostaje bez QR, mail i tak idzie
	}

	// 4. Render + send
	const template = await getTemplate('offer_sent');
	if (!template) return fail(500, { error: 'Brak szablonu offer_sent' });

	const totalZl = (o.totalCents / 100).toLocaleString('pl-PL', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});
	const dateRange =
		o.eventStartDate === o.eventEndDate
			? o.eventStartDate
			: `${o.eventStartDate} – ${o.eventEndDate}`;

	const ctx = {
		clientName: c.name ?? '',
		eventName: o.eventName,
		eventDateRange: dateRange,
		offerNumber: o.number,
		totalValue: `${totalZl} zł`,
		offerLink,
		validUntil: o.validUntil ?? ''
	};

	// 4a. Generuj PDF renderując istniejącą stronę /offers/[id]?version=... przez Gotenberg.
	// Auth bypass przez HMAC print token (5 min TTL, verified w hooks.server.ts).
	// Fail-soft: jeśli Gotenberg down, email leci bez załącznika.
	let pdfAttachment: { filename: string; content: string; contentType: string } | null = null;
	try {
		const { urlToPdf } = await import('$lib/server/pdf');
		const { buildPrintToken } = await import('$lib/server/internal-token');
		const printToken = buildPrintToken(offerId, doc.id);
		// Internal URL — używamy LAN IP (nie app:3000) bo Chromium HTTPS-First upgrade
		// próbuje https://app → ERR_SSL_PROTOCOL_ERROR. Na IP adresach upgrade jest off.
		const internalBase = process.env.INTERNAL_APP_URL ?? 'http://192.168.3.142:3000';
		const printUrl = `${internalBase}/offers/${offerId}?version=${doc.id}`;
		const pdfBuf = await urlToPdf(printUrl, {
			extraHttpHeaders: { 'x-internal-print-token': printToken },
			waitDelayMs: 800 // daj czas na font load + QR render
		});
		pdfAttachment = {
			filename: `oferta-${o.number}.pdf`,
			content: pdfBuf.toString('base64'),
			contentType: 'application/pdf'
		};
	} catch (err) {
		console.warn('[send-offer] PDF generation failed, sending email without attachment:', err);
	}

	const result = await sendEmail({
		to: c.email,
		subject: renderTemplate(template.subject, ctx),
		body: renderTemplate(template.body, ctx),
		offerId,
		template: 'offer_sent',
		attachments: pdfAttachment ? [pdfAttachment] : undefined
	});

	// Zaloguj resendId do snapshotu (po wysłaniu)
	if ('resendId' in result && result.resendId) {
		await db
			.update(offerDocument)
			.set({ resendId: result.resendId, sentAt: new Date() })
			.where(eq(offerDocument.id, doc.id));
	} else {
		await db
			.update(offerDocument)
			.set({ sentAt: new Date() })
			.where(eq(offerDocument.id, doc.id));
	}

	// 5. Update offer status (jeśli draft → sent)
	if (o.status === 'draft' || o.status === 'viewed') {
		await db
			.update(offer)
			.set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() })
			.where(eq(offer.id, offerId));
	}

	return {
		success: true,
		dev: 'dev' in result ? result.dev : false,
		snapshotId: doc.id,
		offerLink
	};
}
