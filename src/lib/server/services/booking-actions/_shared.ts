/**
 * Shared helpers dla action handlers /zlecenia/[compoundId].
 * Eliminuje duplikację timestamp + author entry w 3 miejscach (note, dispatch, return).
 */

/**
 * Sformatuj timestamp PL (używane w notatkach).
 * Format: "21.04.2026, 14:30"
 */
export function plTimestamp(): string {
	return new Date().toLocaleString('pl-PL', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Zbuduj wpis notatki z timestampem i autorem.
 * Format: `[21.04.2026, 14:30 · Karol] Treść notatki`
 * Gdy tag (np. "WYDANIE"): `[21.04.2026, 14:30 · Karol · WYDANIE] Treść`
 */
export function buildNoteEntry(
	content: string,
	author: string,
	tag?: string
): string {
	const prefix = tag ? `${author} · ${tag}` : author;
	return `[${plTimestamp()} · ${prefix}] ${content}`;
}
