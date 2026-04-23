/**
 * Booking/offer/lead stages — single source of truth.
 * Pure — zero deps (DB/env), łatwo testowalne.
 *
 * Architektura statusów (v5.20):
 * - DB ma fine-grained status per-typ (new/contacted/qualified/quoted/won/lost dla lead, itd.)
 * - UI pokazuje unified 6-bucket (nowy/w-trakcie/wygrany/zrealizowany/przegrany/archiwum)
 * - Każdy DB-status ma też "stage label" z emoji (display w detail page)
 */

export type ZlecenieType = 'lead' | 'offer' | 'booking';
export type UnifiedStatus =
	| 'nowy'
	| 'w-trakcie'
	| 'wygrany'
	| 'zrealizowany'
	| 'przegrany'
	| 'archiwum';

/**
 * Fine-grained stage label per (type:db-status). Używane w detail page topbar.
 */
export const STAGES: Record<string, { label: string; emoji: string }> = {
	// lead
	'lead:new': { label: 'Nowy', emoji: '🆕' },
	'lead:contacted': { label: 'W trakcie · kontakt', emoji: '📞' },
	'lead:qualified': { label: 'W trakcie · hot', emoji: '🎯' },
	'lead:quoted': { label: 'W trakcie · oferta', emoji: '✉️' },
	'lead:won': { label: 'Wygrany', emoji: '✅' },
	'lead:lost': { label: 'Przegrany', emoji: '✕' },
	'lead:archived': { label: 'Archiwum', emoji: '📦' },
	// offer
	'offer:draft': { label: 'W trakcie · szkic', emoji: '✏️' },
	'offer:sent': { label: 'W trakcie · wysłana', emoji: '✉️' },
	'offer:viewed': { label: 'W trakcie · zobaczył', emoji: '👀' },
	'offer:accepted': { label: 'Wygrany', emoji: '✅' },
	'offer:rejected': { label: 'Przegrany', emoji: '✕' },
	'offer:expired': { label: 'Przegrany · wygasła', emoji: '⏰' },
	// booking
	'booking:draft': { label: 'W trakcie · szkic', emoji: '📝' },
	'booking:confirmed': { label: 'W trakcie · potwierdzona', emoji: '✅' },
	'booking:in-progress': { label: 'W trakcie · realizacja', emoji: '🚚' },
	'booking:done': { label: 'Wygrany', emoji: '🎉' },
	'booking:cancelled': { label: 'Przegrany', emoji: '✕' }
};

/**
 * Fallback per typ gdy status nieznany.
 */
const STAGE_FALLBACK: Record<ZlecenieType, string> = {
	lead: 'lead:new',
	offer: 'offer:draft',
	booking: 'booking:confirmed'
};

export function getStage(type: ZlecenieType, status: string): { label: string; emoji: string } {
	return STAGES[`${type}:${status}`] ?? STAGES[STAGE_FALLBACK[type]];
}

/**
 * Unified UI buckets — 6 kategorii pokazywanych w chipach.
 */
export const ALL_UNIFIED_STATUSES: Array<{ id: UnifiedStatus; label: string; emoji: string }> = [
	{ id: 'nowy', label: 'Nowy', emoji: '🆕' },
	{ id: 'w-trakcie', label: 'W trakcie', emoji: '⚙️' },
	{ id: 'wygrany', label: 'Wygrany', emoji: '✅' },
	{ id: 'zrealizowany', label: 'Zrealizowany', emoji: '🎉' },
	{ id: 'przegrany', label: 'Przegrany', emoji: '✕' },
	{ id: 'archiwum', label: 'Archiwum', emoji: '📦' }
];

/**
 * DB status → unified bucket (do podświetlenia aktywnego chipa).
 */
export const DB_TO_UNIFIED: Record<ZlecenieType, Record<string, UnifiedStatus>> = {
	lead: {
		new: 'nowy',
		contacted: 'w-trakcie',
		qualified: 'w-trakcie',
		quoted: 'w-trakcie',
		won: 'zrealizowany',
		lost: 'przegrany',
		archived: 'archiwum'
	},
	offer: {
		draft: 'w-trakcie',
		sent: 'w-trakcie',
		viewed: 'w-trakcie',
		accepted: 'wygrany',
		rejected: 'przegrany',
		expired: 'przegrany'
	},
	booking: {
		draft: 'wygrany',
		confirmed: 'wygrany',
		'in-progress': 'wygrany',
		done: 'zrealizowany',
		cancelled: 'przegrany'
	}
};

export function dbStatusToUnified(type: ZlecenieType, dbStatus: string): string {
	return DB_TO_UNIFIED[type]?.[dbStatus] ?? dbStatus;
}

/**
 * Unified bucket → DB status per-typ (używane w updateStatus action).
 * Fallback: jeśli bucket już jest surowym DB-statusem → zwracamy go bez zmiany.
 */
export const UNIFIED_TO_DB: Record<ZlecenieType, Record<string, string>> = {
	lead: {
		nowy: 'new',
		'w-trakcie': 'contacted',
		przegrany: 'lost',
		archiwum: 'archived'
	},
	offer: {
		'w-trakcie': 'sent',
		wygrany: 'accepted',
		przegrany: 'rejected'
	},
	booking: {
		wygrany: 'confirmed',
		zrealizowany: 'done',
		przegrany: 'cancelled'
	}
};

export function unifiedToDbStatus(type: ZlecenieType, bucket: string): string {
	return UNIFIED_TO_DB[type]?.[bucket] ?? bucket;
}

/**
 * Per-typ dostępne chipy w UI (nie pokazujemy wszystkich 6 dla każdego typu —
 * tylko sensowne przejścia):
 *   lead    → nowy → w-trakcie → przegrany / archiwum (wygrany tylko przez ofertę)
 *   offer   → w-trakcie → wygrany (auto-konwersja) / przegrany
 *   booking → wygrany (aktywne) / zrealizowany / przegrany
 */
export const ALLOWED_STATUSES_PER_TYPE: Record<ZlecenieType, UnifiedStatus[]> = {
	lead: ['nowy', 'w-trakcie', 'przegrany', 'archiwum'],
	offer: ['w-trakcie', 'wygrany', 'przegrany'],
	booking: ['wygrany', 'zrealizowany', 'przegrany']
};

export function allowedStatusesForType(
	type: ZlecenieType
): Array<{ id: UnifiedStatus; label: string; emoji: string }> {
	const allowed = ALLOWED_STATUSES_PER_TYPE[type] ?? [];
	return ALL_UNIFIED_STATUSES.filter((s) => allowed.includes(s.id));
}
