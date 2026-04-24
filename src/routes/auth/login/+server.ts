import { buildLoginUrl } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, cookies }) => {
	// Secure flag zgodny z actual protokołem — LAN HTTP też musi działać (brak TLS).
	const secure = url.protocol === 'https:';

	// state = CSRF token, sprawdzany w /auth/callback
	const state = crypto.randomUUID();
	cookies.set('kc_state', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: 60 * 10 // 10 min
	});

	// return_to — dokąd po zalogowaniu (validate że to relative path)
	const returnTo = url.searchParams.get('return_to');
	if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
		cookies.set('kc_return_to', returnTo, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure,
			maxAge: 60 * 10
		});
	}

	const redirectUri = `${url.origin}/auth/callback`;
	throw redirect(302, buildLoginUrl(redirectUri, state));
};
