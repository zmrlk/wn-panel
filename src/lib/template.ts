/**
 * Pure template rendering — używane przez email.ts i settings preview.
 * Zero deps, łatwo testowalne bez DB/env.
 */

/**
 * Zastąp placeholdery {{key}} wartościami z context.
 * Brak/null/undefined → pusty string.
 * Nieznany placeholder → pozostaje niezmieniony (pomocne przy walidacji).
 *
 * @example
 * renderTemplate('Cześć {{name}}', { name: 'Anna' }) // → 'Cześć Anna'
 * renderTemplate('{{missing}}', {}) // → '{{missing}}' (zostaje, sygnalizuje brak)
 */
export function renderTemplate(
	template: string,
	context: Record<string, string | number | null | undefined>
): string {
	return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		if (!(key in context)) return match; // nieznany placeholder zostaje
		const val = context[key];
		return val == null ? '' : String(val);
	});
}
