import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * v5.54 — stary ekran Better Auth usunięty, Keycloak SSO jest jedyną ścieżką.
 * Zachowujemy /login jako redirect, żeby stare linki / bookmarki nadal działały.
 */
export const load: PageServerLoad = ({ url }) => {
	const returnTo = url.searchParams.get('return_to') ?? '/dashboard';
	const target = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard';
	throw redirect(303, `/auth/login?return_to=${encodeURIComponent(target)}`);
};
