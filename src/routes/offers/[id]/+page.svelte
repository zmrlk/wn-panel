<script lang="ts">
	let { data } = $props();

	function fmtZl(cents: number | null | undefined) {
		if (cents == null) return '—';
		return (cents / 100).toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' zł';
	}
	function fmtDate(iso: string | Date | null | undefined) {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
	}
	function eventRange(s: string | null | undefined, e: string | null | undefined) {
		if (!s || !e) return '';
		if (s === e) return fmtDate(s);
		return `${fmtDate(s)} – ${fmtDate(e)}`;
	}
	function printPage() {
		window.print();
	}
</script>

<svelte:head>
	<title>{data.offer.number} · {data.offer.eventName} — oferta wynajmu namiotów · wolny namiot</title>
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
		<span class="tb-number">{data.offer.number}</span>
		<span class="tb-status status-{data.offer.status}">{data.offer.status}</span>
		{#if data.snapshotInfo}
			<span class="tb-snapshot-badge">
				📸 snapshot · {fmtDate(data.snapshotInfo.capturedAt)}
			</span>
		{/if}
	</div>
	<div class="tb-right">
		<a href="/zlecenia/offer-{data.offer.id}" class="btn-ghost">← Edycja w panelu</a>
		<button class="btn-primary" onclick={printPage}>🖨️ Drukuj / PDF</button>
	</div>
</header>

<!-- ═══ PEPE OFERTA — 1:1 lift z /wolny-namiot-dla-pepego/oferta-b2b/oferta.html ═══ -->
<div class="doc">

	<!-- PAGE 1: COVER (personalizowana) -->
	<div class="page cover">
		<div class="cover-photo">
			<div class="cover-content">
				<div class="cover-logo">wolny <em>namiot.</em></div>
				<div class="cover-eyebrow">oferta #{data.offer.number} · dla {data.offer.clientName ?? 'ciebie'}</div>
				<h1>postaw <em>gdzie chcesz.</em><br />zrób <em>co chcesz.</em></h1>
				<p class="cover-sub">— dach plus reszta w cenie. twoja oferta na <em>{(data.offer.eventName ?? '').toLowerCase()}</em>, {eventRange(data.offer.eventStartDate, data.offer.eventEndDate).toLowerCase()}{data.offer.venue ? `, ${data.offer.venue.toLowerCase()}` : ''}.</p>
				<div class="cover-meta">
					<div class="cover-meta-item">
						<div class="label">kontakt{data.company?.tradeName ? '' : ' · patryk'}</div>
						<div class="value">{data.company?.phone ?? '796 886 222'}</div>
					</div>
					<div class="cover-meta-item">
						<div class="label">zasięg</div>
						<div class="value">południe <em>polski</em></div>
					</div>
					<div class="cover-meta-item">
						<div class="label">www</div>
						<div class="value">{(data.company?.www ?? 'wolnynamiot.pl').replace(/^https?:\/\//, '').replace(/^([^.]+)/, '$1')}<em></em></div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- PAGE 1b: PRIMARY TENT — hero "to bierzemy dla ciebie" -->
	{#if data.primaryTent}
		<div class="page hero-tent">
			<div class="page-header">
				<div class="logo">wolny <em>namiot.</em></div>
				<div class="page-num">01½ · twój namiot</div>
			</div>
			<div class="ht-body">
				<div class="ht-eyebrow">↯ dla ciebie wybieramy</div>
				<h2 class="ht-name">{data.primaryTent.name.toLowerCase()}</h2>
				<div class="ht-size">
					{#if data.primaryTent.widthM && data.primaryTent.lengthM}
						<span class="ht-dim">{data.primaryTent.widthM} × {data.primaryTent.lengthM} m</span>
						<span class="ht-dot">·</span>
						<span class="ht-area">{data.primaryTent.widthM * data.primaryTent.lengthM} m²</span>
						{#if data.primaryTent.qty > 1}
							<span class="ht-dot">·</span>
							<span class="ht-qty"><em>{data.primaryTent.qty}</em> szt.</span>
						{/if}
					{:else if data.primaryTent.sizeLabel}
						<span class="ht-dim">{data.primaryTent.sizeLabel}</span>
					{/if}
				</div>
				<div class="ht-photo-wrap">
					{#if data.primaryTent.mainPhotoUrl}
						<img src={data.primaryTent.mainPhotoUrl} alt={data.primaryTent.name} class="ht-photo" />
					{:else}
						<div class="ht-photo-placeholder">zdjęcie do wrzucenia</div>
					{/if}
				</div>
				<p class="ht-desc">
					— stawiamy na <em>{(data.offer.eventName ?? '').toLowerCase()}</em>{data.offer.venue ? `, w miejscu: ${data.offer.venue.toLowerCase()}` : ''}.
					Namiot jest wodoodporny, wytrzymuje wiatr, pasuje na równe i nierówne podłoże.
					Ze sobą bierzemy: kotwy / obciążniki, boki (jeśli potrzeba), oświetlenie.
					Stawiamy i składamy my — tobie zostaje event.
				</p>
			</div>
		</div>
	{/if}

	<!-- PAGE 2: OKAZJE MOSAIC -->
	<div class="page okazje-page dark">
		<div class="page-header">
			<div class="logo">wolny <em>namiot.</em></div>
			<div class="page-num">02 · gdzie stawiamy</div>
		</div>
		<div class="okazje-intro">
			<div class="eyebrow">↯ 8 okazji · wszystko pod jednym dachem</div>
			<h2>od festynu<br />po urodziny <em>córki.</em></h2>
			<p>— namiot działa wszędzie. wesele i stypa. jarmark i protest. konferencja i integracja firmowa. dopasowujemy rozmiar pod event, reszta w cenie.</p>
		</div>
		<div class="okazje-grid">
			<div class="okazja-tile hero" style="background-image: url('/photos/okazja-namiot-11.jpg');">
				<div class="okazja-num">↯ 01</div>
				<div class="okazja-title">urodziny <em>córki</em></div>
				<div class="okazja-meta">pierwszy event wolnego namiotu · 7-latki · 2025 · stąd się zaczęło</div>
			</div>
			<div class="okazja-tile" style="background-image: url('/photos/jarmark-festyn.jpg');">
				<div class="okazja-num">↯ 02</div>
				<div class="okazja-title">jarmark <em>/ festyn</em></div>
				<div class="okazja-meta">osp · gmina · lokalne wydarzenia</div>
			</div>
			<div class="okazja-tile" style="background-image: url('/photos/okazja-namiot-10.jpg');">
				<div class="okazja-num">↯ 03</div>
				<div class="okazja-title">uroczystości<br /><em>rodzinne</em></div>
				<div class="okazja-meta">wesele · komunia · chrzciny · stypa · 4×8 do 6×12</div>
			</div>
			<div class="okazja-tile panoramic" style="background-image: url('/photos/opinie-event.jpg');">
				<div class="okazja-num">↯ 04</div>
				<div class="okazja-title">event <em>firmowy</em></div>
				<div class="okazja-meta">integracja · konferencja outdoor · piknik zakładowy · do 300 osób</div>
			</div>
			<div class="okazja-tile" style="background-image: url('/photos/namiot-2.webp');">
				<div class="okazja-num">↯ 05</div>
				<div class="okazja-title">protest <em>/ zgromadzenie</em></div>
				<div class="okazja-meta">ekspres 4,5×3 · punkt info · 12h reakcja</div>
			</div>
			<div class="okazja-tile" style="background-image: url('/photos/namiot-6.webp');">
				<div class="okazja-num">↯ 06</div>
				<div class="okazja-title">biesiada <em>w górach</em></div>
				<div class="okazja-meta">zakopane · sucha beskidzka · 6×12</div>
			</div>
			<div class="okazja-tile" style="background-image: url('/photos/okazja-namiot-13.jpg');">
				<div class="okazja-num">↯ 07</div>
				<div class="okazja-title">obsługujemy <em>domy działkowca</em></div>
				<div class="okazja-meta">rod · piknik · do 50 osób</div>
			</div>
		</div>
	</div>

	<!-- PAGE 3: NAMIOTY EKSPRESOWE -->
	<div class="page namioty-page">
		<div class="page-header">
			<div class="logo">wolny <em>namiot.</em></div>
			<div class="page-num">03 · oferta · ekspresy</div>
		</div>
		<div class="namioty-intro">
			<div class="eyebrow">↯ odbiór własny · sam stawiasz w 15 min</div>
			<h2>namioty <em>ekspresowe.</em></h2>
			<p>— ekspresy na szybkie pikniki, protesty, punkty info, stoiska targowe. odbierasz własnym transportem z jędrzejowa, sam stawiasz w 15-20 min (2 osoby).</p>
		</div>
		<div class="tent-grid">
			<div class="tent-card">
				<div class="tent-photo" style="background-image: url('/photos/namiot-3.webp');"></div>
				<div class="tent-body">
					<span class="tent-tag">ekspres · odbiór własny</span>
					<div class="tent-size">4,5 <em>× 3 m</em></div>
					<div class="tent-capacity">do 15 osób · punkt info / bar</div>
					<div class="tent-prices">
						<div class="tent-price-row">
							<span class="label">sam namiot</span>
							<span class="price">200<em> zł/dzień</em></span>
						</div>
						<div class="tent-price-row">
							<span class="label">+ stoły + krzesła</span>
							<span class="price">400<em> zł/dzień</em></span>
						</div>
					</div>
				</div>
			</div>
			<div class="tent-card">
				<div class="tent-photo" style="background-image: url('/photos/namiot-4.webp');"></div>
				<div class="tent-body">
					<span class="tent-tag">ekspres · odbiór własny</span>
					<div class="tent-size">6 <em>× 3 m</em></div>
					<div class="tent-capacity">do 20 osób · kramy / strefy</div>
					<div class="tent-prices">
						<div class="tent-price-row">
							<span class="label">sam namiot</span>
							<span class="price">300<em> zł/dzień</em></span>
						</div>
						<div class="tent-price-row">
							<span class="label">+ stoły + krzesła</span>
							<span class="price">800<em> zł/dzień</em></span>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="summary-row">
			<h3>ekspres <em>= jedna decyzja.</em></h3>
			<p class="notes">— <strong>ekspres + stoły + krzesła w komplecie.</strong> samodzielny montaż w 15-20 min przez 2 osoby. idealny na akcje spontaniczne, pikniki integracyjne, stoiska na targach, protesty, punkty informacyjne. <strong>odbiór osobisty z Jędrzejowa lub dostawa na miejsce — dopłata od 3 zł/km.</strong></p>
		</div>
	</div>

	<!-- PAGE 4: NAMIOTY DUŻE -->
	<div class="page namioty-page">
		<div class="page-header">
			<div class="logo">wolny <em>namiot.</em></div>
			<div class="page-num">04 · oferta · namioty duże</div>
		</div>
		<div class="namioty-intro">
			<div class="eyebrow">↯ z montażem · my stawiamy, my demontujemy</div>
			<h2>namioty <em>duże.</em></h2>
			<p>— na konferencje outdoor, integracje firmowe, wesela, komunie, jarmarki. przyjeżdżamy dzień przed lub rano, stawiamy w 2-4h, po evencie demontujemy (1-2h, bez was).</p>
		</div>
		<div class="tent-grid">
			<div class="tent-card">
				<div class="tent-photo" style="background-image: url('/photos/namiot-5.webp');"></div>
				<div class="tent-body">
					<span class="tent-tag">duży · z montażem</span>
					<div class="tent-size">4 <em>× 8 m</em></div>
					<div class="tent-capacity">30–50 osób · event kameralny</div>
					<div class="tent-prices">
						<div class="tent-price-row">
							<span class="label">sam namiot</span>
							<span class="price">1 200<em> zł/dzień</em></span>
						</div>
						<div class="tent-price-row">
							<span class="label">+ stoły + krzesła</span>
							<span class="price">1 500<em> zł/dzień</em></span>
						</div>
					</div>
				</div>
			</div>
			<div class="tent-card">
				<div class="tent-photo" style="background-image: url('/photos/namiot-1.webp');"></div>
				<div class="tent-body">
					<span class="tent-tag">duży · z montażem</span>
					<div class="tent-size">5 <em>× 10 m</em></div>
					<div class="tent-capacity">40–60 osób · event średni</div>
					<div class="tent-prices">
						<div class="tent-price-row">
							<span class="label">sam namiot</span>
							<span class="price">1 200<em> zł/dzień</em></span>
						</div>
						<div class="tent-price-row">
							<span class="label">+ stoły + krzesła</span>
							<span class="price">1 600<em> zł/dzień</em></span>
						</div>
					</div>
				</div>
			</div>
			<div class="tent-card wide">
				<div class="tent-photo" style="background-image: url('/photos/pdf-duzy-6x12.jpg');"></div>
				<div class="tent-body">
					<span class="tent-tag">duży · z montażem</span>
					<div class="tent-size">6 <em>× 12 m</em></div>
					<div class="tent-capacity">60–80 osób · konferencja / festyn / integracja firmowa</div>
					<div class="tent-prices">
						<div class="tent-price-row">
							<span class="label">sam namiot</span>
							<span class="price">1 300<em> zł/dzień</em></span>
						</div>
						<div class="tent-price-row">
							<span class="label">+ stoły + krzesła</span>
							<span class="price">1 600<em> zł/dzień</em></span>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="summary-row">
			<h3>co wchodzi <em>w cenę:</em></h3>
			<p class="notes">— <strong>dach + boki + konstrukcja + mocowania + girlandy led + montaż i demontaż + transport w cenie do 100 km od Jędrzejowa.</strong> w pakietach "+ stoły + krzesła": stoły prostokątne + krzesła plastikowe. dalej niż 100 km — dopłata ustalana indywidualnie. faktura vat 23% dla firm i instytucji. rabaty dla powtarzających się eventów.</p>
		</div>
	</div>

	<!-- PAGE 5: TWOJA OFERTA (personalizacja) + PROCES + KONTAKT -->
	<div class="page kontakt-page dark">
		<div class="page-header">
			<div class="logo">wolny <em>namiot.</em></div>
			<div class="page-num">05 · twoja oferta i kontakt</div>
		</div>

		<!-- PERSONALIZACJA klienta — razem z kalkulacją -->
		<div class="kontakt-hero">
			<div class="eyebrow">↯ oferta dla {data.offer.clientName ?? 'ciebie'}</div>
			<h2>{(data.offer.eventName ?? '').toLowerCase()}.<br /><em>{eventRange(data.offer.eventStartDate, data.offer.eventEndDate).toLowerCase()}</em></h2>
			<p>— poniżej konkretna wycena dla twojego eventu. {data.offer.venue ? data.offer.venue.toLowerCase() + '. ' : ''}{data.items.length > 0 ? 'cena łączna: ' : ''}<strong style="font-family:'Archivo Black',sans-serif;font-size:28px;color:var(--zarowka);text-transform:lowercase;font-style:normal;font-weight:900;">{fmtZl(data.offer.totalCents)}</strong> <span style="font-size:12px;color:rgba(245,241,230,0.55);">brutto, vat 23% wliczony</span></p>
		</div>

		{#if data.items.length > 0}
			<div style="background:rgba(245,241,230,0.05); border-left:3px solid var(--zarowka); padding:14px 18px; margin:18px 0;">
				<div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2.5px;color:var(--zarowka);font-weight:700;text-transform:lowercase;margin-bottom:10px;">↯ co dostajesz w pakiecie</div>
				<ul style="list-style:none; padding:0; margin:0;">
					{#each data.items as it}
						<li style="font-family:'Archivo',sans-serif;font-size:13px;color:rgba(245,241,230,0.85);padding:4px 0;display:flex;justify-content:space-between;">
							<span>{it.description.toLowerCase()}{it.quantity > 1 ? ` · ${it.quantity} szt.` : ''}</span>
							<span style="font-family:'Instrument Serif',serif;font-style:italic;color:{it.unitPriceCents === 0 ? 'rgba(245,241,230,0.45)' : 'var(--zarowka)'};">{it.unitPriceCents === 0 ? 'w zestawie' : fmtZl(it.lineTotalCents)}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- PROCES 4 kroki -->
		<div style="margin-top:24px;margin-bottom:8px;">
			<div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:3px;color:var(--zarowka);font-weight:700;text-transform:lowercase;margin-bottom:8px;">↯ jak rezerwujemy</div>
			<h3 style="font-family:'Archivo Black',sans-serif;font-size:28px;color:var(--plotno);line-height:0.9;letter-spacing:-0.03em;text-transform:lowercase;">4 kroki.<br /><em style="font-family:'Instrument Serif',serif;font-style:italic;font-weight:500;color:var(--zarowka);text-transform:none;">do twojego dnia.</em></h3>
		</div>
		<div class="proces-compact">
			<div class="proces-step">
				<div class="num">01</div>
				<h4>zapytanie</h4>
				<p>mail lub telefon. przedstawiasz swój pomysł — co, gdzie, kiedy, ilu ludzi.</p>
			</div>
			<div class="proces-step">
				<div class="num">02</div>
				<h4>oferta</h4>
				<p>konkret: rozmiar, cena, vat, termin. na maila w 24h.</p>
			</div>
			<div class="proces-step">
				<div class="num">03</div>
				<h4>montaż</h4>
				<p>dzień przed eventem lub rano. 2-4h, bez was.</p>
			</div>
			<div class="proces-step">
				<div class="num">04</div>
				<h4>event</h4>
				<p>my znikamy. następnego dnia demontaż, 1-2h.</p>
			</div>
		</div>

		<!-- CTA yellow box -->
		<div style="margin:28px 0 20px; background:var(--zarowka); color:var(--atrament); padding:22px 28px; display:flex; align-items:center; justify-content:space-between; gap:20px; flex-wrap:wrap;">
			<div style="flex:1; min-width:200px;">
				<div style="font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:2.5px; text-transform:lowercase; color:var(--atrament-700); font-weight:700; margin-bottom:8px;">↯ akceptujesz?</div>
				<div style="font-family:'Archivo Black',sans-serif; font-size:26px; letter-spacing:-0.03em; text-transform:lowercase; color:var(--atrament); line-height:1;">zadzwoń. <em style="font-family:'Instrument Serif',serif; font-style:italic; font-weight:500; color:var(--pomidor);">odpiszemy w 2h.</em></div>
			</div>
			<div style="background:var(--atrament); color:var(--zarowka); padding:12px 20px; text-align:center;">
				<div style="font-family:'Archivo Black',sans-serif; font-size:22px; letter-spacing:-0.025em; text-transform:lowercase; line-height:1;">796 <em style="font-family:'Instrument Serif',serif; font-style:italic; font-weight:500; color:var(--zarowka);">886 222</em></div>
				<div style="font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:1.5px; text-transform:lowercase; color:rgba(249,217,74,0.7); margin-top:4px;">kontakt@wolnynamiot.pl</div>
			</div>
		</div>

		<!-- KONTAKT info + QR -->
		<div class="kontakt-info">
			<div class="kontakt-info-col">
				<div class="label">telefon</div>
				<div class="value">{data.company?.phone ?? '796 886 222'}</div>
				<div class="sub">pon–ndz · 8:00–20:00</div>
			</div>
			<div class="kontakt-info-col">
				<div class="label">e-mail</div>
				<div class="value">{data.company?.email ?? 'kontakt@wolnynamiot.pl'}</div>
				<div class="sub">odpisujemy w 2h w godz. 8–20</div>
			</div>
			<div class="kontakt-info-col">
				<div class="label">siedziba · zasięg</div>
				<div class="value">{(data.company?.address ?? 'Jędrzejów, południe Polski').toLowerCase()}</div>
				<div class="sub">kielce · kraków · rzeszów · lublin · warszawa · łódź · sosnowiec · zakopane · busko-zdrój · wolbrom · zawiercie · 250 km</div>
			</div>
			<div class="kontakt-info-col">
				<div class="label">www</div>
				<div class="value">{(data.company?.www ?? 'wolnynamiot.pl').replace(/^https?:\/\//, '')}</div>
				<div class="sub">cennik · realizacje · zastosowania · faq</div>
			</div>
		</div>
		<div class="kontakt-qr-wrap">
			<div class="qr-svg">{@html data.qrSvg}</div>
			<div class="qr-copy">
				<div class="label">↯ zeskanuj</div>
				<div class="value">zobacz więcej realizacji</div>
				<div class="sub">{data.qrTargetUrl.replace(/^https?:\/\//, '')}</div>
			</div>
		</div>
		<div class="kontakt-foot">
			<span>wolny namiot · est. 2025 · jędrzejów · południe polski</span>
			<span>oferta {data.offer.number} · {fmtDate(data.offer.createdAt)}</span>
		</div>
	</div>

</div>

<style>
	/* TOPBAR non-print */
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
		font-family: var(--font-mono);
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

	/* ═══ PEPE DOC — lift 1:1 z oferta.html ═══ */
	.doc {
		--plotno: #F5F1E6;
		--plotno-100: #FAF7EE;
		--plotno-300: #E8DFC9;
		--atrament: #0A0A0A;
		--atrament-500: #4A4A4A;
		--atrament-700: #2A2A2A;
		--trawa: #1F7A3F;
		--granat: #132B4D;
		--zarowka: #E8A933;
		--pomidor: #D93A1F;
		--pomidor-dark: #A82510;
		--burak: #8B1E3F;
		font-family: 'Archivo', sans-serif;
		color: var(--atrament);
		background: var(--plotno);
	}
	.doc * { margin: 0; padding: 0; box-sizing: border-box; }

	.page {
		width: 210mm;
		min-height: 297mm;
		margin: 0 auto;
		page-break-after: always;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background: var(--plotno);
	}
	.page:last-child { page-break-after: auto; }

	.doc h1, .doc h2, .doc h3, .doc h4 {
		font-family: 'Archivo Black', sans-serif;
		text-transform: lowercase;
		letter-spacing: -0.035em;
		line-height: 0.9;
		font-weight: 900;
	}
	.doc h1 em, .doc h2 em, .doc h3 em, .doc h4 em {
		font-family: 'Instrument Serif', serif;
		font-style: italic;
		font-weight: 500;
		text-transform: none;
		letter-spacing: -0.015em;
	}

	/* PAGE HEADER */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16mm 18mm 12px;
		border-bottom: 1px solid var(--plotno-300);
	}
	.page-header .logo {
		font-family: 'Archivo Black', sans-serif;
		font-size: 20px;
		text-transform: lowercase;
		letter-spacing: -0.03em;
		color: var(--atrament);
	}
	.page-header .logo em {
		font-family: 'Instrument Serif', serif;
		font-style: italic;
		font-weight: 500;
		color: var(--pomidor);
		text-transform: none;
	}
	.page-header .page-num {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		letter-spacing: 2px;
		text-transform: lowercase;
		color: var(--atrament-500);
	}
	.dark .page-header { border-bottom-color: rgba(245,241,230,0.15); }
	.dark .page-header .logo { color: var(--plotno); }
	.dark .page-header .logo em { color: var(--zarowka); }
	.dark .page-header .page-num { color: rgba(245,241,230,0.5); }

	/* PAGE 1: COVER */
	.cover { background: var(--atrament); color: var(--plotno); }
	.cover-photo {
		flex: 1;
		background-image: url('/photos/namiot-8.webp');
		background-size: cover;
		background-position: center;
		position: relative;
		min-height: 297mm;
	}
	.cover-photo::after {
		content: '';
		position: absolute; inset: 0;
		background: linear-gradient(180deg, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.85) 100%);
	}
	.cover-content {
		position: absolute;
		bottom: 0; left: 0; right: 0;
		padding: 40px 36px;
		z-index: 2;
	}
	.cover-logo {
		font-family: 'Archivo Black', sans-serif;
		font-size: 32px;
		text-transform: lowercase;
		letter-spacing: -0.03em;
		color: var(--plotno);
		margin-bottom: 40px;
	}
	.cover-logo em {
		font-family: 'Instrument Serif', serif;
		font-style: italic;
		font-weight: 500;
		color: var(--zarowka);
		text-transform: none;
	}
	.cover-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		letter-spacing: 3px;
		text-transform: lowercase;
		color: var(--zarowka);
		font-weight: 700;
		margin-bottom: 16px;
	}
	.cover h1 {
		font-size: 64px;
		color: var(--plotno);
		margin-bottom: 20px;
		line-height: 0.88;
	}
	.cover h1 em { color: var(--zarowka); }
	.cover-sub {
		font-family: 'Instrument Serif', serif;
		font-style: italic;
		font-size: 20px;
		color: rgba(245,241,230,0.85);
		margin-bottom: 40px;
		max-width: 480px;
		line-height: 1.35;
	}
	.cover-sub em {
		color: var(--zarowka);
		font-weight: 500;
	}
	.cover-meta {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 24px;
		padding-top: 24px;
		border-top: 1px solid rgba(245,241,230,0.2);
	}
	.cover-meta-item .label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 9px;
		letter-spacing: 2px;
		text-transform: lowercase;
		color: rgba(245,241,230,0.5);
		margin-bottom: 4px;
	}
	.cover-meta-item .value {
		font-family: 'Archivo Black', sans-serif;
		font-size: 14px;
		text-transform: lowercase;
		letter-spacing: -0.02em;
		color: var(--plotno);
	}
	.cover-meta-item .value em {
		font-family: 'Instrument Serif', serif;
		font-style: italic;
		font-weight: 500;
		color: var(--zarowka);
	}

	/* PAGE 2: OKAZJE */
	.okazje-page { background: var(--atrament); color: var(--plotno); }
	.okazje-intro { padding: 14px 18mm 18px; }
	.okazje-intro .eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px; letter-spacing: 3px; text-transform: lowercase;
		color: var(--zarowka); font-weight: 700; margin-bottom: 8px;
	}
	.okazje-intro h2 { font-size: 42px; color: var(--plotno); line-height: 0.9; margin-bottom: 10px; }
	.okazje-intro h2 em { color: var(--zarowka); }
	.okazje-intro p {
		font-family: 'Instrument Serif', serif; font-style: italic;
		font-size: 14px; color: rgba(245,241,230,0.75); line-height: 1.4; max-width: 480px;
	}
	.okazje-grid {
		flex: 1; display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		gap: 4px; padding: 0 18mm 18mm;
		min-height: 200mm;
	}
	.okazja-tile {
		position: relative; overflow: hidden;
		background-size: cover; background-position: center;
		display: flex; flex-direction: column; justify-content: flex-end;
		padding: 14px; min-height: 0;
	}
	.okazja-tile::before {
		content: ''; position: absolute; inset: 0;
		background: linear-gradient(180deg, rgba(10,10,10,0.15) 0%, rgba(10,10,10,0.85) 100%);
	}
	.okazja-tile.hero { grid-column: span 2; grid-row: span 2; }
	.okazja-tile.panoramic { grid-column: span 3; }
	.okazja-num {
		font-family: 'JetBrains Mono', monospace;
		font-size: 9px; letter-spacing: 2px; text-transform: lowercase;
		color: var(--zarowka); font-weight: 700;
		position: relative; z-index: 2; margin-bottom: 4px;
	}
	.okazja-title {
		font-family: 'Archivo Black', sans-serif;
		font-size: 18px; text-transform: lowercase; letter-spacing: -0.025em;
		color: var(--plotno); line-height: 0.95;
		position: relative; z-index: 2; margin-bottom: 4px;
	}
	.okazja-tile.hero .okazja-title { font-size: 32px; }
	.okazja-tile.panoramic .okazja-title { font-size: 24px; }
	.okazja-title em {
		font-family: 'Instrument Serif', serif; font-style: italic;
		font-weight: 500; color: var(--zarowka); text-transform: none;
	}
	.okazja-meta {
		font-family: 'JetBrains Mono', monospace;
		font-size: 8px; letter-spacing: 1.5px; text-transform: lowercase;
		color: rgba(245,241,230,0.65);
		position: relative; z-index: 2;
	}

	/* PAGES 3-4: NAMIOTY */
	.namioty-page { background: var(--plotno); padding: 0 18mm 16mm; }
	.namioty-intro { padding: 10px 0 18px; }
	.namioty-intro .eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px; letter-spacing: 3px; text-transform: lowercase;
		color: var(--pomidor-dark); font-weight: 700; margin-bottom: 8px;
	}
	.namioty-intro h2 { font-size: 36px; color: var(--atrament); line-height: 0.92; margin-bottom: 8px; }
	.namioty-intro h2 em { color: var(--pomidor); }
	.namioty-intro p {
		font-family: 'Instrument Serif', serif; font-style: italic;
		font-size: 13px; color: var(--atrament-500); line-height: 1.4; max-width: 440px;
	}
	.tent-grid {
		display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: min-content;
		gap: 14px; flex: 1; align-content: center;
	}
	.tent-card {
		background: white; border: 1px solid var(--plotno-300);
		overflow: hidden; display: flex; flex-direction: column;
	}
	.tent-card.wide { grid-column: span 2; flex-direction: row; }
	.tent-photo {
		background-size: cover; background-position: center;
		aspect-ratio: 16/10;
	}
	.tent-card.wide .tent-photo { aspect-ratio: unset; width: 45%; flex-shrink: 0; }
	.tent-body {
		padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 8px; flex: 1;
	}
	.tent-card.wide .tent-body { justify-content: center; }
	.tent-tag {
		display: inline-block;
		font-family: 'JetBrains Mono', monospace;
		font-size: 9px; letter-spacing: 1.8px; text-transform: lowercase;
		color: var(--pomidor-dark); font-weight: 700;
		padding: 3px 8px; background: rgba(217,58,31,0.08); align-self: flex-start;
	}
	.tent-size {
		font-family: 'Archivo Black', sans-serif;
		font-size: 30px; letter-spacing: -0.03em; color: var(--atrament); line-height: 0.95;
	}
	.tent-size em {
		font-family: 'Instrument Serif', serif; font-style: italic;
		font-weight: 500; color: var(--pomidor);
	}
	.tent-capacity {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px; letter-spacing: 1.5px; text-transform: lowercase; color: var(--atrament-500);
	}
	.tent-prices {
		display: flex; flex-direction: column; gap: 5px;
		margin-top: 4px; padding-top: 10px; border-top: 1px dashed var(--plotno-300);
	}
	.tent-price-row { display: flex; justify-content: space-between; align-items: baseline; }
	.tent-price-row .label { font-family: 'Archivo', sans-serif; font-size: 12px; color: var(--atrament-500); }
	.tent-price-row .price {
		font-family: 'Archivo Black', sans-serif;
		font-size: 17px; letter-spacing: -0.02em; color: var(--atrament);
	}
	.tent-price-row .price em {
		font-family: 'Instrument Serif', serif; font-style: italic;
		font-weight: 500; color: var(--pomidor); font-size: 12px;
	}
	.summary-row {
		background: var(--plotno-100); border: 2px solid var(--atrament);
		margin-top: 16px; padding: 18px 22px;
	}
	.summary-row h3 { font-size: 20px; color: var(--atrament); margin-bottom: 10px; letter-spacing: -0.02em; }
	.summary-row h3 em { color: var(--pomidor); }
	.summary-row .notes {
		font-family: 'Instrument Serif', serif; font-style: italic;
		font-size: 13px; color: var(--atrament-500); line-height: 1.45;
	}
	.summary-row .notes strong {
		font-family: 'Archivo Black', sans-serif; font-weight: 900;
		color: var(--atrament); text-transform: lowercase; letter-spacing: -0.015em; font-style: normal;
	}

	/* PAGE 5: KONTAKT */
	.kontakt-page { background: var(--atrament); color: var(--plotno); padding: 0 18mm 18mm; }
	.kontakt-hero { margin: 30px 0 24px; }
	.kontakt-hero .eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px; letter-spacing: 3px; text-transform: lowercase;
		color: var(--zarowka); font-weight: 700; margin-bottom: 12px;
	}
	.kontakt-hero h2 { font-size: 48px; color: var(--plotno); line-height: 0.9; margin-bottom: 16px; }
	.kontakt-hero h2 em { color: var(--zarowka); }
	.kontakt-hero p {
		font-family: 'Instrument Serif', serif; font-style: italic;
		font-size: 16px; color: rgba(245,241,230,0.8); line-height: 1.4; max-width: 560px;
	}
	.proces-compact {
		display: grid; grid-template-columns: repeat(4, 1fr);
		gap: 10px; margin: 20px 0 30px;
	}
	.proces-step {
		background: rgba(245,241,230,0.05); border-left: 3px solid var(--zarowka);
		padding: 14px 12px;
	}
	.proces-step .num {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px; letter-spacing: 2px; color: var(--zarowka); font-weight: 700; margin-bottom: 6px;
	}
	.proces-step h4 {
		font-size: 13px; color: var(--plotno); margin-bottom: 4px; letter-spacing: -0.02em;
	}
	.proces-step h4 em { color: var(--zarowka); font-size: 13px; }
	.proces-step p {
		font-family: 'Instrument Serif', serif; font-style: italic;
		font-size: 11px; color: rgba(245,241,230,0.7); line-height: 1.3;
	}
	.kontakt-info {
		background: var(--plotno); color: var(--atrament);
		padding: 28px 32px; margin-top: auto;
		display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
	}
	.kontakt-info-col .label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 9px; letter-spacing: 2.5px; text-transform: lowercase;
		color: var(--atrament-500); margin-bottom: 6px;
	}
	.kontakt-info-col .value {
		font-family: 'Archivo Black', sans-serif;
		font-size: 22px; letter-spacing: -0.025em; text-transform: lowercase;
		color: var(--atrament); line-height: 1;
	}
	.kontakt-info-col .value em {
		font-family: 'Instrument Serif', serif; font-style: italic;
		font-weight: 500; color: var(--pomidor);
	}
	.kontakt-info-col .sub {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px; letter-spacing: 1.5px; color: var(--atrament-500); margin-top: 6px;
	}
	.kontakt-foot {
		padding-top: 16px; margin-top: 20px;
		border-top: 1px solid rgba(245,241,230,0.15);
		display: flex; justify-content: space-between;
		font-family: 'JetBrains Mono', monospace;
		font-size: 9px; letter-spacing: 2px; color: rgba(245,241,230,0.5); text-transform: lowercase;
	}

	/* PRINT */
	@media print {
		@page { size: A4 portrait; margin: 0; }
		.no-print { display: none !important; }
		.doc { background: var(--plotno); }
		.page { page-break-after: always; }
		.page:last-child { page-break-after: auto; }
		* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
	}

	/* Mobile preview */
	@media (max-width: 720px) {
		.page { width: 100%; min-height: auto; }
		.cover h1 { font-size: 42px; }
		.okazje-grid { grid-template-columns: 1fr 1fr; grid-template-rows: auto; }
		.okazja-tile.hero, .okazja-tile.panoramic { grid-column: span 2; }
		.tent-grid { grid-template-columns: 1fr; }
		.tent-card.wide { flex-direction: column; }
		.tent-card.wide .tent-photo { width: 100%; aspect-ratio: 16/10; }
		.proces-compact { grid-template-columns: 1fr 1fr; }
		.kontakt-info { grid-template-columns: 1fr; }
	}

	/* SNAPSHOT badge w topbar */
	.tb-snapshot-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.25rem 0.6rem;
		background: color-mix(in srgb, #eab308 22%, transparent);
		color: #713f12;
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		font-weight: 600;
		border-radius: 4px;
	}

	/* ═══ PAGE 1b: PRIMARY TENT HERO ═══ */
	.hero-tent {
		background: var(--plotno, #f5f1e6);
		padding: 48px 56px;
		display: flex;
		flex-direction: column;
	}
	.ht-body {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 8px;
	}
	.ht-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		letter-spacing: 3px;
		color: var(--pomidor, #c44d30);
		font-weight: 700;
		text-transform: lowercase;
	}
	.ht-name {
		font-family: 'Archivo Black', sans-serif;
		font-size: 56px;
		line-height: 0.95;
		letter-spacing: -0.04em;
		color: var(--atrament, #1a1a1a);
		text-transform: lowercase;
		margin: 0;
	}
	.ht-size {
		font-family: 'Instrument Serif', serif;
		font-size: 24px;
		color: var(--atrament-700, #333);
	}
	.ht-dim, .ht-area, .ht-qty, .ht-dot {
		display: inline-block;
	}
	.ht-qty em {
		font-family: 'Archivo Black', sans-serif;
		font-style: normal;
		color: var(--pomidor, #c44d30);
	}
	.ht-dot {
		color: var(--atrament-500, #888);
		margin: 0 6px;
	}
	.ht-photo-wrap {
		margin: 12px 0;
		width: 100%;
		max-height: 520px;
		overflow: hidden;
		border: 3px solid var(--atrament, #1a1a1a);
	}
	.ht-photo {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.ht-photo-placeholder {
		padding: 60px;
		text-align: center;
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: var(--atrament-500, #888);
		background: color-mix(in srgb, var(--atrament, #1a1a1a) 5%, transparent);
	}
	.ht-desc {
		font-family: 'Archivo', sans-serif;
		font-size: 14px;
		line-height: 1.55;
		color: var(--atrament-700, #333);
		max-width: 680px;
	}
	.ht-desc em {
		font-family: 'Instrument Serif', serif;
		font-style: italic;
		color: var(--pomidor, #c44d30);
	}

	/* ═══ KONTAKT QR ═══ */
	.kontakt-qr-wrap {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-top: 20px;
		padding: 18px 22px;
		background: var(--plotno, #f5f1e6);
		color: var(--atrament, #1a1a1a);
	}
	.qr-svg {
		width: 120px;
		height: 120px;
		flex-shrink: 0;
	}
	.qr-svg :global(svg) {
		width: 100%;
		height: 100%;
	}
	.qr-copy .label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 9px;
		letter-spacing: 2.5px;
		color: var(--pomidor, #c44d30);
		font-weight: 700;
		text-transform: lowercase;
		margin-bottom: 6px;
	}
	.qr-copy .value {
		font-family: 'Archivo Black', sans-serif;
		font-size: 20px;
		color: var(--atrament, #1a1a1a);
		text-transform: lowercase;
		line-height: 1.1;
	}
	.qr-copy .sub {
		margin-top: 6px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		color: var(--atrament-500, #888);
		word-break: break-all;
	}
</style>
