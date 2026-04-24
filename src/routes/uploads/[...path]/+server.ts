import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * v5.59 — serwowanie plików uploadowanych w runtime.
 * SvelteKit adapter-node serwuje `static/` tylko to co zostało spakowane
 * przy buildzie — runtime-dodane pliki (upload do `/app/static/uploads/`)
 * nie są obsługiwane przez wbudowany static handler.
 *
 * Ten endpoint czyta pliki z dysku (volume wn_uploads) i zwraca je z
 * odpowiednim content-type + cache. Path traversal guard przez resolve().
 *
 * ⚠️ Guarded przez hooks.server.ts (/uploads/ nie jest w PUBLIC_PREFIXES),
 * więc tylko zalogowani użytkownicy widzą zdjęcia magazynu.
 * Do publicznego PDF dostępu trzeba rozważyć signed URL albo wyjście na public.
 */

const UPLOAD_ROOT = resolve('static/uploads');

const CONTENT_TYPE: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	gif: 'image/gif',
	avif: 'image/avif',
	svg: 'image/svg+xml'
};

export const GET: RequestHandler = async ({ params }) => {
	const rel = params.path ?? '';
	if (!rel || rel.includes('..') || rel.includes('\0')) {
		throw error(400, { message: 'Invalid path' });
	}
	const full = resolve(UPLOAD_ROOT, rel);
	// Path traversal guard — resolved path musi być pod UPLOAD_ROOT
	if (!full.startsWith(UPLOAD_ROOT + sep) && full !== UPLOAD_ROOT) {
		throw error(400, { message: 'Invalid path' });
	}

	let bytes: Buffer;
	try {
		bytes = await readFile(full);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			throw error(404, { message: 'Not found' });
		}
		throw err;
	}

	const ext = (rel.split('.').pop() ?? '').toLowerCase();
	const type = CONTENT_TYPE[ext] ?? 'application/octet-stream';
	return new Response(new Uint8Array(bytes), {
		headers: {
			'content-type': type,
			'cache-control': 'public, max-age=3600',
			'content-length': String(bytes.length)
		}
	});
};
