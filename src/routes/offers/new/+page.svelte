<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	const ICONS: Record<string, string> = {
		dashboard: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9ZM9 22V12h6v10',
		leads: 'M22 12h-4l-3 9L9 3l-3 9H2',
		offers: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
		calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
		tents: 'M3 20 L12 4 L21 20 Z M8 20 L12 13 L16 20',
		clients: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
		bookings: 'M3 3h18v18H3zM3 9h18M9 21V9',
		photos: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M21 15l-5-5L5 21',
		pricing: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
		settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'
	};
	const MAIN = [
		{ id: 'dashboard', label: 'Home', href: '/dashboard' },
		{ id: 'zlecenia', label: 'Zlecenia', href: '/zlecenia', active: true },
		{ id: 'tents', label: 'Magazyn', href: '/magazyn' }
	];
	const ADMIN = [{ id: 'settings', label: 'Ustaw.', href: '/settings' }];

	// ─── STATE ───────────────────────────────────────────
	type Line = {
		itemId: string | null;
		desc: string;
		qty: number;
		days: number;
		unitPrice: number; // zł / dzień / sztuka
	};

	let clientMode = $state<'existing' | 'new'>('existing');
	let selectedClientId = $state<string>(data.clients[0]?.id ?? '');
	let newClientName = $state('');
	let newClientPhone = $state('');
	let newClientEmail = $state('');

	let eventName = $state('');
	let eventStartDate = $state('');
	let eventEndDate = $state('');
	let venue = $state('');
	let notes = $state('');

	let selectedPackageId = $state<string>('');

	let lines = $state<Line[]>([]);

	// Auto-calc days from dates
	const days = $derived.by(() => {
		if (!eventStartDate || !eventEndDate) return 1;
		const s = new Date(eventStartDate);
		const e = new Date(eventEndDate);
		const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
		return Math.max(1, diff);
	});

	// Update all line.days when event duration changes
	$effect(() => {
		lines.forEach((l) => {
			if (l.days === 1) l.days = days;
		});
	});

	function addLine() {
		lines = [...lines, { itemId: null, desc: '', qty: 1, days, unitPrice: 0 }];
	}

	function removeLine(idx: number) {
		lines = lines.filter((_, i) => i !== idx);
	}

	function onItemChange(idx: number, itemId: string) {
		const it = data.items.find((x) => x.id === itemId);
		if (!it) return;
		lines[idx].itemId = itemId;
		lines[idx].desc = it.name;
		lines[idx].unitPrice = it.pricePerDayCents ? it.pricePerDayCents / 100 : 0;
	}

	function applyPackage(pkgId: string) {
		selectedPackageId = pkgId;
		const p = data.packages.find((x) => x.id === pkgId);
		if (!p) return;
		// Pre-fill lines z pakietu (jako custom description bo pakiet nie mapuje się 1:1 na items)
		lines = [
			{
				itemId: null,
				desc: `${p.name} (pakiet)`,
				qty: 1,
				days: 1, // pakiet = 1 event, nie per day
				unitPrice: p.priceFromCents / 100
			}
		];
	}

	function lineTotal(l: Line) {
		return l.qty * l.days * l.unitPrice;
	}

	const subtotal = $derived(lines.reduce((s, l) => s + lineTotal(l), 0));
	const vat = $derived(subtotal - subtotal / 1.23); // inverse, bo ceny brutto (jak w cenniku)
	const netto = $derived(subtotal - vat);

	function fmtZl(zl: number) {
		return zl.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
	}
</script>

<svelte:head>
	<title>Nowa oferta · Wolny Namiot panel</title>
</svelte:head>

<div class="app">
	<aside class="rail">
		<a href="/" class="logo"><span class="logo-mark">wn</span></a>
		<nav class="rail-nav">
			{#each MAIN as nav}
				<a href={nav.href} class="rail-item" class:active={nav.active}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
						<path d={ICONS[nav.id]} />
					</svg>
					<span class="rail-label">{nav.label}</span>
					{#if nav.active}<div class="rail-indicator"></div>{/if}
				</a>
			{/each}
			<div class="rail-sep"></div>
			{#each ADMIN as it}
				<a href={it.href} class="rail-item">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
						<path d={ICONS[it.id]} />
					</svg>
					<span class="rail-label">{it.label}</span>
				</a>
			{/each}
		</nav>
		<div class="rail-foot">
			<button class="theme-btn" type="button" aria-label="Motyw">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
				</svg>
			</button>
			<a href="/profile" class="avatar-link">
				<span class="avatar">{data.user.name.charAt(0)}</span>
				<span class="avatar-dot"></span>
			</a>
			<a href="/auth/logout" class="logout-link">Wyloguj</a>
		</div>
	</aside>

	<main class="main">
		<header class="topbar">
			<div class="top-left">
				<a href="/offers" class="back">← Oferty</a>
				<h1>Nowa oferta</h1>
				<span class="top-date">Kalkulator + Resend (draft → wyślij)</span>
			</div>
			<div class="top-right">
				<span class="preview-num">Numer: auto</span>
			</div>
		</header>

		<form method="POST" action="?/create" use:enhance class="offer-form">
			<div class="content">
				<!-- 1. Klient -->
				<section class="card">
					<header class="card-head">
						<h2>1. Klient</h2>
						<div class="seg">
							<button
								type="button"
								class="seg-btn"
								class:active={clientMode === 'existing'}
								onclick={() => (clientMode = 'existing')}>Wybierz istniejącego</button
							>
							<button
								type="button"
								class="seg-btn"
								class:active={clientMode === 'new'}
								onclick={() => (clientMode = 'new')}>+ Nowy klient</button
							>
						</div>
					</header>
					<div class="card-body">
						{#if clientMode === 'existing'}
							<label class="field">
								<span>Klient</span>
								<select name="clientId" bind:value={selectedClientId} required>
									{#each data.clients as c}
										<option value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}{c.phone ? ` · ${c.phone}` : ''}</option>
									{/each}
								</select>
							</label>
						{:else}
							<input type="hidden" name="clientId" value="" />
							<div class="row-3">
								<label class="field">
									<span>Imię / nazwa firmy *</span>
									<input name="newClientName" type="text" bind:value={newClientName} placeholder="Katarzyna Kowalska" required />
								</label>
								<label class="field">
									<span>Telefon</span>
									<input name="newClientPhone" type="tel" bind:value={newClientPhone} placeholder="+48 600 100 200" />
								</label>
								<label class="field">
									<span>Email</span>
									<input name="newClientEmail" type="email" bind:value={newClientEmail} placeholder="klient@example.com" />
								</label>
							</div>
						{/if}
					</div>
				</section>

				<!-- 2. Event -->
				<section class="card">
					<header class="card-head">
						<h2>2. Event</h2>
						<span class="days-badge">{days} {days === 1 ? 'dzień' : 'dni'}</span>
					</header>
					<div class="card-body">
						<div class="row-2">
							<label class="field">
								<span>Nazwa eventu *</span>
								<input name="eventName" type="text" bind:value={eventName} placeholder="Wesele Kowalskich" required />
							</label>
							<label class="field">
								<span>Miejsce</span>
								<input name="venue" type="text" bind:value={venue} placeholder="Stodoła u Babci, Chmielnik" />
							</label>
						</div>
						<div class="row-2">
							<label class="field">
								<span>Od *</span>
								<input name="eventStartDate" type="date" bind:value={eventStartDate} required />
							</label>
							<label class="field">
								<span>Do *</span>
								<input name="eventEndDate" type="date" bind:value={eventEndDate} required />
							</label>
						</div>
						<label class="field">
							<span>Notatki (wewnętrzne)</span>
							<textarea name="notes" bind:value={notes} rows="2" placeholder="np. brak kaucji, czeka na potwierdzenie menu"></textarea>
						</label>
					</div>
				</section>

				<!-- 3. Pakiet (quick start) -->
				<section class="card">
					<header class="card-head">
						<h2>3. Quick start z pakietu (opcjonalnie)</h2>
						<span class="muted">{data.packages.length} pakietów · customizuj poniżej</span>
					</header>
					<div class="card-body">
						<div class="pkg-chips">
							{#each data.packages as p}
								<button
									type="button"
									class="pkg-chip"
									class:active={selectedPackageId === p.id}
									onclick={() => applyPackage(p.id)}
								>
									<span class="pc-name">{p.name}</span>
									<span class="pc-price">{fmtZl(p.priceFromCents / 100)}</span>
								</button>
							{/each}
						</div>
					</div>
				</section>

				<!-- 4. Pozycje -->
				<section class="card">
					<header class="card-head">
						<h2>4. Pozycje oferty</h2>
						<span class="muted">{lines.length} {lines.length === 1 ? 'pozycja' : lines.length < 5 ? 'pozycje' : 'pozycji'}</span>
					</header>
					<div class="card-body no-padding">
						<table class="lines-table">
							<thead>
								<tr>
									<th>Item z magazynu</th>
									<th>Opis pozycji</th>
									<th class="num">Ilość</th>
									<th class="num">Dni</th>
									<th class="num">Cena/dzień/szt.</th>
									<th class="num">Razem (brutto)</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{#if lines.length === 0}
									<tr class="empty-row">
										<td colspan="7">Brak pozycji. Kliknij "+ Dodaj pozycję" lub wybierz pakiet powyżej.</td>
									</tr>
								{/if}
								{#each lines as line, i}
									<tr class="line">
										<td>
											<select
												name={`item_${i}_id`}
												value={line.itemId ?? ''}
												onchange={(e) => onItemChange(i, (e.currentTarget as HTMLSelectElement).value)}
												class="f-item"
											>
												<option value="">— custom —</option>
												{#each data.items as it}
													<option value={it.id}>{it.name} ({it.totalQty} szt.)</option>
												{/each}
											</select>
										</td>
										<td>
											<input name={`item_${i}_desc`} type="text" bind:value={line.desc} placeholder="Opis pozycji" class="f-desc" />
										</td>
										<td class="num">
											<input name={`item_${i}_qty`} type="number" bind:value={line.qty} min="1" class="f-qty" />
										</td>
										<td class="num">
											<input name={`item_${i}_days`} type="number" bind:value={line.days} min="1" class="f-days" />
										</td>
										<td class="num">
											<input name={`item_${i}_price`} type="number" step="0.01" bind:value={line.unitPrice} class="f-price" />
										</td>
										<td class="num line-total">{fmtZl(lineTotal(line))}</td>
										<td class="actions">
											<button type="button" class="btn-del" onclick={() => removeLine(i)} title="Usuń">×</button>
										</td>
									</tr>
								{/each}
								<tr class="add-row">
									<td colspan="7">
										<button type="button" class="btn-add-line" onclick={addLine}>+ Dodaj pozycję</button>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</section>

				<!-- 5. Summary -->
				<section class="card summary-card">
					<header class="card-head">
						<h2>5. Podsumowanie</h2>
					</header>
					<div class="summary-body">
						<div class="sum-row">
							<span>Netto</span>
							<span class="sum-val">{fmtZl(netto)}</span>
						</div>
						<div class="sum-row">
							<span>VAT 23%</span>
							<span class="sum-val">{fmtZl(vat)}</span>
						</div>
						<div class="sum-row total">
							<span>Do zapłaty (brutto)</span>
							<span class="sum-val big">{fmtZl(subtotal)}</span>
						</div>
					</div>
				</section>
			</div>

			<footer class="form-foot">
				<a href="/offers" class="btn-ghost-lg">Anuluj</a>
				<div class="foot-actions">
					<button type="submit" class="btn-primary-lg">Zapisz jako draft</button>
					<button type="submit" class="btn-send" disabled title="Jutro: Resend integration">
						✉️ Zapisz i wyślij (jutro)
					</button>
				</div>
			</footer>
		</form>
	</main>
</div>

<style>
	.app {
		display: grid;
		grid-template-columns: var(--nav-width) 1fr;
		min-height: 100dvh;
		background: var(--paper);
	}
	.rail {
		background: var(--nav-bg);
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100dvh;
		position: sticky;
		top: 0;
	}
	.logo {
		display: grid;
		place-items: center;
		height: 64px;
		width: 100%;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		text-decoration: none;
	}
	.logo-mark {
		width: 34px;
		height: 34px;
		background: var(--wn-plotno);
		color: var(--wn-atrament);
		border-radius: 8px;
		display: grid;
		place-items: center;
		font-weight: 700;
	}
	.rail-nav {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.65rem 0;
		gap: 2px;
		width: 100%;
	}
	.rail-item {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		width: 58px;
		padding: 0.55rem 0;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.45);
		text-decoration: none;
	}
	.rail-item svg {
		width: 20px;
		height: 20px;
	}
	.rail-label {
		font-size: 10px;
		font-weight: 500;
	}
	.rail-item:hover {
		color: rgba(255, 255, 255, 0.85);
		background: rgba(255, 255, 255, 0.04);
	}
	.rail-item.active {
		color: white;
		background: rgba(255, 255, 255, 0.08);
	}
	.rail-indicator {
		position: absolute;
		left: -12px;
		top: 50%;
		transform: translateY(-50%);
		width: 3px;
		height: 22px;
		background: var(--wn-zielony);
	}
	.rail-sep {
		width: 28px;
		height: 1px;
		background: rgba(255, 255, 255, 0.08);
		margin: 0.65rem 0;
	}
	.rail-foot {
		padding: 0.75rem 0 0.9rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.55rem;
	}
	.theme-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: grid;
		place-items: center;
	}
	.theme-btn svg {
		width: 15px;
		height: 15px;
	}
	.avatar-link {
		position: relative;
		width: 36px;
		height: 36px;
		border-radius: 50%;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: var(--wn-zielony);
		color: var(--wn-plotno);
		font-weight: 700;
	}
	.avatar-dot {
		position: absolute;
		bottom: -1px;
		right: -1px;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--wn-zielony);
		box-shadow: 0 0 0 2px var(--nav-bg);
	}
	.logout-link {
		font-size: 10px;
		color: rgba(255, 255, 255, 0.45);
		text-decoration: none;
	}

	.main {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.topbar {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--line);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--paper);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.top-left {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}
	.back {
		font-size: 0.78rem;
		color: var(--mute);
		text-decoration: none;
	}
	.back:hover {
		color: var(--ink);
	}
	h1 {
		margin: 0;
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--ink);
	}
	.top-date {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--mute);
	}
	.preview-num {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--wn-granat);
		padding: 0.3rem 0.6rem;
		background: var(--paper-2);
		border-radius: 4px;
	}

	.offer-form {
		display: flex;
		flex-direction: column;
		min-height: calc(100dvh - 64px);
	}
	.content {
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		flex: 1;
	}

	/* CARDS */
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 10px;
		overflow: hidden;
	}
	.card-head {
		padding: 0.7rem 1.1rem;
		border-bottom: 1px solid var(--line);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
	}
	.card-head h2 {
		margin: 0;
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--ink);
	}
	.card-body {
		padding: 1rem 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.card-body.no-padding {
		padding: 0;
	}
	.muted {
		font-size: 0.75rem;
		color: var(--mute);
		font-family: var(--font-mono);
	}
	.days-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.6rem;
		background: color-mix(in srgb, var(--wn-zielony) 12%, transparent);
		color: var(--wn-zielony-ink);
		border-radius: 4px;
		font-size: 0.78rem;
		font-weight: 500;
		font-family: var(--font-mono);
	}

	/* SEGMENT */
	.seg {
		display: inline-flex;
		background: var(--paper-2);
		border-radius: 6px;
		padding: 2px;
	}
	.seg-btn {
		padding: 0.32rem 0.75rem;
		background: transparent;
		border: none;
		border-radius: 4px;
		font-size: 0.78rem;
		color: var(--mute);
		cursor: pointer;
		font-family: var(--font-sans);
	}
	.seg-btn.active {
		background: var(--card);
		color: var(--ink);
		font-weight: 500;
	}

	/* FIELDS */
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.field span {
		font-size: 0.76rem;
		font-weight: 500;
		color: var(--ink-2);
	}
	.field input,
	.field select,
	.field textarea {
		padding: 0.48rem 0.65rem;
		border: 1px solid var(--line);
		border-radius: 5px;
		font-size: 0.87rem;
		font-family: var(--font-sans);
		background: var(--paper-2);
		color: var(--ink);
	}
	.field input:focus,
	.field select:focus,
	.field textarea:focus {
		border-color: var(--wn-granat);
		outline: none;
		background: var(--card);
	}
	.row-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	.row-3 {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.75rem;
	}

	/* PAKIET chips */
	.pkg-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.pkg-chip {
		display: flex;
		flex-direction: column;
		padding: 0.55rem 0.75rem;
		background: var(--paper-2);
		border: 1px solid var(--line);
		border-radius: 6px;
		cursor: pointer;
		font-family: var(--font-sans);
		text-align: left;
		min-width: 160px;
	}
	.pkg-chip:hover {
		border-color: var(--wn-atrament);
	}
	.pkg-chip.active {
		background: color-mix(in srgb, var(--wn-zielony) 12%, transparent);
		border-color: var(--wn-zielony);
	}
	.pc-name {
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--ink);
	}
	.pc-price {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--mute);
		margin-top: 0.15rem;
	}
	.pkg-chip.active .pc-price {
		color: var(--wn-zielony-ink);
	}

	/* LINES TABLE */
	.lines-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.84rem;
	}
	.lines-table th {
		text-align: left;
		padding: 0.5rem 0.9rem;
		font-family: var(--font-mono);
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--mute);
		border-bottom: 1px solid var(--line);
		background: var(--paper-2);
	}
	.lines-table th.num {
		text-align: right;
	}
	.lines-table td {
		padding: 0.4rem 0.9rem;
		border-bottom: 1px solid var(--line-2);
		vertical-align: middle;
	}
	.lines-table td.num {
		text-align: right;
	}
	.lines-table input,
	.lines-table select {
		padding: 0.3rem 0.5rem;
		border: 1px solid transparent;
		border-radius: 4px;
		font-size: 0.82rem;
		background: transparent;
		font-family: var(--font-sans);
		color: var(--ink);
		width: 100%;
	}
	.lines-table input:focus,
	.lines-table select:focus {
		border-color: var(--wn-granat);
		outline: none;
		background: var(--paper-2);
	}
	.f-item {
		min-width: 180px;
	}
	.f-desc {
		min-width: 160px;
	}
	.f-qty,
	.f-days,
	.f-price {
		text-align: right;
		font-family: var(--font-mono);
	}
	.f-qty {
		width: 70px;
	}
	.f-days {
		width: 70px;
	}
	.f-price {
		width: 110px;
	}
	.line-total {
		font-family: var(--font-mono);
		font-weight: 600;
		color: var(--wn-granat);
	}
	.btn-del {
		width: 24px;
		height: 24px;
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 4px;
		color: var(--mute);
		cursor: pointer;
		font-size: 1rem;
		display: grid;
		place-items: center;
	}
	.btn-del:hover {
		border-color: var(--wn-pomidor);
		color: var(--wn-pomidor);
	}
	.empty-row td {
		padding: 1rem;
		text-align: center;
		color: var(--mute);
		font-size: 0.85rem;
	}
	.add-row td {
		padding: 0;
	}
	.btn-add-line {
		width: 100%;
		padding: 0.55rem;
		background: transparent;
		border: none;
		border-top: 1px dashed var(--line);
		font-size: 0.82rem;
		color: var(--wn-zielony-ink);
		cursor: pointer;
		font-family: var(--font-sans);
		font-weight: 500;
	}
	.btn-add-line:hover {
		background: color-mix(in srgb, var(--wn-zielony) 5%, transparent);
	}

	/* SUMMARY */
	.summary-card {
		background: color-mix(in srgb, var(--wn-granat) 4%, var(--card));
	}
	.summary-body {
		padding: 0.9rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-left: auto;
		max-width: 400px;
		width: 100%;
	}
	.sum-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		font-size: 0.9rem;
		color: var(--ink-2);
	}
	.sum-val {
		font-family: var(--font-mono);
	}
	.sum-row.total {
		padding-top: 0.5rem;
		border-top: 1px solid var(--line);
		margin-top: 0.3rem;
		color: var(--ink);
		font-weight: 600;
	}
	.sum-val.big {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--wn-zielony-ink);
	}

	/* FOOTER */
	.form-foot {
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--line);
		background: var(--paper);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		position: sticky;
		bottom: 0;
	}
	.foot-actions {
		display: flex;
		gap: 0.5rem;
	}
	.btn-primary-lg {
		padding: 0.6rem 1.3rem;
		background: var(--wn-zielony);
		color: var(--wn-plotno);
		border: none;
		border-radius: 6px;
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
		font-family: var(--font-sans);
	}
	.btn-primary-lg:hover {
		background: var(--wn-zielony-ink);
	}
	.btn-send {
		padding: 0.6rem 1.3rem;
		background: var(--wn-granat);
		color: var(--wn-plotno);
		border: none;
		border-radius: 6px;
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-ghost-lg {
		padding: 0.6rem 1.2rem;
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 6px;
		font-size: 0.88rem;
		color: var(--ink-2);
		text-decoration: none;
	}

	@media (max-width: 900px) {
		.app {
			grid-template-columns: 1fr;
		}
		.rail {
			display: none;
		}
		.row-2,
		.row-3 {
			grid-template-columns: 1fr;
		}
	}
</style>
