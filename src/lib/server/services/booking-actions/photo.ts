import { fail, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { db } from '$lib/server/db';
import { photo } from '$lib/server/db/schema';
import { parseCompoundId } from '$lib/compound-id';

const VALID_KINDS: readonly string[] = ['delivery', 'return', 'damage', 'general'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Upload zdjęcia do bookingu (multipart form).
 * Zapisuje plik na dysk pod `static/uploads/bookings/{bookingId}/` + wpis w DB.
 *
 * Walidacje:
 * - typ === 'booking'
 * - plik istnieje i ma rozmiar > 0
 * - rozmiar ≤ 10 MB
 * - kind w VALID_KINDS
 * - MIME zaczyna się od `image/` (TODO v5.40: MIME sniff magic bytes)
 */
export async function uploadPhoto(event: RequestEvent) {
	const parsed = parseCompoundId(event.params.compoundId!);
	if (!parsed.ok || parsed.type !== 'booking') {
		return fail(400, { error: 'Zdjęcia tylko do bookingu' });
	}
	const { id } = parsed;

	const form = await event.request.formData();
	const file = form.get('file');
	const kind = (form.get('kind')?.toString() ?? 'general').trim();
	const caption = form.get('caption')?.toString()?.trim() || null;

	if (!(file instanceof File) || file.size === 0) {
		return fail(400, { error: 'Brak pliku' });
	}
	if (file.size > MAX_SIZE_BYTES) {
		return fail(400, { error: 'Plik za duży (max 10 MB)' });
	}
	if (!VALID_KINDS.includes(kind)) {
		return fail(400, { error: 'Nieprawidłowy typ' });
	}
	if (!file.type.startsWith('image/')) {
		return fail(400, { error: 'Tylko obrazy' });
	}

	// Path: static/uploads/bookings/{bookingId}/{timestamp}-{randomShort}.{ext}
	const ts = Date.now();
	const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
	const safeExt = ext.slice(0, 5) || 'jpg';
	const filename = `${ts}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
	const dir = join(process.cwd(), 'static', 'uploads', 'bookings', id);
	await mkdir(dir, { recursive: true });
	const filepath = join(dir, filename);
	const buffer = Buffer.from(await file.arrayBuffer());
	await writeFile(filepath, buffer);

	const publicUrl = `/uploads/bookings/${id}/${filename}`;

	await db.insert(photo).values({
		bookingId: id,
		url: publicUrl,
		kind,
		caption,
		takenBy: event.locals.user?.id ?? null
	});
	return { success: true };
}

/**
 * Delete zdjęcia z DB. TODO v5.40: usuń też plik z dysku (cleanup background job).
 */
export async function deletePhoto(event: RequestEvent) {
	const form = await event.request.formData();
	const photoId = form.get('photoId')?.toString();
	if (!photoId) return fail(400);
	await db.delete(photo).where(eq(photo.id, photoId));
	return { success: true };
}
