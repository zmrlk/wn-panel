import { redirect } from '@sveltejs/kit';

export const load = () => {
	// Stara zakładka "Leady" — wszystko teraz w unified /zlecenia
	throw redirect(308, '/zlecenia?tab=nowe');
};
