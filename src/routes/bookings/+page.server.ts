import { redirect } from '@sveltejs/kit';

export const load = () => {
	// Stara zakładka "Rezerwacje" — wszystko teraz w unified /zlecenia
	throw redirect(308, '/zlecenia?tab=potwierdzone');
};
