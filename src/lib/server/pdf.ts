/**
 * PDF generation via Gotenberg (osobny docker service, HTML→PDF przez Chromium).
 * Setup: docker-compose.yml zawiera `gotenberg` service, env `GOTENBERG_URL`.
 */
import { env } from '$env/dynamic/private';

const DEFAULT_URL = 'http://gotenberg:3000';

export type PdfOptions = {
	/** Format papieru — A4 default. */
	paper?: 'A4' | 'Letter';
	/** Margins w calach (inch). Default 0.55" (~14mm). */
	margin?: number;
	/** Preferuj @page CSS z HTML (default false — używamy overrideów). */
	preferCssPageSize?: boolean;
	/** Timeout dla Gotenberg (ms). Default 30s. */
	timeoutMs?: number;
};

/**
 * Konwertuj URL do PDF (Gotenberg fetch URL + render headless Chromium).
 * Obsługuje extraHttpHeaders — potrzebne dla internal auth bypass token.
 */
export async function urlToPdf(
	url: string,
	opts: PdfOptions & {
		/** Nagłówki przekazywane przez Gotenberg w fetch requescie do URL. */
		extraHttpHeaders?: Record<string, string>;
		/** Dodatkowy delay po load (ms) na ostateczne renderowanie. Default 500. */
		waitDelayMs?: number;
	} = {}
): Promise<Buffer> {
	const gotenbergUrl = env.GOTENBERG_URL ?? DEFAULT_URL;
	const timeoutMs = opts.timeoutMs ?? 30_000;
	const margin = String(opts.margin ?? 0.55);
	const [paperWidth, paperHeight] =
		opts.paper === 'Letter' ? ['8.5', '11'] : ['8.27', '11.69'];

	const form = new FormData();
	form.append('url', url);
	form.append('paperWidth', paperWidth);
	form.append('paperHeight', paperHeight);
	form.append('marginTop', margin);
	form.append('marginBottom', margin);
	form.append('marginLeft', margin);
	form.append('marginRight', margin);
	form.append('printBackground', 'true');
	form.append('preferCssPageSize', String(opts.preferCssPageSize ?? false));
	if (opts.waitDelayMs) {
		form.append('waitDelay', `${opts.waitDelayMs}ms`);
	}
	if (opts.extraHttpHeaders) {
		form.append('extraHttpHeaders', JSON.stringify(opts.extraHttpHeaders));
	}

	const ctl = new AbortController();
	const timer = setTimeout(() => ctl.abort(), timeoutMs);
	try {
		const res = await fetch(`${gotenbergUrl}/forms/chromium/convert/url`, {
			method: 'POST',
			body: form,
			signal: ctl.signal
		});
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`Gotenberg ${res.status}: ${text.slice(0, 200)}`);
		}
		return Buffer.from(await res.arrayBuffer());
	} catch (err) {
		if ((err as Error).name === 'AbortError') throw new Error('Gotenberg timeout');
		throw err;
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Konwertuj HTML string do PDF buffer przez Gotenberg.
 * Zwraca Buffer gotowy do załącznika / response.
 */
export async function htmlToPdf(html: string, opts: PdfOptions = {}): Promise<Buffer> {
	const url = env.GOTENBERG_URL ?? DEFAULT_URL;
	const timeoutMs = opts.timeoutMs ?? 30_000;
	const margin = String(opts.margin ?? 0.55);

	// A4: 8.27 × 11.69 inch, Letter: 8.5 × 11
	const [paperWidth, paperHeight] =
		opts.paper === 'Letter' ? ['8.5', '11'] : ['8.27', '11.69'];

	const form = new FormData();
	form.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
	form.append('paperWidth', paperWidth);
	form.append('paperHeight', paperHeight);
	form.append('marginTop', margin);
	form.append('marginBottom', margin);
	form.append('marginLeft', margin);
	form.append('marginRight', margin);
	form.append('printBackground', 'true');
	form.append('preferCssPageSize', String(opts.preferCssPageSize ?? false));

	const ctl = new AbortController();
	const timer = setTimeout(() => ctl.abort(), timeoutMs);

	try {
		const res = await fetch(`${url}/forms/chromium/convert/html`, {
			method: 'POST',
			body: form,
			signal: ctl.signal
		});
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`Gotenberg ${res.status}: ${text.slice(0, 200)}`);
		}
		const ab = await res.arrayBuffer();
		return Buffer.from(ab);
	} catch (err) {
		if ((err as Error).name === 'AbortError') {
			throw new Error('Gotenberg timeout');
		}
		throw err;
	} finally {
		clearTimeout(timer);
	}
}
