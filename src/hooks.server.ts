import type { Handle } from '@sveltejs/kit';

/**
 * TEMP hooks — auth gate wyłączony w trybie preview dashboardu.
 * TODO: po finalizacji UX — przywrócić Keycloak verifyToken + refresh flow (lift z VRS v2).
 */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.session = null;
	return resolve(event);
};
