<script lang="ts">
	let { data } = $props();

	function fmtZl(cents: number | null | undefined) {
		if (cents == null) return '—';
		return (cents / 100).toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' zł';
	}
	function fmtDate(iso: string | null | undefined) {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
	}
	function fmtShortDate(iso: Date | string | null | undefined) {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}
	function eventRange(s: string, e: string) {
		if (s === e) return fmtDate(s);
		return `${fmtDate(s)} – ${fmtDate(e)}`;
	}
	function daysCount(s: string, e: string) {
		return Math.max(1, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1);
	}
	function printPage() {
		window.print();
	}
</script>

<svelte:head>
	<title>{data.offer.number} · {data.offer.eventName} — Oferta</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- NON-PRINT top bar (wn-panel brand) -->
<header class="app-topbar no-print">
	<div class="tb-left">
		<a href="/zlecenia" class="back-link">← Zlecenia</a>
		<span class="tb-number mono">{data.offer.number}</span>
		<span class="tb-status status-{data.offer.status}">{data.offer.status}</span>
	</div>
	<div class="tb-right">
		<button class="btn-ghost" disabled>✉️ Wyślij Resend (jutro)</button>
		<button class="btn-primary" onclick={printPage}>🖨️ Drukuj / PDF</button>
	</div>
</header>

<!-- ═══ PEPE BRAND-SYSTEM DOCUMENT (identyczne CSS z wolny-namiot-dla-pepego/html/brand-system.html) ═══ -->
<article class="doc">
	<!-- TOC (header bar — atrament bg, zarowka bottom border) -->
	<nav class="toc">
		<div class="toc-inner">
			<div class="toc-logo">wolny <em>namiot</em></div>
			<div class="toc-meta mono">
				<span>OFERTA</span>
				<span class="bullet">·</span>
				<span>{data.offer.number}</span>
				<span class="bullet">·</span>
				<span>{fmtShortDate(data.offer.createdAt)}</span>
			</div>
		</div>
	</nav>

	<!-- HERO (section: atrament tekst na plotno + duży display + italic accents) -->
	<section class="section section-hero">
		<div class="container">
			<span class="eyebrow">oferta przygotowana dla ciebie</span>
			<h1 class="display hero-h1">
				<span class="italic italic-word">dla</span>
				<br />
				{(data.offer.clientName ?? 'ciebie').toLowerCase()}.
			</h1>
			<p class="italic hero-sub">
				{data.offer.eventName.toLowerCase()}, <em>twoje zasady</em>.
			</p>
			<div class="hero-meta mono">
				<span>📅 {eventRange(data.offer.eventStartDate, data.offer.eventEndDate)}</span>
				<span class="bullet">·</span>
				<span>⏱️ {daysCount(data.offer.eventStartDate, data.offer.eventEndDate)} dni</span>
				{#if data.offer.venue}
					<span class="bullet">·</span>
					<span>📍 {data.offer.venue}</span>
				{/if}
			</div>
		</div>
	</section>

	<!-- INTRO (wesele-100 bg, miękki) -->
	<section class="section section-intro">
		<div class="container">
			<p class="intro-text">
				cieszymy się, że pomyślałeś o nas. <span class="italic">poniżej</span> znajdziesz kompletną wycenę. wszystko brutto, bez gwiazdek i niespodzianek. <span class="italic">zadzwoń</span>, jeśli coś zmienić — w <em>24h</em> odezwiemy się z nową wersją.
			</p>
		</div>
	</section>

	<!-- POZYCJE — pakiet-item style z Pepe -->
	<section class="section section-items">
		<div class="container">
			<header class="section-head">
				<span class="eyebrow">co jest w ofercie</span>
				<h2 class="display">pakiet dla <em class="italic">twojego eventu</em></h2>
			</header>

			{#if data.items.length === 0}
				<p class="empty-state italic">— pozycje zostaną dodane —</p>
			{:else}
				<div class="items-list">
					{#each data.items as it, i}
						<article class="pakiet-item">
							<div class="pakiet-num mono">{String(i + 1).padStart(2, '0')}</div>
							<div class="pakiet-body">
								<h3 class="display pakiet-name">{it.description.toLowerCase()}</h3>
								{#if it.quantity > 1}
									<p class="mono pakiet-qty">{it.quantity} szt.</p>
								{/if}
							</div>
							<div class="pakiet-price display">{fmtZl(it.lineTotalCents)}</div>
						</article>
					{/each}
				</div>
			{/if}
		</div>
	</section>

	<!-- TOTAL BLOCK (atrament bg + zarowka duża liczba — flagship z Pepe) -->
	<section class="section section-total">
		<div class="container">
			<div class="total-block">
				<div class="total-label">
					<span class="eyebrow">do zapłaty</span>
					<span class="italic total-sub">razem brutto, <em>wszystko wliczone</em></span>
				</div>
				<div class="total-big display">{fmtZl(data.offer.totalCents)}</div>
			</div>
			<p class="total-note mono">VAT 23% wliczony · bez gwiazdek</p>
		</div>
	</section>

	<!-- WARUNKI (zarowka-100 bg + zarowka left border) -->
	<section class="section section-terms">
		<div class="container">
			<span class="eyebrow">warunki</span>
			<ul class="terms-list">
				<li><strong>ceny brutto</strong> — VAT 23% w cenie, bez gwiazdek.</li>
				<li><strong>dowóz do 100 km</strong> od Jędrzejowa w cenie (Kielce, Częstochowa, Kraków). dalej: +3-5 zł/km.</li>
				<li><strong>dłuższe imprezy</strong> — 2+ dni: dopłata 30-50% bazy za dodatkowy dzień.</li>
				<li><strong>dostępność ekspresowa</strong> — często 12-24h od telefonu.</li>
				{#if data.offer.validUntil}
					<li><strong>oferta ważna do:</strong> {fmtDate(data.offer.validUntil)}</li>
				{/if}
			</ul>
		</div>
	</section>

	<!-- CTA + KONTAKT (atrament bg, zarowka accents) -->
	<section class="section section-contact">
		<div class="container">
			<div class="contact-grid">
				<div class="cta-col">
					<span class="eyebrow zarowka-text">akceptujesz?</span>
					<h2 class="display contact-h2">zadzwoń <em class="italic">lub napisz</em>.</h2>
					<p class="contact-sub">rezerwujemy namiot na twój termin, podpisujemy umowę, zjawiamy się.</p>
				</div>
				<div class="contact-info mono">
					<div class="ctc-row">
						<span class="ctc-icon">📞</span>
						<span>+48 796 886 222</span>
					</div>
					<div class="ctc-row">
						<span class="ctc-icon">✉️</span>
						<span>kontakt@wolnynamiot.pl</span>
					</div>
					<div class="ctc-row">
						<span class="ctc-icon">🌐</span>
						<span>wolnynamiot.pl</span>
					</div>
					<div class="ctc-row">
						<span class="ctc-icon">📍</span>
						<span>11 listopada 27, 28-300 Jędrzejów</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- FOOT (maly sig) -->
	<footer class="doc-foot">
		<div class="container">
			<span class="mono">przygotował: <strong>{data.user.name.toLowerCase()}</strong></span>
			<span class="bullet">·</span>
			<span class="italic">wolny namiot</span>
			<span class="bullet">·</span>
			<span class="mono">sezon 2026</span>
		</div>
	</footer>
</article>

<style>
	/* ═══ PEPE BRAND-SYSTEM TOKENS (lift z wolny-namiot-dla-pepego) ═══ */
	:global(.doc) {
		/* palette */
		--plotno: #f5f1e6;
		--plotno-50: #fdfbf5;
		--plotno-100: #faf7ee;
		--plotno-200: #f5f1e6;
		--plotno-300: #e8dfc9;
		--plotno-400: #d4c9ae;
		--atrament: #0a0a0a;
		--atrament-900: #1a1a1a;
		--atrament-700: #2a2a2a;
		--atrament-500: #4a4a4a;
		--atrament-300: #7a7a7a;
		--atrament-100: #bdbdbd;
		--trawa: #1f7a3f;
		--trawa-300: #5bac73;
		--trawa-100: #c8e6d1;
		--ogien: #132b4d;
		--granat: #132b4d;
		--zarowka: #f9d94a;
		--zarowka-300: #fbe988;
		--zarowka-100: #fef3c7;
		--wesele: #e8dfc9;
		--wesele-300: #f1ecd9;
		--wesele-100: #faf7ec;
		--pomidor: #d93a1f;
		--pomidor-100: #f9d6ce;
		--space-2: 8px;
		--space-3: 12px;
		--space-4: 16px;
		--space-5: 24px;
		--space-6: 32px;
		--space-7: 48px;
		--space-8: 64px;
		--shadow-sticker: 4px 4px 0 var(--atrament);
	}

	/* TOPBAR (non-print) */
	.app-topbar {
		position: sticky;
		top: 0;
		z-index: 100;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1.5rem;
		background: var(--paper);
		border-bottom: 1px solid var(--line);
	}
	.tb-left {
		display: flex;
		gap: 1rem;
		align-items: center;
	}
	.back-link {
		font-size: 0.85rem;
		color: var(--mute);
		text-decoration: none;
	}
	.tb-number {
		font-size: 0.82rem;
		color: var(--wn-granat);
		font-weight: 600;
	}
	.tb-status {
		padding: 0.18rem 0.55rem;
		border-radius: 4px;
		font-size: 0.72rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.tb-status.status-accepted {
		background: var(--wn-zielony);
		color: var(--wn-plotno);
	}
	.tb-status.status-sent {
		background: color-mix(in srgb, var(--wn-granat) 15%, transparent);
		color: var(--wn-granat);
	}
	.tb-status.status-viewed {
		background: color-mix(in srgb, var(--wn-zarowka) 40%, transparent);
		color: #8a6d00;
	}
	.tb-status.status-draft {
		background: var(--paper-2);
		color: var(--mute);
	}
	.tb-right {
		display: flex;
		gap: 0.5rem;
	}
	.btn-primary {
		padding: 0.5rem 1rem;
		background: var(--wn-zielony);
		color: var(--wn-plotno);
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
	}
	.btn-ghost {
		padding: 0.5rem 1rem;
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 6px;
		color: var(--ink-2);
	}

	/* ═══ DOC — Pepe brand exactly ═══ */
	.doc {
		font-family: 'Archivo', -apple-system, sans-serif;
		color: var(--atrament);
		background: var(--plotno);
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
	}
	:global(.doc .display) {
		font-family: 'Archivo Black', sans-serif;
		letter-spacing: -0.03em;
		text-transform: lowercase;
	}
	:global(.doc .italic) {
		font-family: 'Instrument Serif', serif;
		font-style: italic;
		font-weight: 400;
		letter-spacing: -0.01em;
	}
	:global(.doc .mono) {
		font-family: 'JetBrains Mono', monospace;
	}
	:global(.doc .eyebrow) {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		letter-spacing: 2px;
		text-transform: lowercase;
		color: var(--atrament-500);
		font-weight: 500;
		display: block;
		margin-bottom: 12px;
	}
	:global(.doc .bullet) {
		color: var(--atrament-300);
		padding: 0 8px;
	}
	.container {
		max-width: 960px;
		margin: 0 auto;
		padding: 0 32px;
	}

	/* TOC — atrament bar with zarowka bottom border */
	.toc {
		background: var(--atrament);
		color: var(--plotno);
		padding: 16px 0;
		border-bottom: 4px solid var(--zarowka);
	}
	.toc-inner {
		max-width: 960px;
		margin: 0 auto;
		padding: 0 32px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
	}
	.toc-logo {
		font-family: 'Archivo Black', sans-serif;
		font-size: 20px;
		text-transform: lowercase;
		letter-spacing: -0.02em;
	}
	.toc-logo em {
		font-family: 'Instrument Serif', serif;
		font-style: italic;
		font-weight: 500;
		color: var(--zarowka);
	}
	.toc-meta {
		font-size: 11px;
		letter-spacing: 1.5px;
		text-transform: lowercase;
		color: var(--plotno);
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.toc-meta .bullet {
		color: var(--atrament-300);
	}

	/* SECTIONS */
	.section {
		padding: 80px 0;
		border-bottom: 1px solid rgba(10, 10, 10, 0.08);
	}
	.section-head {
		margin-bottom: 40px;
	}
	.section-head h2 {
		font-size: clamp(32px, 5vw, 56px);
		line-height: 1;
		color: var(--atrament);
	}

	/* HERO */
	.section-hero {
		padding: 80px 0 100px;
		background: var(--plotno);
	}
	.hero-h1 {
		font-size: clamp(48px, 9vw, 120px);
		line-height: 0.95;
		margin: 8px 0 20px;
		color: var(--atrament);
	}
	.italic-word {
		color: var(--atrament-500);
		font-size: 0.55em;
		display: inline-block;
		margin-right: 8px;
	}
	.hero-sub {
		font-size: clamp(20px, 2.5vw, 32px);
		color: var(--atrament-700);
		margin: 0 0 32px;
	}
	.hero-sub em {
		color: var(--pomidor);
		font-weight: 500;
	}
	.hero-meta {
		font-size: 13px;
		color: var(--atrament-500);
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		align-items: center;
	}

	/* INTRO */
	.section-intro {
		background: var(--wesele-100);
		padding: 56px 0;
	}
	.intro-text {
		font-size: clamp(18px, 2vw, 22px);
		line-height: 1.6;
		color: var(--atrament);
		max-width: 720px;
	}
	.intro-text em {
		color: var(--pomidor);
		font-style: italic;
		font-weight: 500;
	}

	/* ITEMS — pakiet-item style */
	.section-items {
		background: var(--plotno);
	}
	.items-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.pakiet-item {
		display: grid;
		grid-template-columns: 56px 1fr auto;
		gap: 20px;
		align-items: center;
		padding: 20px 24px;
		background: var(--plotno-50);
		border: 2px solid var(--atrament);
		box-shadow: var(--shadow-sticker);
	}
	.pakiet-num {
		font-size: 20px;
		font-weight: 700;
		color: var(--pomidor);
	}
	.pakiet-name {
		font-size: clamp(20px, 2.4vw, 28px);
		line-height: 1.1;
		color: var(--atrament);
		margin: 0;
	}
	.pakiet-qty {
		font-size: 13px;
		color: var(--atrament-500);
		margin: 4px 0 0;
	}
	.pakiet-price {
		font-size: clamp(20px, 2.4vw, 28px);
		color: var(--atrament);
		white-space: nowrap;
	}
	.empty-state {
		text-align: center;
		color: var(--atrament-300);
		font-size: 20px;
		padding: 40px;
	}

	/* TOTAL BLOCK — flagship */
	.section-total {
		background: var(--plotno);
		padding: 64px 0 40px;
	}
	.total-block {
		background: var(--atrament);
		color: var(--plotno);
		padding: 48px 40px;
		box-shadow: var(--shadow-sticker);
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 24px;
		align-items: center;
	}
	.total-label {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.total-label .eyebrow {
		color: var(--zarowka);
		margin-bottom: 4px;
	}
	.total-sub {
		font-size: 18px;
		color: var(--plotno-300);
	}
	.total-sub em {
		color: var(--zarowka);
	}
	.total-big {
		font-size: clamp(48px, 9vw, 96px);
		color: var(--zarowka);
		line-height: 1;
	}
	.total-note {
		margin-top: 16px;
		text-align: right;
		font-size: 11px;
		color: var(--atrament-500);
	}

	/* TERMS */
	.section-terms {
		background: var(--zarowka-100);
		padding: 48px 0;
	}
	.terms-list {
		margin: 16px 0 0;
		padding-left: 24px;
		font-size: 16px;
		line-height: 1.8;
		color: var(--atrament);
		max-width: 720px;
	}
	.terms-list strong {
		color: var(--atrament);
		font-weight: 700;
	}

	/* CONTACT */
	.section-contact {
		background: var(--atrament);
		color: var(--plotno);
		padding: 64px 0;
	}
	.zarowka-text {
		color: var(--zarowka) !important;
	}
	.contact-grid {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		gap: 48px;
		align-items: center;
	}
	.contact-h2 {
		font-size: clamp(36px, 5vw, 64px);
		color: var(--plotno);
		line-height: 1;
		margin: 8px 0 16px;
	}
	.contact-h2 em {
		color: var(--zarowka);
	}
	.contact-sub {
		font-size: 18px;
		color: var(--plotno-300);
		max-width: 400px;
		margin: 0;
	}
	.contact-info {
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 15px;
	}
	.ctc-row {
		display: grid;
		grid-template-columns: 28px 1fr;
		gap: 8px;
		align-items: center;
	}

	/* FOOT */
	.doc-foot {
		padding: 24px 0;
		background: var(--plotno);
		text-align: center;
	}
	.doc-foot .container {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: var(--atrament-500);
		flex-wrap: wrap;
	}

	/* ═══ PRINT (Pepe pattern — A4 portrait dla oferty, A3 landscape dla brandbooka) ═══ */
	@media print {
		@page {
			size: A4;
			margin: 0;
		}
		:global(body) {
			background: var(--plotno) !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.no-print {
			display: none !important;
		}
		.doc {
			background: var(--plotno);
		}
		.section {
			padding: 32px 0 !important;
		}
		.pakiet-item,
		.total-block,
		.hero-h1 {
			page-break-inside: avoid;
			break-inside: avoid;
		}
		.section-head,
		h2,
		h3,
		.eyebrow {
			page-break-after: avoid;
			break-after: avoid;
		}
		.container {
			padding: 0 16px;
			max-width: 100%;
		}
		* {
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}
	}

	/* Mobile */
	@media (max-width: 720px) {
		.section {
			padding: 48px 0;
		}
		.contact-grid {
			grid-template-columns: 1fr;
			gap: 24px;
		}
		.total-block {
			grid-template-columns: 1fr;
			text-align: center;
		}
		.pakiet-item {
			grid-template-columns: 40px 1fr;
			gap: 12px;
		}
		.pakiet-price {
			grid-column: 1 / -1;
			text-align: right;
			padding-top: 8px;
			border-top: 1px dashed var(--atrament-100);
		}
		.container {
			padding: 0 20px;
		}
	}
</style>
