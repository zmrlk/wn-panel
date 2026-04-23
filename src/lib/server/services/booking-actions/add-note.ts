import { fail, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { lead, offer, booking } from '$lib/server/db/schema';
import { parseCompoundId } from '$lib/compound-id';
import { buildNoteEntry } from './_shared';

/**
 * Dopisz notatkę wewnętrzną do lead/offer/booking.
 * Nowa notatka trafia NAD istniejące (newest first), separator `\n\n`.
 */
export async function addNote(event: RequestEvent) {
	const form = await event.request.formData();
	const content = form.get('content')?.toString().trim() ?? '';
	if (!content) return fail(400, { error: 'empty' });

	const parsed = parseCompoundId(event.params.compoundId!);
	if (!parsed.ok) return fail(400, { error: 'Nieprawidłowy compound id' });
	const { type, id } = parsed;

	const author = event.locals.user?.name ?? 'Denis';
	const entry = buildNoteEntry(content, author);

	const table = type === 'lead' ? lead : type === 'offer' ? offer : booking;
	const [existing] = await db.select({ notes: table.notes }).from(table).where(eq(table.id, id));
	const combined = existing?.notes ? `${entry}\n\n${existing.notes}` : entry;
	await db.update(table).set({ notes: combined, updatedAt: new Date() }).where(eq(table.id, id));
	return { success: true };
}
