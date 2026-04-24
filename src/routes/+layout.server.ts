import type { LayoutServerLoad } from './$types';

/**
 * v5.58 — layout loader: tylko currentUser.
 * Switcher + users list usunięte (legacy Better-Auth demo, zastąpione KC SSO).
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		currentUser: locals.user
	};
};
