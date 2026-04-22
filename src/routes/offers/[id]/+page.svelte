<script lang="ts">
	let { data } = $props();

	function fmtZl(cents: number | null | undefined) {
		if (cents == null) return '—';
		return (cents / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
	}
	function fmtDate(iso: string | null | undefined) {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
	}
	function eventRange(s: string, e: string) {
		if (s === e) return fmtDate(s);
		return `${fmtDate(s)} – ${fmtDate(e)}`;
	}
	function daysCount(s: string, e: string) {
		return Math.max(1, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1);
	}

	const netto = $derived(data.offer.totalCents / 1.23);
	const vat = $derived(data.offer.totalCents - netto);

	function printPage() {
		window.print();
	}
</script>

<svelte:head>
	<title>{data.offer.number} · {data.offer.eventName} — Oferta</title>
</svelte:head>

<!-- NON-PRINT top bar -->
<header class="app-topbar no-print">
	<div class="tb-left">
		<a href="/zlecenia" class="back-link">← Zlecenia</a>
		<span class="tb-number">{data.offer.number}</span>
		<span class="tb-status status-{data.offer.status}">{data.offer.status}</span>
	</div>
	<div class="tb-right">
		<button class="btn-ghost">✉️ Wyślij Resend (jutro)</button>
		<button class="btn-primary" onclick={printPage}>🖨️ Drukuj / PDF</button>
	</div>
</header>

<!-- PDF-STYLE DOCUMENT (print-friendly, brand Pepe) -->
<article class="doc">
	<!-- HEADER -->
	<header class="doc-head">
		<div class="brand">
			<div class="logo-mark">wn</div>
			<div>
				<h1 class="brand-name">wolny namiot</h1>
				<p class="brand-tagline">postaw gdzie chcesz. <em>zrób co chcesz.</em></p>
			</div>
		</div>
		<div class="doc-meta">
			<div class="meta-label">oferta nr</div>
			<div class="meta-number">{data.offer.number}</div>
			<div class="meta-date">{fmtDate(data.offer.createdAt)}</div>
		</div>
	</header>

	<!-- HERO: event + client -->
	<section class="hero">
		<div class="hero-greeting">
			<p class="hello">Dla:</p>
			<h2 class="client-name">{data.offer.clientName ?? '—'}</h2>
			{#if data.offer.clientCompany}
				<p class="client-sub">{data.offer.clientCompany}</p>
			{/if}
			<div class="client-contact">
				{#if data.offer.clientPhone}<span>📞 {data.offer.clientPhone}</span>{/if}
				{#if data.offer.clientEmail}<span>✉️ {data.offer.clientEmail}</span>{/if}
			</div>
		</div>
		<div class="hero-event">
			<span class="event-label">Event</span>
			<h3 class="event-name">{data.offer.eventName}</h3>
			<div class="event-row">
				<span class="event-chip">📅 {eventRange(data.offer.eventStartDate, data.offer.eventEndDate)}</span>
				<span class="event-chip">⏱️ {daysCount(data.offer.eventStartDate, data.offer.eventEndDate)} {daysCount(data.offer.eventStartDate, data.offer.eventEndDate) === 1 ? 'dzień' : 'dni'}</span>
				{#if data.offer.venue}
					<span class="event-chip">📍 {data.offer.venue}</span>
				{/if}
			</div>
		</div>
	</section>

	<!-- INTRO -->
	<section class="intro">
		<p class="intro-lead">Cieszymy się, że chcesz zorganizować u siebie <em>{data.offer.eventName.toLowerCase()}</em>. Poniżej znajdziesz przygotowaną specjalnie dla Ciebie wycenę — z dokładnym zakresem, cenami i terminami. Wszystkie ceny brutto (VAT 23% wliczony).</p>
	</section>

	<!-- ITEMS -->
	<section class="items-sec">
		<h3 class="sec-title">W ofercie</h3>
		{#if data.items.length === 0}
			<p class="empty">Brak pozycji w ofercie.</p>
		{:else}
			<div class="items-list">
				{#each data.items as it, i}
					<article class="item">
						<div class="item-num">{String(i + 1).padStart(2, '0')}</div>
						<div class="item-body">
							<h4 class="item-name">{it.description}</h4>
							{#if it.quantity > 1}
								<div class="item-meta">{it.quantity} szt.</div>
							{/if}
						</div>
						<div class="item-total">{fmtZl(it.lineTotalCents)}</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>

	<!-- SUMMARY — tylko jedna cena łączna, bez netto/VAT -->
	<section class="summary">
		<div class="sum-rows">
			<div class="sum-row total">
				<span>Razem</span>
				<span>{fmtZl(data.offer.totalCents)}</span>
			</div>
			<div class="sum-note">cena brutto, VAT 23% wliczony</div>
		</div>
	</section>

	<!-- WARUNKI -->
	<section class="terms">
		<h3 class="sec-title">Warunki</h3>
		<ul>
			<li><strong>Ceny brutto</strong> — VAT 23% wliczony.</li>
			<li><strong>Dowóz do 100 km</strong> od Jędrzejowa w cenie (Kielce, Częstochowa, Kraków). Dalej: dopłata 3-5 zł/km.</li>
			<li><strong>Dłuższe imprezy</strong> — 2+ dni: dopłata 30-50% ceny bazowej za każdy dodatkowy dzień.</li>
			<li><strong>Dostępność ekspresowa</strong> — często w 12-24h od telefonu (zależnie od sezonu).</li>
			{#if data.offer.validUntil}
				<li><strong>Oferta ważna do:</strong> {fmtDate(data.offer.validUntil)}</li>
			{/if}
		</ul>
	</section>

	<!-- CTA + CONTACT -->
	<footer class="doc-foot">
		<div class="foot-cta">
			<h3>Akceptujesz?</h3>
			<p>Zadzwoń lub napisz — rezerwujemy namiot na Twój termin i podpisujemy umowę.</p>
		</div>
		<div class="foot-contact">
			<div class="ctc-row"><strong>📞</strong> +48 796 886 222</div>
			<div class="ctc-row"><strong>✉️</strong> kontakt@wolnynamiot.pl</div>
			<div class="ctc-row"><strong>🌐</strong> wolnynamiot.pl</div>
			<div class="ctc-row"><strong>📍</strong> 11 listopada 27, 28-300 Jędrzejów</div>
		</div>
	</footer>

	<div class="doc-signature">
		<span>przygotował: <strong>{data.user.name}</strong></span>
		<span>·</span>
		<span>wolny namiot · sezon 2026</span>
	</div>
</article>

<style>
	:global(body) {
		background: var(--plotno, #f5f1e6);
	}

	/* TOPBAR (no-print) */
	.app-topbar {
		position: sticky;
		top: 0;
		z-index: 50;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1.5rem;
		background: var(--paper);
		border-bottom: 1px solid var(--line);
	}
	.tb-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.back-link {
		font-size: 0.85rem;
		color: var(--mute);
		text-decoration: none;
	}
	.back-link:hover {
		color: var(--ink);
	}
	.tb-number {
		font-family: var(--font-mono);
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
	.tb-status.status-draft {
		background: color-mix(in srgb, var(--mute) 12%, transparent);
		color: var(--mute);
	}
	.tb-status.status-sent {
		background: color-mix(in srgb, var(--wn-granat) 14%, transparent);
		color: var(--wn-granat);
	}
	.tb-status.status-viewed {
		background: color-mix(in srgb, var(--wn-zarowka) 40%, transparent);
		color: #8a6d00;
	}
	.tb-status.status-accepted {
		background: var(--wn-zielony);
		color: var(--wn-plotno);
	}
	.tb-status.status-rejected {
		background: color-mix(in srgb, var(--wn-pomidor) 15%, transparent);
		color: var(--wn-pomidor);
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
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}
	.btn-ghost {
		padding: 0.5rem 1rem;
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 6px;
		font-size: 0.85rem;
		color: var(--ink-2);
		cursor: pointer;
	}

	/* ═══ DOCUMENT (PDF-style, brand Pepe) ═══ */
	.doc {
		max-width: 820px;
		margin: 2rem auto;
		padding: 3.5rem 3.5rem 2.5rem;
		background: #fdfbf5; /* plotno-50 */
		border: 1px solid color-mix(in srgb, var(--wn-atrament) 8%, transparent);
		box-shadow: 4px 4px 0 var(--wn-atrament);
		font-family: var(--font-sans);
		color: var(--wn-atrament);
		position: relative;
	}

	/* HEADER */
	.doc-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding-bottom: 1.5rem;
		border-bottom: 3px solid var(--wn-atrament);
		margin-bottom: 2rem;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}
	.logo-mark {
		width: 54px;
		height: 54px;
		background: var(--wn-atrament);
		color: #fdfbf5;
		display: grid;
		place-items: center;
		font-family: var(--font-sans);
		font-weight: 800;
		font-size: 1.35rem;
		letter-spacing: -0.02em;
	}
	.brand-name {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.015em;
		color: var(--wn-atrament);
	}
	.brand-tagline {
		margin: 0.1rem 0 0;
		font-size: 0.78rem;
		color: var(--wn-atrament);
		opacity: 0.7;
	}
	.brand-tagline em {
		color: var(--wn-pomidor);
		font-style: italic;
		font-weight: 600;
	}

	.doc-meta {
		text-align: right;
	}
	.meta-label {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--wn-atrament);
		opacity: 0.55;
	}
	.meta-number {
		font-family: var(--font-mono);
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--wn-granat);
		margin-top: 0.2rem;
	}
	.meta-date {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--wn-atrament);
		opacity: 0.7;
		margin-top: 0.15rem;
	}

	/* HERO */
	.hero {
		display: grid;
		grid-template-columns: 1fr 1.2fr;
		gap: 2rem;
		padding: 1.25rem 1.5rem;
		background: #fef9e7; /* zarowka-100 */
		border: 2px solid var(--wn-atrament);
		box-shadow: 4px 4px 0 var(--wn-atrament);
		margin-bottom: 2rem;
	}
	.hero-greeting .hello {
		margin: 0 0 0.3rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--wn-atrament);
		opacity: 0.6;
	}
	.client-name {
		margin: 0 0 0.3rem;
		font-size: 1.7rem;
		font-weight: 800;
		color: var(--wn-atrament);
		line-height: 1.1;
	}
	.client-sub {
		margin: 0 0 0.5rem;
		font-size: 0.88rem;
		color: var(--wn-atrament);
		opacity: 0.75;
	}
	.client-contact {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.82rem;
		font-family: var(--font-mono);
		color: var(--wn-atrament);
		opacity: 0.85;
	}
	.hero-event {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}
	.event-label {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--wn-atrament);
		opacity: 0.6;
	}
	.event-name {
		margin: 0;
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--wn-atrament);
	}
	.event-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.3rem;
	}
	.event-chip {
		padding: 0.25rem 0.6rem;
		background: var(--wn-atrament);
		color: #fdfbf5;
		font-size: 0.78rem;
		font-family: var(--font-mono);
	}

	/* INTRO */
	.intro {
		margin-bottom: 2rem;
	}
	.intro-lead {
		margin: 0;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--wn-atrament);
	}
	.intro-lead em {
		color: var(--wn-pomidor);
		font-style: italic;
		font-weight: 600;
	}

	/* ITEMS */
	.items-sec {
		margin-bottom: 2rem;
	}
	.sec-title {
		margin: 0 0 1rem;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		font-family: var(--font-mono);
		font-weight: 600;
		color: var(--wn-atrament);
		padding-bottom: 0.55rem;
		border-bottom: 1px dashed var(--wn-atrament);
	}
	.items-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.item {
		display: grid;
		grid-template-columns: 42px 1fr auto;
		gap: 1rem;
		align-items: center;
		padding: 0.85rem 1rem;
		background: #fdfbf5;
		border: 1px solid color-mix(in srgb, var(--wn-atrament) 15%, transparent);
	}
	.item-num {
		font-family: var(--font-mono);
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--wn-pomidor);
	}
	.item-name {
		margin: 0 0 0.2rem;
		font-size: 0.98rem;
		font-weight: 600;
		color: var(--wn-atrament);
	}
	.item-meta {
		display: flex;
		gap: 0.5rem;
		font-size: 0.78rem;
		font-family: var(--font-mono);
		color: var(--wn-atrament);
		opacity: 0.7;
	}
	.item-meta strong {
		color: var(--wn-granat);
	}
	.item-total {
		font-family: var(--font-mono);
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--wn-atrament);
		white-space: nowrap;
	}
	.empty {
		text-align: center;
		color: var(--mute);
		padding: 2rem;
		font-style: italic;
	}

	/* SUMMARY */
	.summary {
		margin-bottom: 2rem;
		display: flex;
		justify-content: flex-end;
	}
	.sum-rows {
		min-width: 320px;
		padding: 1rem 1.2rem;
		background: var(--wn-atrament);
		color: #fdfbf5;
	}
	.sum-row {
		display: flex;
		justify-content: space-between;
		padding: 0.2rem 0;
		font-size: 0.88rem;
		font-family: var(--font-mono);
	}
	.sum-row.total {
		font-size: 1.45rem;
		font-weight: 700;
		color: var(--wn-zarowka);
	}
	.sum-note {
		margin-top: 0.4rem;
		font-size: 0.72rem;
		font-family: var(--font-mono);
		opacity: 0.6;
		text-align: right;
	}

	/* TERMS */
	.terms {
		padding: 1.1rem 1.3rem;
		background: #fef9e7;
		border-left: 4px solid var(--wn-zarowka);
		margin-bottom: 2rem;
	}
	.terms ul {
		margin: 0;
		padding-left: 1.15rem;
		font-size: 0.85rem;
		line-height: 1.7;
		color: var(--wn-atrament);
	}

	/* FOOTER */
	.doc-foot {
		display: grid;
		grid-template-columns: 1.3fr 1fr;
		gap: 2rem;
		padding: 1.5rem 1.6rem;
		background: var(--wn-atrament);
		color: #fdfbf5;
		margin-bottom: 1rem;
	}
	.foot-cta h3 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
		color: var(--wn-zarowka);
	}
	.foot-cta p {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.55;
		opacity: 0.88;
	}
	.foot-contact {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.85rem;
		font-family: var(--font-mono);
	}
	.ctc-row strong {
		display: inline-block;
		width: 1.4rem;
	}

	.doc-signature {
		text-align: center;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--wn-atrament);
		opacity: 0.55;
		padding-top: 0.8rem;
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}

	/* ═══ PRINT ═══ */
	@media print {
		@page {
			size: A4;
			margin: 1cm;
		}
		:global(body) {
			background: white !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.no-print {
			display: none !important;
		}
		.doc {
			margin: 0;
			max-width: 100%;
			padding: 1rem;
			box-shadow: none;
			border: none;
		}
		.hero {
			box-shadow: 2px 2px 0 var(--wn-atrament);
			break-inside: avoid;
		}
		.item {
			break-inside: avoid;
		}
	}
</style>
