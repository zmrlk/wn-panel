import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';

/**
 * v5.54 — layout loader.
 * Lista users (dla switchera) tylko dla adminów. Pozostali dostają pustą listę.
 * Po pełnym KC SSO switcher ma sens tylko jako admin debug tool.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	const isAdmin = locals.user?.role === 'admin';

	const users = isAdmin
		? await db
				.select({
					id: user.id,
					name: user.name,
					role: user.role,
					skills: user.skills
				})
				.from(user)
				.orderBy(asc(user.role), asc(user.name))
		: [];

	return {
		currentUser: locals.user,
		users
	};
};
