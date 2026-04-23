/**
 * Pure pricing logic dla MCP reservation endpoint.
 * Zero deps, łatwo testowalne bez DB.
 *
 * Markup logic:
 * - normal tier → 1.0× (bez markup)
 * - premium tier → 1.2× (AI convenience fee: pokrywa risk auto-rezerwacji + natychmiastową dostępność)
 */

/**
 * Markup dla premium tier — AI-driven booking bez human touch.
 */
export const MCP_PREMIUM_MARKUP = 1.2;
export const MCP_NORMAL_MARKUP = 1.0;

export type McpTier = 'normal' | 'premium';

export type McpLineItem = {
	itemId: string;
	quantity: number;
};

export type McpItemPrice = {
	id: string;
	pricePerDayCents: number | null;
};

/**
 * Liczba dni rezerwacji (inclusive: start i end liczą się oba).
 * Min 1 dzień.
 *
 * @example
 * calcDays('2026-05-01', '2026-05-01') // → 1 (same day)
 * calcDays('2026-05-01', '2026-05-03') // → 3
 */
export function calcDays(startDate: string, endDate: string): number {
	const start = new Date(startDate).getTime();
	const end = new Date(endDate).getTime();
	const diffDays = Math.ceil((end - start) / 86400000) + 1;
	return Math.max(1, diffDays);
}

/**
 * Markup multiplier dla tieru.
 */
export function markupForTier(tier: McpTier): number {
	return tier === 'premium' ? MCP_PREMIUM_MARKUP : MCP_NORMAL_MARKUP;
}

/**
 * Oblicz total w groszach.
 * Formuła: sum(unitPrice × quantity × days) × markup
 * Null pricePerDayCents = 0 (brak ceny).
 * Round na końcu (nie per-item — mniejsze błędy floating-point).
 */
export function calcTotalCents(
	items: McpLineItem[],
	itemPrices: Map<string, McpItemPrice>,
	days: number,
	tier: McpTier
): number {
	let total = 0;
	for (const req of items) {
		const it = itemPrices.get(req.itemId);
		if (!it) continue; // unknown item = 0 (caller powinien zwalidować wcześniej)
		const unit = it.pricePerDayCents ?? 0;
		total += unit * req.quantity * days;
	}
	return Math.round(total * markupForTier(tier));
}

/**
 * Oblicz unit price po markup — używane do offer_item.
 * Round per-item (bo trafia do DB jako integer cents).
 */
export function applyMarkup(pricePerDayCents: number | null, tier: McpTier): number {
	return Math.round((pricePerDayCents ?? 0) * markupForTier(tier));
}
