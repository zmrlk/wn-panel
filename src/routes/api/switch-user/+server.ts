import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

/**
 * v5.54 — admin-only switcher (legacy Better-Auth demo leftover).
 * Po KC SSO kept jako admin debug: pozwala podszyć się pod innego usera przez cookie `wn-user-id`.
 * Nie-admin → 403.
 *
 * ⚠️ UWAGA: po v5.54 hooks.server.ts NIE CZYTA już cookie `wn-user-id`.
 * Endpoint jest de facto no-op aż do follow-upa (RBAC impersonation flow).
 */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	if (locals.user?.role !== 'admin') {
		throw error(403, 'admin only');
	}

	const { userId } = await request.json().catch(() => ({ userId: null }));
	if (!userId) {
		cookies.delete('wn-user-id', { path: '/' });
		return json({ ok: true, cleared: true });
	}
	cookies.set('wn-user-id', userId, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30
	});
	return json({ ok: true, userId, note: 'switcher cookie set; KC hooks ignore this — follow-up needed for real impersonation' });
};
