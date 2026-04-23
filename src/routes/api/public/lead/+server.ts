import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lead } from '$lib/server/db/schema';
import { getTemplate, renderTemplate, sendEmail } from '$lib/server/email';

/**
 * Public endpoint dla formularza na wolnynamiot.pl.
 *
 * POST /api/public/lead
 * Body: { name, email, phone?, eventName?, eventDateHint?, guestsCount?, venueHint?, message?, source? }
 *
 * Flow:
 * 1. INSERT do lead (status=new)
 * 2. Auto "thank_you" email → klient
 * 3. Response: { ok: true, id }
 *
 * CORS: otwarte dla wolnynamiot.pl + localhost (dev). Produkcja: dodać origin whitelist.
 */

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const POST: RequestHandler = async ({ request }) => {
	const data = await request.json().catch(() => null);
	if (!data || typeof data !== 'object') {
		return json({ ok: false, error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS });
	}

	const name = typeof data.name === 'string' ? data.name.trim() : '';
	const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
	const phone = typeof data.phone === 'string' ? data.phone.trim() : null;
	const eventName = typeof data.eventName === 'string' ? data.eventName.trim() : null;
	const eventDateHint = typeof data.eventDateHint === 'string' ? data.eventDateHint : null;
	const guestsCount = typeof data.guestsCount === 'number' ? data.guestsCount : null;
	const venueHint = typeof data.venueHint === 'string' ? data.venueHint : null;
	const message = typeof data.message === 'string' ? data.message.trim() : null;
	const source = typeof data.source === 'string' ? data.source : 'website';

	// Walidacja — email + name są must
	if (!name || !email) {
		return json(
			{ ok: false, error: 'Wymagane: name, email' },
			{ status: 400, headers: CORS_HEADERS }
		);
	}
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return json(
			{ ok: false, error: 'Nieprawidłowy email' },
			{ status: 400, headers: CORS_HEADERS }
		);
	}
	// Spam check — max 200 znaków message, max 50 email
	if (email.length > 120 || name.length > 120 || (message && message.length > 2000)) {
		return json({ ok: false, error: 'Za długie pole' }, { status: 400, headers: CORS_HEADERS });
	}

	// Insert lead
	const [created] = await db
		.insert(lead)
		.values({
			name,
			email,
			phone,
			eventName,
			eventDateHint,
			guestsCount,
			venueHint,
			message,
			source,
			status: 'new'
		})
		.returning();

	// Auto thank-you email
	const template = await getTemplate('thank_you');
	if (template && email) {
		const subject = renderTemplate(template.subject, { clientName: name, eventName: eventName ?? 'event' });
		const body = renderTemplate(template.body, {
			clientName: name,
			eventName: eventName ?? 'event'
		});
		await sendEmail({
			to: email,
			subject,
			body,
			leadId: created.id,
			template: 'thank_you'
		});
	}

	return json(
		{ ok: true, id: created.id, message: 'Zapisano zgłoszenie, odezwiemy się wkrótce!' },
		{ status: 201, headers: CORS_HEADERS }
	);
};
