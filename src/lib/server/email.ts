/**
 * Email sender — Resend integration z fallback do console log.
 * Używa template z app_setting.email_templates (JSONB).
 *
 * ENV:
 *   RESEND_API_KEY — jeśli nie ustawione, emaile tylko logowane do console
 *   RESEND_FROM — nadawca (default: biuro@wolnynamiot.pl)
 */
import { db } from './db';
import { appSetting, emailLog } from './db/schema';
import { eq } from 'drizzle-orm';

export type EmailTemplateKey =
	| 'thank_you'
	| 'offer_sent'
	| 'booking_confirmed'
	| 'event_reminder';

export type EmailTemplate = {
	name: string;
	subject: string;
	body: string;
};

/**
 * Pobierz template z settings (lub null jeśli brak)
 */
export async function getTemplate(key: EmailTemplateKey): Promise<EmailTemplate | null> {
	const [row] = await db
		.select()
		.from(appSetting)
		.where(eq(appSetting.key, 'email_templates'))
		.limit(1);
	if (!row) return null;
	const templates = row.value as Record<EmailTemplateKey, EmailTemplate>;
	return templates[key] ?? null;
}

/**
 * Zastąp placeholders {{key}} wartościami z context
 */
export function renderTemplate(template: string, context: Record<string, string | number | null | undefined>): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
		const val = context[key];
		return val == null ? '' : String(val);
	});
}

/**
 * Pobierz company info dla From + stopka
 */
export async function getCompanyInfo() {
	const [row] = await db
		.select()
		.from(appSetting)
		.where(eq(appSetting.key, 'company'))
		.limit(1);
	return (row?.value ?? {}) as {
		name?: string;
		email?: string;
		phone?: string;
		website?: string;
	};
}

/**
 * Wyślij email.
 * Z RESEND_API_KEY: prawdziwa wysyłka + log do email_log.
 * Bez: console.log + log do email_log ze status='dev-mode'.
 */
export async function sendEmail(params: {
	to: string;
	subject: string;
	body: string; // plain text, auto-konwertuje do HTML
	offerId?: string;
	leadId?: string;
	template?: string;
}) {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.RESEND_FROM ?? 'biuro@wolnynamiot.pl';

	// Konwersja plain text → prosty HTML (z paragrafami)
	const html = params.body
		.split('\n\n')
		.map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
		.join('');

	if (!apiKey) {
		console.log('📧 [DEV MODE — brak RESEND_API_KEY] email NIE wysłany, tylko log:');
		console.log('  → TO:', params.to);
		console.log('  → SUBJECT:', params.subject);
		console.log('  → BODY:', params.body.slice(0, 200) + '...');

		// Log do DB
		await db.insert(emailLog).values({
			resendId: null,
			toEmail: params.to,
			subject: params.subject,
			template: params.template ?? null,
			offerId: params.offerId ?? null,
			leadId: params.leadId ?? null,
			status: 'queued', // w DEV: queued ale nie sent
			sentAt: null
		});
		return { ok: true, dev: true };
	}

	// Resend API call
	try {
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from,
				to: params.to,
				subject: params.subject,
				html,
				text: params.body
			})
		});
		const data = await res.json();
		if (!res.ok) throw new Error(data.message ?? 'Resend API error');

		await db.insert(emailLog).values({
			resendId: data.id,
			toEmail: params.to,
			subject: params.subject,
			template: params.template ?? null,
			offerId: params.offerId ?? null,
			leadId: params.leadId ?? null,
			status: 'sent',
			sentAt: new Date()
		});
		return { ok: true, resendId: data.id };
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		await db.insert(emailLog).values({
			resendId: null,
			toEmail: params.to,
			subject: params.subject,
			template: params.template ?? null,
			offerId: params.offerId ?? null,
			leadId: params.leadId ?? null,
			status: 'failed',
			errorMessage: msg
		});
		return { ok: false, error: msg };
	}
}
