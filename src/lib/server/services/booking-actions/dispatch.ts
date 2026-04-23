import { fail, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { booking, bookingTent, stockMovement } from '$lib/server/db/schema';
import { parseCompoundId } from '$lib/compound-id';
import { buildNoteEntry } from './_shared';

/**
 * Wydaj booking na event: confirmed → in-progress + OUT movements.
 * Tworzy `wydanie_na_event` movement per booking_tent + append notatkę.
 */
export async function dispatchBooking(event: RequestEvent) {
	const parsed = parseCompoundId(event.params.compoundId!);
	if (!parsed.ok || parsed.type !== 'booking') {
		return fail(400, { error: 'Tylko dla bookingów' });
	}
	const { id } = parsed;

	const form = await event.request.formData();
	const dispatchNote = form.get('dispatchNote')?.toString()?.trim() || null;

	const [b] = await db.select().from(booking).where(eq(booking.id, id)).limit(1);
	if (!b) return fail(404);
	if (b.status !== 'confirmed') {
		return fail(400, { error: 'Booking nie jest w stanie confirmed' });
	}

	const tents = await db.select().from(bookingTent).where(eq(bookingTent.bookingId, id));
	const userId = event.locals.user?.id ?? null;

	// Per-tent OUT movement (notes shared across all)
	if (tents.length > 0) {
		await db.insert(stockMovement).values(
			tents.map((t) => ({
				itemId: t.tentId,
				direction: 'OUT',
				kind: 'wydanie_na_event',
				qty: t.quantity,
				bookingId: id,
				reason: `Wydanie na event: ${b.eventName}`,
				notes: dispatchNote,
				createdBy: userId
			}))
		);
	}

	// Append notatkę do booking.notes
	if (dispatchNote) {
		const author = event.locals.user?.name ?? 'System';
		const entry = buildNoteEntry(dispatchNote, author, 'WYDANIE');
		const combined = b.notes ? `${entry}\n\n${b.notes}` : entry;
		await db.update(booking).set({ notes: combined }).where(eq(booking.id, id));
	}

	await db
		.update(booking)
		.set({ status: 'in-progress', updatedAt: new Date() })
		.where(eq(booking.id, id));
	return { success: true };
}
