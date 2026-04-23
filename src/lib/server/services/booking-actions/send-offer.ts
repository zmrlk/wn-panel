import { fail, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { offer, client } from '$lib/server/db/schema';
import { parseCompoundId } from '$lib/compound-id';

/**
 * Wyślij ofertę email (tylko dla type=offer).
 * Flow: pobierz ofertę + klienta → renderuj template offer_sent → wyślij
 * → update status na 'sent' + sentAt.
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

	const [row] = await db
		.select({
			number: offer.number,
			eventName: offer.eventName,
			eventStartDate: offer.eventStartDate,
			eventEndDate: offer.eventEndDate,
			totalCents: offer.totalCents,
			validUntil: offer.validUntil,
			clientName: client.name,
			clientEmail: client.email
		})
		.from(offer)
		.leftJoin(client, eq(offer.clientId, client.id))
		.where(eq(offer.id, offerId))
		.limit(1);
	if (!row) return fail(404);
	if (!row.clientEmail) return fail(400, { error: 'Klient nie ma emaila' });

	const template = await getTemplate('offer_sent');
	if (!template) return fail(500, { error: 'Brak szablonu offer_sent' });

	const totalZl = (row.totalCents / 100).toLocaleString('pl-PL', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});
	const dateRange =
		row.eventStartDate === row.eventEndDate
			? row.eventStartDate
			: `${row.eventStartDate} – ${row.eventEndDate}`;

	const ctx = {
		clientName: row.clientName ?? '',
		eventName: row.eventName,
		eventDateRange: dateRange,
		offerNumber: row.number,
		totalValue: `${totalZl} zł`,
		offerLink: `${event.url.origin}/offers/${offerId}`,
		validUntil: row.validUntil ?? ''
	};

	const result = await sendEmail({
		to: row.clientEmail,
		subject: renderTemplate(template.subject, ctx),
		body: renderTemplate(template.body, ctx),
		offerId,
		template: 'offer_sent'
	});

	await db
		.update(offer)
		.set({
			status: 'sent',
			sentAt: new Date(),
			updatedAt: new Date()
		})
		.where(eq(offer.id, offerId));

	return { success: true, dev: 'dev' in result ? result.dev : false };
}
