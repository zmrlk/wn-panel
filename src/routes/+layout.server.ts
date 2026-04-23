import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';

/**
 * Globalny layout — dostarcza aktualnego usera + listę do switcher (v5.29).
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	const users = await db
		.select({
			id: user.id,
			name: user.name,
			role: user.role,
			skills: user.skills
		})
		.from(user)
		.orderBy(asc(user.role), asc(user.name));

	return {
		currentUser: locals.user,
		users
	};
};
