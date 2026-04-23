/**
 * Compound ID parsing — format: `{type}-{uuid}`, gdzie type = lead | offer | booking.
 * Używane w URL /zlecenia/{compound} i w action handlers.
 *
 * Zwraca strukturę + walidację (UUID + znany typ).
 * Pure — zero deps.
 */

export type ZlecenieType = 'lead' | 'offer' | 'booking';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_TYPES: readonly string[] = ['lead', 'offer', 'booking'];

export type ParseResult =
	| { ok: true; type: ZlecenieType; id: string }
	| { ok: false; error: 'format' | 'type' | 'uuid' };

/**
 * Parsuj compound ID z walidacją formatu + typu + UUID.
 *
 * @example
 * parseCompoundId('booking-550e8400-e29b-41d4-a716-446655440000')
 * // → { ok: true, type: 'booking', id: '550e8400-...' }
 *
 * parseCompoundId('garbage')
 * // → { ok: false, error: 'format' }
 */
export function parseCompoundId(compound: string): ParseResult {
	const dashIdx = compound.indexOf('-');
	if (dashIdx < 0) return { ok: false, error: 'format' };

	const type = compound.slice(0, dashIdx);
	const id = compound.slice(dashIdx + 1);

	if (!VALID_TYPES.includes(type)) return { ok: false, error: 'type' };
	if (!UUID_RE.test(id)) return { ok: false, error: 'uuid' };

	return { ok: true, type: type as ZlecenieType, id };
}
