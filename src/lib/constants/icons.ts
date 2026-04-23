/**
 * Shared SVG path definitions dla sidebar nav icons.
 * Stroke-width 1.75, round caps, 24×24 viewBox — spójne z reszta panelu.
 */
export const NAV_ICONS = {
	dashboard: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9ZM9 22V12h6v10',
	zlecenia: 'M22 12h-4l-3 9L9 3l-3 9H2',
	tents: 'M3 20 L12 4 L21 20 Z M8 20 L12 13 L16 20',
	team: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
	settings: 'M20 7h-9 M14 17H5 M17 14a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z M7 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z'
} as const;

export type NavIconKey = keyof typeof NAV_ICONS;

/**
 * Per-rola definicja widocznych sekcji w sidebar.
 * admin = wszystkie | employee = tylko dashboard.
 */
export const NAV_ITEMS: Array<{
	id: NavIconKey;
	label: string;
	href: string;
	adminOnly?: boolean;
}> = [
	{ id: 'dashboard', label: 'Home', href: '/dashboard' },
	{ id: 'zlecenia', label: 'Zlecenia', href: '/zlecenia', adminOnly: true },
	{ id: 'tents', label: 'Magazyn', href: '/magazyn', adminOnly: true },
	{ id: 'team', label: 'Zespół', href: '/team', adminOnly: true }
];

export const ADMIN_NAV_ITEMS: Array<{ id: NavIconKey; label: string; href: string }> = [
	{ id: 'settings', label: 'Ustaw.', href: '/settings' }
];
