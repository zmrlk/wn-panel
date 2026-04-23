import { fail, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { payment } from '$lib/server/db/schema';
import { parseCompoundId } from '$lib/compound-id';

const VALID_METHODS: readonly string[] = ['gotówka', 'przelew', 'inne'];

/**
 * Add payment do bookingu (zł → cents, walidacja pozytywnej kwoty).
 */
export async function addPayment(event: RequestEvent) {
	const parsed = parseCompoundId(event.params.compoundId!);
	if (!parsed.ok || parsed.type !== 'booking') {
		return fail(400, { error: 'Płatności tylko dla bookingów' });
	}
	const { id } = parsed;

	const form = await event.request.formData();
	const amountZl = Number(form.get('amountZl') ?? '0');
	const method = (form.get('method')?.toString() ?? 'gotówka').trim();
	const kind = (form.get('kind')?.toString() ?? 'pełna').trim();
	const paidAtRaw = form.get('paidAt')?.toString() || new Date().toISOString().slice(0, 10);
	const notes = form.get('notes')?.toString()?.trim() || null;

	if (!Number.isFinite(amountZl) || amountZl <= 0) return fail(400, { error: 'Kwota > 0' });
	if (!VALID_METHODS.includes(method)) return fail(400, { error: 'Nieznana metoda' });

	await db.insert(payment).values({
		bookingId: id,
		amountCents: Math.round(amountZl * 100),
		method,
		kind,
		paidAt: paidAtRaw,
		receivedBy: event.locals.user?.id ?? null,
		notes
	});
	return { success: true };
}

/**
 * Delete płatności (admin). Walidacja: type === 'booking'.
 */
export async function deletePayment(event: RequestEvent) {
	const parsed = parseCompoundId(event.params.compoundId!);
	if (!parsed.ok || parsed.type !== 'booking') return fail(400);

	const form = await event.request.formData();
	const paymentId = form.get('paymentId')?.toString();
	if (!paymentId) return fail(400);
	await db.delete(payment).where(eq(payment.id, paymentId));
	return { success: true };
}
