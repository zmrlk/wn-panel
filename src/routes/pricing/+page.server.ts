import { redirect } from '@sveltejs/kit';

export const load = () => {
	// /pricing renamed → /magazyn
	throw redirect(308, '/magazyn');
};
