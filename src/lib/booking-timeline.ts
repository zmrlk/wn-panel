/**
 * Multi-source timeline builder dla booking detail page.
 * Pure — przyjmuje gotowe dane (ładowane przez serwer), zwraca posortowaną listę eventów.
 *
 * Źródła:
 * - booking created (z booking.createdAt)
 * - assignments (driver/installer/lead + notes)
 * - dispatch movements (wydanie_na_event, OUT)
 * - payments (amount + method + notes)
 * - photos (delivery/return/damage/general + caption)
 * - return movements (zwrot_po_evencie, IN) + strata (OUT)
 * - done (jeśli booking.status === 'done')
 *
 * Sortowanie: chronologiczne asc, null daty na końcu.
 */

export type TimelineEvent = {
	label: string;
	date: Date | null;
	emoji: string;
	kind: string;
	note: string | null;
};

export type TimelineInput = {
	bookingCreatedAt: Date;
	bookingEndDate: string | Date | null;
	bookingStatus: string;
	assignments: Array<{
		userName: string | null;
		task: string;
		notes: string | null;
	}>;
	movements: Array<{
		kind: string;
		qty: number;
		itemName: string | null;
		createdAt: Date;
	}>;
	payments: Array<{
		amountCents: number;
		method: string;
		paidAt: string | null;
		notes: string | null;
	}>;
	photos: Array<{
		kind: string;
		caption: string | null;
		uploadedAt: Date;
	}>;
};

const TASK_LABEL: Record<string, string> = {
	driver: 'kierowca',
	installer: 'montaż',
	lead: 'lider'
};

const PHOTO_KIND_LABEL: Record<string, string> = {
	delivery: 'dostawa',
	return: 'odbiór',
	damage: 'uszkodzenie',
	general: 'inne'
};

/**
 * Buduje chronologiczny timeline z gotowych danych DB.
 */
export function buildBookingTimeline(input: TimelineInput): TimelineEvent[] {
	const timeline: TimelineEvent[] = [];

	// 1. Rezerwacja utworzona
	timeline.push({
		label: 'Rezerwacja utworzona',
		date: input.bookingCreatedAt,
		emoji: '➕',
		kind: 'created',
		note: null
	});

	// 2. Przydziały (brak createdAt w raw data → null, lecą na koniec)
	for (const a of input.assignments) {
		const taskLabel = TASK_LABEL[a.task] ?? a.task;
		timeline.push({
			label: `Przypisano: ${a.userName ?? '—'} (${taskLabel})`,
			date: null,
			emoji: '👥',
			kind: 'assignment',
			note: a.notes
		});
	}

	// 3. Dispatch (OUT wydanie_na_event) — aggregated w jeden event
	const dispatchMovements = input.movements.filter((m) => m.kind === 'wydanie_na_event');
	if (dispatchMovements.length > 0) {
		const firstDispatch = dispatchMovements[0];
		const totalItems = dispatchMovements.reduce((sum, m) => sum + m.qty, 0);
		const names = dispatchMovements
			.map((m) => `${m.qty}× ${m.itemName ?? 'Pozycja'}`)
			.join(', ');
		timeline.push({
			label: `Wydano na event (${totalItems} szt.)`,
			date: firstDispatch.createdAt,
			emoji: '🚚',
			kind: 'dispatch',
			note: names
		});
	}

	// 4. Płatności
	for (const p of input.payments) {
		const amountZl = (p.amountCents / 100).toLocaleString('pl-PL');
		timeline.push({
			label: `Płatność ${amountZl} zł (${p.method})`,
			date: p.paidAt ? new Date(p.paidAt) : null,
			emoji: '💰',
			kind: 'payment',
			note: p.notes
		});
	}

	// 5. Zdjęcia
	for (const p of input.photos) {
		const kindLabel = PHOTO_KIND_LABEL[p.kind] ?? 'inne';
		timeline.push({
			label: `Zdjęcie: ${kindLabel}`,
			date: p.uploadedAt,
			emoji: '📸',
			kind: 'photo',
			note: p.caption
		});
	}

	// 6. Return (IN zwrot_po_evencie) — aggregated
	const returnMovements = input.movements.filter((m) => m.kind === 'zwrot_po_evencie');
	if (returnMovements.length > 0) {
		const firstReturn = returnMovements[0];
		const totalReturned = returnMovements.reduce((sum, m) => sum + m.qty, 0);
		timeline.push({
			label: `Zwrot z eventu (${totalReturned} szt.)`,
			date: firstReturn.createdAt,
			emoji: '📦',
			kind: 'return',
			note: returnMovements.map((m) => `${m.qty}× ${m.itemName ?? 'Pozycja'}`).join(', ')
		});
	}

	// 7. Straty (OUT strata) — aggregated
	const stratyMovements = input.movements.filter((m) => m.kind === 'strata');
	if (stratyMovements.length > 0) {
		const firstStrata = stratyMovements[0];
		const totalLost = stratyMovements.reduce((sum, m) => sum + m.qty, 0);
		timeline.push({
			label: `Straty (${totalLost} szt.)`,
			date: firstStrata.createdAt,
			emoji: '⚠️',
			kind: 'loss',
			note: stratyMovements.map((m) => `${m.qty}× ${m.itemName ?? 'Pozycja'}`).join(', ')
		});
	}

	// 8. Done
	if (input.bookingStatus === 'done') {
		timeline.push({
			label: 'Event zakończony',
			date: input.bookingEndDate ? new Date(input.bookingEndDate) : null,
			emoji: '🎉',
			kind: 'done',
			note: null
		});
	}

	// Sort chronologicznie (asc) — null daty na koniec
	timeline.sort((a, b) => {
		if (!a.date && !b.date) return 0;
		if (!a.date) return 1;
		if (!b.date) return -1;
		return a.date.getTime() - b.date.getTime();
	});

	return timeline;
}
