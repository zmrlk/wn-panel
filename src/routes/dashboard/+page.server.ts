import type { PageServerLoad } from './$types';

/**
 * DASHBOARD v4 — model magazynowy: item.total vs reserved[date]
 * Każda kategoria to osobna linia (warianty kolor/rozmiar = osobne itemy).
 * Matrix pokazuje liczbę dostępnych sztuk per dzień.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	type Item = {
		id: string;
		name: string;
		group: string;
		total: number; // szt. w magazynie
		reserved: Record<string, number>; // per-day reserved count
		maintenance: Record<string, number>; // per-day in-service count
	};

	const mk = (id: string, name: string, group: string, total: number): Item => ({
		id,
		name,
		group,
		total,
		reserved: {},
		maintenance: {}
	});

	// Asortyment (z wolnynamiot.pl + warianty color/size)
	const items: Item[] = [
		// Namioty — warianty wymiar × kolor jako osobne SKU
		mk('t-5x3-w', 'Namiot 5×3 biały', 'Namioty', 5),
		mk('t-5x3-g', 'Namiot 5×3 szary', 'Namioty', 2),
		mk('t-6x3', 'Namiot 6×3', 'Namioty', 6),
		mk('t-4x8', 'Namiot 4×8', 'Namioty', 3),
		mk('t-5x10', 'Namiot 5×10', 'Namioty', 2),
		mk('t-6x12', 'Namiot 6×12', 'Namioty', 1),
		// Meble
		mk('s-prost', 'Stół prostokątny 220×80', 'Stoły', 50),
		mk('s-kokt', 'Stół koktajlowy', 'Stoły', 10),
		mk('c-bialy', 'Krzesło białe', 'Krzesła', 400),
		mk('c-drewno', 'Krzesło drewniane', 'Krzesła', 120),
		mk('l-220', 'Ławka 220 cm', 'Ławki', 40),
		// Oświetlenie
		mk('o-girl', 'Oświetlenie LED girlanda', 'Oświetlenie', 15),
		mk('o-ref', 'Reflektor LED 50W', 'Oświetlenie', 8),
		// Akcesoria
		mk('a-boki', 'Boki panelowe', 'Akcesoria', 20),
		mk('a-obc', 'Obciążnik betonowy 30kg', 'Akcesoria', 32)
	];

	// Dni = next 21 days
	const today = new Date(2026, 3, 22);
	const days = Array.from({ length: 21 }, (_, i) => {
		const d = new Date(today);
		d.setDate(today.getDate() + i);
		return {
			iso: d.toISOString().slice(0, 10),
			day: d.getDate(),
			weekday: ['niedz', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'][d.getDay()],
			isToday: i === 0,
			isWeekend: d.getDay() === 0 || d.getDay() === 6
		};
	});

	// Helper: reserve N sztuk danego itemu na zakres dni
	const reserve = (itemId: string, startOffset: number, lengthDays: number, qty: number) => {
		const item = items.find((i) => i.id === itemId);
		if (!item) return;
		for (let i = startOffset; i < startOffset + lengthDays; i++) {
			if (i < 0 || i >= days.length) continue;
			const iso = days[i].iso;
			item.reserved[iso] = (item.reserved[iso] ?? 0) + qty;
		}
	};
	const maintenance = (itemId: string, startOffset: number, lengthDays: number, qty: number) => {
		const item = items.find((i) => i.id === itemId);
		if (!item) return;
		for (let i = startOffset; i < startOffset + lengthDays; i++) {
			if (i < 0 || i >= days.length) continue;
			const iso = days[i].iso;
			item.maintenance[iso] = (item.maintenance[iso] ?? 0) + qty;
		}
	};

	// Wesele Kowalski 25-27 kwi (offset 3, length 3)
	reserve('t-5x3-w', 3, 3, 2);
	reserve('t-6x3', 3, 3, 1);
	reserve('s-prost', 3, 3, 10);
	reserve('c-bialy', 3, 3, 100);
	reserve('l-220', 3, 3, 20);
	reserve('o-girl', 3, 3, 3);

	// Corpo TechStudio 1-3 maja (offset 9, length 3)
	reserve('t-6x12', 9, 3, 1);
	reserve('t-4x8', 9, 3, 1);
	reserve('s-prost', 9, 3, 15);
	reserve('c-bialy', 9, 3, 150);
	reserve('o-ref', 9, 3, 4);
	reserve('o-girl', 9, 3, 6);
	reserve('a-boki', 9, 3, 10);

	// Nowak 10-11 maja (offset 18, length 2)
	reserve('t-5x10', 18, 2, 1);
	reserve('s-prost', 18, 2, 8);
	reserve('c-bialy', 18, 2, 80);

	// Maintenance examples
	maintenance('t-4x8', 5, 2, 1); // namiot 4x8 w serwisie
	maintenance('c-drewno', 2, 5, 20); // 20 krzeseł drewnianych w serwisie

	const status = {
		eventsThisWeek: 3,
		needsAttention: 2,
		freeSlotsMay: 14
	};

	const actions = [
		{ id: 'a1', event: 'Wesele Kowalski', date: '25 kwi', reason: 'brak kaucji', severity: 'warn' },
		{ id: 'a2', event: 'TechStudio', date: '1 maja', reason: 'brak adresu', severity: 'warn' },
		{ id: 'a3', event: 'Nowak 50-tka', date: '10 maja', reason: 'potwierdź menu', severity: 'info' }
	];

	// CRM funnel (Leady → Oferty → Rezerwacje)
	const funnel = {
		leadsNew: 5,
		leadsContacted: 3,
		leadsQualified: 2,
		offersDraft: 2,
		offersSent: 7,
		offersViewed: 4, // Resend tracking
		offersAccepted: 2,
		bookingsConfirmed: 3,
		pendingValueZl: 42800, // wartość wysłanych ofert
		conversionPct: 18
	};

	const recentLeads = [
		{ id: 'l1', name: 'Katarzyna Nowak', event: 'Wesele 15 czerwca', source: 'website', status: 'new', age: '2h' },
		{ id: 'l2', name: 'ActionFilm sp.z.o.o.', event: 'Film plenerowy', source: 'phone', status: 'contacted', age: '1d' },
		{ id: 'l3', name: 'Tomek Zięba', event: '40-tka 20 maja', source: 'facebook', status: 'qualified', age: '3d' }
	];

	// Magazyn summary — agregacja per grupa
	const groupOrder = ['Namioty', 'Stoły', 'Krzesła', 'Ławki', 'Oświetlenie', 'Akcesoria'];
	const warehouse = groupOrder.map((g) => {
		const inGroup = items.filter((i) => i.group === g);
		const total = inGroup.reduce((s, i) => s + i.total, 0);
		const todayIso = days[0].iso;
		const reservedToday = inGroup.reduce((s, i) => s + (i.reserved[todayIso] ?? 0), 0);
		const maintToday = inGroup.reduce((s, i) => s + (i.maintenance[todayIso] ?? 0), 0);
		const available = total - reservedToday - maintToday;
		return {
			group: g,
			types: inGroup.length,
			total,
			available,
			reserved: reservedToday,
			maintenance: maintToday
		};
	});

	return {
		user,
		items,
		days,
		status,
		actions,
		warehouse,
		funnel,
		recentLeads
	};
};
