import { exchangeCode } from '$lib/server/auth';
import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const savedState = cookies.get('kc_state');

	if (!code || !state || !savedState || state !== savedState) {
		throw error(400, { message: 'Invalid OAuth state' });
	}

	cookies.delete('kc_state', { path: '/' });

	const redirectUri = `${url.origin}/auth/callback`;
	const tokens = await exchangeCode(code, redirectUri);
	if (!tokens) {
		throw error(502, { message: 'Token exchange failed' });
	}

	// Secure flag bazowane na actual protocol — LAN HTTP deploy też musi działać.
	const secure = url.protocol === 'https:';

	// Access token — lax (pozwala na page nav z linków), 5 min typowo (KC default)
	cookies.set('kc_access', tokens.access_token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: tokens.expires_in
	});
	// Refresh token — strict (CSRF protection), 30 min typowo
	cookies.set('kc_refresh', tokens.refresh_token, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure,
		maxAge: tokens.refresh_expires_in
	});

	const returnTo = cookies.get('kc_return_to') ?? '/dashboard';
	cookies.delete('kc_return_to', { path: '/' });

	throw redirect(303, returnTo);
};
