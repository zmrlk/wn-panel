import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * Preview switcher — ustawia cookie `wn-user-id`.
 * Po v5.30 Keycloak ten endpoint zostanie wyłączony (lub tylko dla admin-as user).
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const { userId } = await request.json().catch(() => ({ userId: null }));
	if (!userId) {
		cookies.delete('wn-user-id', { path: '/' });
		return json({ ok: true, cleared: true });
	}
	cookies.set('wn-user-id', userId, {
		path: '/',
		httpOnly: false,
		maxAge: 60 * 60 * 24 * 30, // 30 dni
		sameSite: 'lax'
	});
	return json({ ok: true, userId });
};
