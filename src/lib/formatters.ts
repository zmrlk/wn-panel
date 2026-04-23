/**
 * Shared formatters — PLN currency, date, date range, days count.
 * Używane wszędzie gdzie pokazujemy kwoty/daty w UI.
 *
 * Wcześniej: duplikaty w ~7 plikach (offers, zlecenia, settings, magazyn, team).
 * Teraz: jedno źródło prawdy + unit testy.
 */

/**
 * Cents → "1 234 zł" (PL locale, 0-2 decimals, "—" dla null).
 */
export function fmtZl(cents: number | null | undefined): string {
	if (cents == null) return '—';
	return (
		(cents / 100).toLocaleString('pl-PL', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}) + ' zł'
	);
}

/**
 * Date (ISO/Date) → "5 maja 2026" (PL long format).
 */
export function fmtDate(d: string | Date | null | undefined): string {
	if (!d) return '—';
	return new Date(d).toLocaleDateString('pl-PL', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

/**
 * Date + time → "05 maj 2026, 14:30" (short date + 24h).
 */
export function fmtDateTime(d: string | Date | null | undefined): string {
	if (!d) return '—';
	return new Date(d).toLocaleDateString('pl-PL', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Event range (start, end):
 * - brak start → "—"
 * - brak end / start === end → samo fmtDate(start)
 * - else → "fmt(start) – fmt(end)"
 */
export function eventRange(
	start: string | Date | null | undefined,
	end: string | Date | null | undefined
): string {
	if (!start) return '—';
	if (!end || start === end) return fmtDate(start);
	return `${fmtDate(start)} – ${fmtDate(end)}`;
}

/**
 * Days count (inclusive). Brak start → 0. Brak end → same as start (1 day).
 */
export function daysCount(
	start: string | Date | null | undefined,
	end: string | Date | null | undefined
): number {
	if (!start) return 0;
	const endValue = end ?? start;
	const startMs = new Date(start).getTime();
	const endMs = new Date(endValue).getTime();
	return Math.max(1, Math.ceil((endMs - startMs) / 86400000) + 1);
}
