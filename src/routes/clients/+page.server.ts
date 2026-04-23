import { redirect } from '@sveltejs/kit';

export const load = () => {
	// /clients — klienci dostępni przez /zlecenia (każde zlecenie ma klienta)
	throw redirect(308, '/zlecenia?tab=wszystko');
};
