import { fail, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { booking, bookingTent, stockMovement } from '$lib/server/db/schema';
import { parseCompoundId } from '$lib/compound-id';
import { buildNoteEntry } from './_shared';

/**
 * Zakończ booking: in-progress → done + IN movements (zwrot) + OUT movements (strata).
 *
 * Form fields (per booking_tent):
 *   return_{tentId}: ile sztuk wróciło (0..quantity, default = quantity)
 *   note_{tentId}: notatka per-item (np. "brudne")
 *
 * Strata = quantity - returned (jeżeli > 0, zapisujemy osobny strata movement).
 */
export async function returnBooking(event: RequestEvent) {
	const parsed = parseCompoundId(event.params.compoundId!);
	if (!parsed.ok || parsed.type !== 'booking') {
		return fail(400, { error: 'Tylko dla bookingów' });
	}
	const { id } = parsed;

	const form = await event.request.formData();
	const returnNote = form.get('returnNote')?.toString()?.trim() || null;

	const [b] = await db.select().from(booking).where(eq(booking.id, id)).limit(1);
	if (!b) return fail(404);
	if (b.status !== 'in-progress') return fail(400, { error: 'Booking nie jest in-progress' });

	const tents = await db.select().from(bookingTent).where(eq(bookingTent.bookingId, id));
	const userId = event.locals.user?.id ?? null;

	const movements: Array<typeof stockMovement.$inferInsert> = [];
	for (const t of tents) {
		const issued = t.quantity;
		const returnedRaw = form.get(`return_${t.tentId}`)?.toString();
		const returned =
			returnedRaw != null ? Math.max(0, Math.min(issued, Number(returnedRaw))) : issued;
		const lost = issued - returned;
		const itemNote = form.get(`note_${t.tentId}`)?.toString()?.trim() || null;

		if (returned > 0) {
			movements.push({
				itemId: t.tentId,
				direction: 'IN',
				kind: 'zwrot_po_evencie',
				qty: returned,
				bookingId: id,
				reason: `Zwrot po evencie: ${b.eventName}`,
				notes: itemNote ?? returnNote,
				createdBy: userId
			});
		}
		if (lost > 0) {
			movements.push({
				itemId: t.tentId,
				direction: 'OUT',
				kind: 'strata',
				qty: lost,
				bookingId: id,
				reason: `Strata po evencie: ${b.eventName} (${lost} szt. nie wróciło)`,
				notes: itemNote ?? returnNote,
				createdBy: userId
			});
		}
	}

	if (movements.length > 0) {
		await db.insert(stockMovement).values(movements);
	}

	// Append notatkę do booking.notes
	if (returnNote) {
		const author = event.locals.user?.name ?? 'System';
		const entry = buildNoteEntry(returnNote, author, 'ZWROT');
		const combined = b.notes ? `${entry}\n\n${b.notes}` : entry;
		await db.update(booking).set({ notes: combined }).where(eq(booking.id, id));
	}

	await db
		.update(booking)
		.set({ status: 'done', updatedAt: new Date() })
		.where(eq(booking.id, id));
	return { success: true };
}
