import { describe, it, expect } from 'vitest';
import { renderTemplate } from '$lib/template';

describe('renderTemplate', () => {
	it('zastępuje placeholder wartością', () => {
		const out = renderTemplate('Cześć {{name}}', { name: 'Anna' });
		expect(out).toBe('Cześć Anna');
	});

	it('zastępuje wiele placeholderów', () => {
		const out = renderTemplate('{{greeting}} {{name}}, {{event}}', {
			greeting: 'Cześć',
			name: 'Karol',
			event: 'wesele 50-osobowe'
		});
		expect(out).toBe('Cześć Karol, wesele 50-osobowe');
	});

	it('null/undefined daje pusty string', () => {
		const out = renderTemplate('{{a}}-{{b}}', { a: null, b: undefined });
		expect(out).toBe('-');
	});

	it('pusty string jako wartość jest OK', () => {
		const out = renderTemplate('[{{x}}]', { x: '' });
		expect(out).toBe('[]');
	});

	it('konwertuje number na string', () => {
		const out = renderTemplate('Razem: {{total}} zł', { total: 1800 });
		expect(out).toBe('Razem: 1800 zł');
	});

	it('nieznany placeholder pozostaje (sygnalizuje brak)', () => {
		const out = renderTemplate('{{unknown}} test', {});
		expect(out).toBe('{{unknown}} test');
	});

	it('ignoruje podobne do placeholderów ale niepoprawne składniowo', () => {
		const out = renderTemplate('{single} {nope {{real}}', { real: 'OK' });
		expect(out).toBe('{single} {nope OK');
	});

	it('bez placeholderów zwraca template bez zmian', () => {
		const out = renderTemplate('Zwykły tekst', { foo: 'bar' });
		expect(out).toBe('Zwykły tekst');
	});

	it('whitespace w placeholderze nie pasuje ({{ x }})', () => {
		// Regex \w+ nie matchuje ze spacjami — taki placeholder zostaje
		const out = renderTemplate('{{ name }}', { name: 'Anna' });
		expect(out).toBe('{{ name }}');
	});

	it('case-sensitive — ClientName ≠ clientname', () => {
		const out = renderTemplate('{{clientName}}', { clientname: 'Anna' });
		expect(out).toBe('{{clientName}}');
	});

	it('wielolinijkowe body z email templates', () => {
		const body = `Cześć {{clientName}},

Dzięki za zainteresowanie. Event: {{eventName}}.

Pozdrawiamy,
Zespół`;
		const out = renderTemplate(body, {
			clientName: 'Anna',
			eventName: 'Wesele'
		});
		expect(out).toContain('Cześć Anna,');
		expect(out).toContain('Event: Wesele.');
	});
});
