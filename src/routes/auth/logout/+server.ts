import { buildLogoutUrl } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, cookies }) => {
	cookies.delete('kc_access', { path: '/' });
	cookies.delete('kc_refresh', { path: '/' });
	cookies.delete('kc_state', { path: '/' });
	cookies.delete('kc_return_to', { path: '/' });

	const postLogoutRedirect = `${url.origin}/`;
	throw redirect(302, buildLogoutUrl(postLogoutRedirect));
};

export const POST: RequestHandler = ({ url, cookies }) => {
	cookies.delete('kc_access', { path: '/' });
	cookies.delete('kc_refresh', { path: '/' });
	cookies.delete('kc_state', { path: '/' });
	cookies.delete('kc_return_to', { path: '/' });

	const postLogoutRedirect = `${url.origin}/`;
	throw redirect(302, buildLogoutUrl(postLogoutRedirect));
};
