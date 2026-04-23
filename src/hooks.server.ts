import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * v5.29 — cookie-based user switcher dla demo.
 * Po Keycloak SSO (v5.30+) zastąpimy prawdziwym JWT verify.
 *
 * Flow: cookie `wn-user-id` → SELECT z "user" → injects do locals.
 * Bez cookie → admin default (pierwszy admin w DB).
 */
export const handle: Handle = async ({ event, resolve }) => {
	const userId = event.cookies.get('wn-user-id');
	let resolved = null;

	if (userId) {
		const [u] = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				skills: user.skills
			})
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);
		if (u) resolved = u;
	}

	// Fallback: pierwszy admin (albo pierwszy user w ogóle)
	if (!resolved) {
		const [first] = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				skills: user.skills
			})
			.from(user)
			.orderBy(user.role) // 'admin' < 'employee' alfabetycznie
			.limit(1);
		if (first) resolved = first;
	}

	event.locals.user = resolved
		? {
				id: resolved.id,
				name: resolved.name,
				email: resolved.email,
				role: resolved.role ?? 'employee',
				skills: resolved.skills ?? []
			}
		: null;
	event.locals.session = null;
	return resolve(event);
};
