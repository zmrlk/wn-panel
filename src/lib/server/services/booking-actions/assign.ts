import { fail, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bookingAssignment } from '$lib/server/db/schema';
import { parseCompoundId } from '$lib/compound-id';

const VALID_TASKS: readonly string[] = ['driver', 'installer', 'lead', 'other'];

/**
 * Przypisz usera do bookingu z rolą (driver/installer/lead/other).
 * Unikalny constraint w DB: (bookingId, userId, task) — jeżeli konflikt, zwraca 400.
 */
export async function assignUser(event: RequestEvent) {
	const parsed = parseCompoundId(event.params.compoundId!);
	if (!parsed.ok || parsed.type !== 'booking') {
		return fail(400, { error: 'Przydziały tylko dla bookingów' });
	}
	const { id } = parsed;

	const form = await event.request.formData();
	const userId = form.get('userId')?.toString();
	const task = form.get('task')?.toString() ?? 'driver';
	const notes = form.get('notes')?.toString()?.trim() || null;

	if (!userId) return fail(400, { error: 'Wybierz osobę' });
	if (!VALID_TASKS.includes(task)) return fail(400, { error: 'Nieprawidłowy task' });

	try {
		await db.insert(bookingAssignment).values({
			bookingId: id,
			userId,
			task,
			notes
		});
	} catch {
		return fail(400, { error: 'Ta osoba jest już przypisana z tym taskiem' });
	}
	return { success: true };
}

/**
 * Usuń przypisanie (przez assignmentId z form).
 */
export async function unassignUser(event: RequestEvent) {
	const form = await event.request.formData();
	const assignmentId = form.get('assignmentId')?.toString();
	if (!assignmentId) return fail(400);
	await db.delete(bookingAssignment).where(eq(bookingAssignment.id, assignmentId));
	return { success: true };
}
