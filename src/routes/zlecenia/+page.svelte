<script lang="ts">
	import { goto } from '$app/navigation';
	// row click whole row

	let { data } = $props();

	const ICONS: Record<string, string> = {
		dashboard: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9ZM9 22V12h6v10',
		zlecenia: 'M22 12h-4l-3 9L9 3l-3 9H2',
		tents: 'M3 20 L12 4 L21 20 Z M8 20 L12 13 L16 20',
		clients: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
		pricing: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
		photos: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M21 15l-5-5L5 21',
		settings: 'M20 7h-9 M14 17H5 M17 14a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z M7 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z'
	};
	const NAV = [
		{ id: 'dashboard', label: 'Home', href: '/dashboard' },
		{ id: 'zlecenia', label: 'Zlecenia', href: '/zlecenia', active: true },
		{ id: 'tents', label: 'Magazyn', href: '/magazyn' }
	];
	const ADMIN = [{ id: 'settings', label: 'Ustaw.', href: '/settings' }];

	const TABS = [
		{ id: 'nowy', label: '🆕 Nowy', count: 'nowy' },
		{ id: 'w-trakcie', label: '⚙️ W trakcie', count: 'w-trakcie' },
		{ id: 'wygrany', label: '✅ Wygrany', count: 'wygrany' },
		{ id: 'historia', label: '📦 Historia', count: 'historia' },
		{ id: 'wszystko', label: 'Wszystko', count: 'all' }
	];

	let searchInput = $state(data.q ?? '');

	function submitSearch(ev: SubmitEvent) {
		ev.preventDefault();
		const params = new URLSearchParams();
		if (data.tabFilter) params.set('tab', data.tabFilter);
		if (searchInput.trim()) params.set('q', searchInput.trim());
		goto(`/zlecenia?${params.toString()}`, { keepFocus: true });
	}
	function clearSearch() {
		searchInput = '';
		const params = new URLSearchParams();
		if (data.tabFilter) params.set('tab', data.tabFilter);
		goto(`/zlecenia?${params.toString()}`);
	}

	function fmtZl(cents: number | null | undefined) {
		if (cents == null) return '—';
		return (cents / 100).toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' zł';
	}

	function fmtDate(d: string | Date | null | undefined) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function eventRange(s: string | null, e: string | null) {
		if (!s) return '—';
		if (!e || s === e) return fmtDate(s);
		return `${fmtDate(s)} – ${fmtDate(e)}`;
	}

	function daysUntil(d: string | null | undefined): { label: string; cls: string } {
		if (!d) return { label: '—', cls: '' };
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const target = new Date(d);
		const diff = Math.floor((target.getTime() - today.getTime()) / 86400000);
		if (diff < 0) return { label: `${-diff}d temu`, cls: 'past' };
		if (diff === 0) return { label: 'dziś!', cls: 'today' };
		if (diff <= 7) return { label: `za ${diff}d`, cls: 'close' };
		if (diff <= 30) return { label: `za ${diff}d`, cls: 'mid' };
		return { label: `za ${diff}d`, cls: 'far' };
	}

	function detailHref(z: { type: string; id: string }) {
		// Unified detail — ten sam widok dla lead/offer/booking
		return `/zlecenia/${z.type}-${z.id}`;
	}

	function applyTab(tab: string) {
		const p = new URLSearchParams();
		if (tab !== 'w-trakcie') p.set('tab', tab);
		if (searchInput.trim()) p.set('q', searchInput.trim());
		goto(`/zlecenia${p.toString() ? '?' + p.toString() : ''}`);
	}
</script>

<svelte:head>
	<title>Zlecenia · Wolny Namiot panel</title>
</svelte:head>

<div class="app">
	<aside class="rail">
		<a href="/" class="logo"><span class="logo-mark">wn</span></a>
		<nav class="rail-nav">
			{#each NAV as nav}
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
			<button class="theme-btn" type="button" aria-label="Motyw" onclick={() => (window as typeof window & { toggleTheme?: () => void }).toggleTheme?.()}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
				</svg>
			</button>
			<a href="/profile" class="avatar-link">
				<span class="avatar">{data.user.name.charAt(0)}</span>
			</a>
			<a href="/auth/logout" class="logout-link">Wyloguj</a>
		</div>
	</aside>

	<main class="main">
		<header class="topbar">
			<div class="top-left">
				<h1>Zlecenia</h1>
				<span class="top-meta">
					{data.counts['w-trakcie']} w trakcie · {fmtZl(data.activeValue)} pipeline · {data.counts.wygrany} wygranych
				</span>
			</div>
			<div class="top-right">
				<a href="/offers/new" class="btn-primary">+ Nowe zlecenie</a>
			</div>
		</header>

		<div class="tabs-wrap">
			<div class="tabs">
				{#each TABS as t}
					<button
						class="tab"
						class:active={data.tabFilter === t.id}
						onclick={() => applyTab(t.id)}
					>
						<span>{t.label}</span>
						<span class="tab-count">{data.counts[t.count as keyof typeof data.counts] ?? 0}</span>
					</button>
				{/each}
			</div>
			<form class="search-form" onsubmit={submitSearch}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
				</svg>
				<input
					type="search"
					bind:value={searchInput}
					placeholder="Szukaj klienta, eventu, miejsca…"
					aria-label="Szukaj"
				/>
				{#if searchInput}
					<button type="button" class="search-clear" onclick={clearSearch} aria-label="Wyczyść">✕</button>
				{/if}
			</form>
		</div>

		<div class="content">
			<div class="table-card">
				<table class="data-table">
					<thead>
						<tr>
							<th>Event + klient</th>
							<th>Stage</th>
							<th>Termin</th>
							<th>Kiedy</th>
							<th class="num">Wartość</th>
						</tr>
					</thead>
					<tbody>
						{#each data.zlecenia as z}
							{@const until = daysUntil(z.eventDate)}
							<tr class="row clickable type-{z.type}" class:lost={z.isLost} onclick={() => goto(detailHref(z))}>
								<td>
									<div class="ev-cell">
										<span class="ev-name">{z.eventName}</span>
										<span class="ev-client">
											<strong>{z.contact}</strong>
											{#if z.contactSub}<span class="mute">· {z.contactSub}</span>{/if}
											{#if z.phone}<span class="phone mute">· {z.phone}</span>{/if}
										</span>
										{#if z.venue}<span class="ev-venue">📍 {z.venue}</span>{/if}
									</div>
								</td>
								<td>
									<span class="stage-badge stage-{z.stage}" class:lost={z.isLost}>
										<span class="s-emoji">{z.stageEmoji}</span>
										{z.stageLabel}
									</span>
									{#if z.type === 'offer' && z.number}
										<span class="mono-num">{z.number}</span>
									{/if}
								</td>
								<td class="mono term">{eventRange(z.eventDate, z.eventDateEnd)}</td>
								<td>
									<span class="until {until.cls}">{until.label}</span>
								</td>
								<td class="num price">{fmtZl(z.valueCents)}</td>
							</tr>
							<tr class="notes-row clickable type-{z.type}" onclick={() => goto(detailHref(z))}>
								<td colspan="5" class="notes-cell">
									{#if z.notes}
										📝 {z.notes}
									{:else}
										<span class="empty-note">— brak notatki —</span>
									{/if}
								</td>
							</tr>
						{/each}

						{#if data.zlecenia.length === 0}
							<tr class="empty">
								<td colspan="5">
									<div class="empty-state">
										<div class="empty-emoji">📭</div>
										<p>Brak zleceń w tej kategorii.</p>
									</div>
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
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
		justify-content: center;
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
	.theme-btn:hover {
		color: white;
		background: rgba(255, 255, 255, 0.08);
	}
	.avatar-link {
		width: 36px;
		height: 36px;
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
		background: var(--paper);
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.top-left {
		display: flex;
		align-items: baseline;
		gap: 0.85rem;
	}
	h1 {
		margin: 0;
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--ink);
	}
	.top-meta {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--mute);
	}
	.btn-primary {
		padding: 0.5rem 1.15rem;
		background: var(--wn-zielony);
		color: var(--wn-atrament);
		border: 2px solid var(--wn-atrament);
		border-radius: 0;
		font-size: 0.88rem;
		font-weight: 700;
		text-decoration: none;
		box-shadow: 3px 3px 0 var(--wn-atrament);
		transition: transform 0.1s, box-shadow 0.1s;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	.btn-primary:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--wn-atrament);
	}
	.btn-primary:active {
		transform: translate(1px, 1px);
		box-shadow: 1px 1px 0 var(--wn-atrament);
	}

	.tabs-wrap {
		padding: 0.75rem 1.5rem 0;
		border-bottom: 1px solid var(--line);
		background: var(--paper);
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		flex-wrap: wrap;
	}
	.tabs {
		display: flex;
		gap: 0.15rem;
		white-space: nowrap;
		overflow-x: auto;
		flex: 1 1 auto;
	}
	.search-form {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.7rem;
		margin-bottom: 0.35rem;
		background: var(--paper);
		border: 1px solid var(--line);
		color: var(--mute);
		border-radius: 0;
		min-width: 220px;
	}
	.search-form:focus-within {
		border-color: var(--wn-zielony);
		color: var(--ink);
	}
	.search-form input {
		border: none;
		outline: none;
		background: transparent;
		font-family: var(--font-sans);
		font-size: 0.85rem;
		flex: 1;
		color: inherit;
	}
	.search-clear {
		background: transparent;
		border: none;
		color: var(--mute);
		cursor: pointer;
		padding: 0 0.2rem;
		font-size: 0.8rem;
	}
	.search-clear:hover { color: var(--wn-pomidor); }
	.tab {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.55rem 0.95rem;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		font-size: 0.88rem;
		color: var(--mute);
		cursor: pointer;
		margin-bottom: -1px;
		font-family: var(--font-sans);
		font-weight: 500;
	}
	.tab:hover {
		color: var(--ink);
	}
	.tab.active {
		color: var(--ink);
		border-bottom-color: var(--wn-zielony);
	}
	.tab-count {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		padding: 0.06rem 0.35rem;
		background: var(--paper-2);
		border-radius: 3px;
		color: var(--mute);
	}
	.tab.active .tab-count {
		background: color-mix(in srgb, var(--wn-zielony) 18%, transparent);
		color: var(--wn-zielony-ink);
	}

	.content {
		padding: 1.25rem 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
	}
	.topbar,
	.filters,
	.tabs-wrap {
		padding-left: max(1.5rem, calc((100% - 1400px) / 2));
		padding-right: max(1.5rem, calc((100% - 1400px) / 2));
	}
	.table-card {
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 0;
		overflow: hidden;
	}
	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	.data-table th {
		text-align: left;
		padding: 0.65rem 1rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--mute);
		border-bottom: 1px solid var(--line);
		background: var(--paper-2);
	}
	.data-table th.num {
		text-align: right;
	}
	.data-table td {
		padding: 0.7rem 1rem;
		border-bottom: 1px solid var(--line-2);
	}
	.data-table td.num {
		text-align: right;
		font-family: var(--font-mono);
	}

	.row:hover td,
	.notes-row.clickable:hover td {
		background: color-mix(in srgb, var(--wn-zielony) 5%, transparent);
	}
	.row.clickable,
	.notes-row.clickable {
		cursor: pointer;
	}
	.row.lost {
		opacity: 0.55;
	}

	.ev-cell {
		display: flex;
		flex-direction: column;
		gap: 0.12rem;
	}
	.ev-name {
		font-weight: 600;
		color: var(--ink);
	}
	.ev-client {
		font-size: 0.82rem;
		color: var(--ink-2);
	}
	.ev-client strong {
		font-weight: 500;
		color: var(--ink);
	}
	.ev-venue {
		font-size: 0.73rem;
		color: var(--mute);
		font-family: var(--font-mono);
	}
	.phone {
		font-family: var(--font-mono);
		font-size: 0.77rem;
	}
	.mute {
		color: var(--mute);
	}

	.stage-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.22rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 0;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	/* 6-stage model (v5.20): 1=nowy, 2=w-trakcie, 3=wygrany (do realizacji), 4=zrealizowany, 5=przegrany, 6=archiwum */
	.stage-1 {
		background: color-mix(in srgb, var(--wn-granat) 14%, transparent);
		color: var(--wn-granat);
		border-color: var(--wn-granat);
	}
	.stage-2 {
		background: color-mix(in srgb, var(--wn-zarowka) 40%, transparent);
		color: #8a6d00;
		border-color: #d4ad00;
	}
	.stage-3 {
		background: var(--wn-zielony);
		color: var(--wn-atrament);
		border-color: var(--wn-atrament);
	}
	.stage-4 {
		background: var(--wn-atrament);
		color: var(--wn-zielony);
		border-color: var(--wn-atrament);
	}
	.stage-5 {
		background: color-mix(in srgb, var(--wn-pomidor) 12%, transparent);
		color: var(--wn-pomidor);
		border-color: var(--wn-pomidor);
	}
	.stage-6 {
		background: color-mix(in srgb, var(--mute) 10%, transparent);
		color: var(--mute);
		border-color: var(--line);
	}
	.stage-badge.lost {
		background: color-mix(in srgb, var(--wn-pomidor) 12%, transparent);
		color: var(--wn-pomidor);
		border-color: var(--wn-pomidor);
	}
	.mono-num {
		margin-left: 0.4rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--wn-granat);
	}

	.term {
		font-size: 0.8rem;
		color: var(--ink-2);
		white-space: nowrap;
	}
	.until {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		background: var(--paper-2);
		color: var(--ink-2);
	}
	.until.past {
		background: transparent;
		color: var(--mute);
	}
	.until.today {
		background: var(--wn-pomidor);
		color: var(--wn-plotno);
		font-weight: 700;
	}
	.until.close {
		background: color-mix(in srgb, var(--wn-zarowka) 45%, transparent);
		color: #8a6d00;
		font-weight: 600;
	}
	.until.mid {
		background: color-mix(in srgb, var(--wn-granat) 10%, transparent);
		color: var(--wn-granat);
	}
	.until.far {
		opacity: 0.7;
	}

	.price {
		font-weight: 700;
		color: var(--wn-granat);
	}

	.actions {
		text-align: right;
	}
	.row-link {
		font-size: 0.78rem;
		color: var(--wn-granat);
		text-decoration: none;
		font-weight: 500;
	}
	.row-link:hover {
		text-decoration: underline;
	}

	.notes-row td {
		padding: 0 1rem 0.55rem;
		border-bottom: 1px solid var(--line-2);
		padding-top: 0;
	}
	.notes-cell {
		font-size: 0.82rem;
		color: var(--mute);
		font-style: italic;
		text-align: center;
		padding: 0.5rem 1rem 0.85rem !important;
	}
	.notes-row.type-lead td,
	.notes-row.type-offer td,
	.notes-row.type-booking td {
		border-bottom: 1px solid var(--line-2);
	}
	.empty-note {
		color: var(--dim);
		font-style: italic;
		font-size: 0.75rem;
	}

	.empty-state {
		padding: 3rem 1.5rem;
		text-align: center;
		color: var(--mute);
	}
	.empty-emoji {
		font-size: 2.5rem;
		opacity: 0.35;
		margin-bottom: 0.5rem;
	}

	/* ═══ MOBILE (cards layout) ═══ */
	@media (max-width: 720px) {
		.app {
			grid-template-columns: 1fr;
			padding-bottom: 60px;
		}
		.rail {
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			top: auto;
			height: 60px;
			width: 100%;
			flex-direction: row;
			border-top: 1px solid rgba(255, 255, 255, 0.08);
		}
		.logo {
			display: none;
		}
		.rail-nav {
			flex-direction: row;
			padding: 0;
			flex: 1;
			justify-content: space-around;
			gap: 0;
		}
		.rail-item {
			width: auto;
			padding: 0.4rem 0.5rem;
		}
		.rail-indicator {
			top: 0;
			left: 50%;
			transform: translateX(-50%);
			width: 28px;
			height: 2px;
			border-radius: 0 0 2px 2px;
		}
		.rail-sep,
		.rail-foot {
			display: none;
		}

		.topbar {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
		.top-right {
			width: 100%;
		}
		.btn-primary {
			width: 100%;
			text-align: center;
		}

		.tabs {
			padding-bottom: 2px;
		}

		/* Tabela → karty */
		.data-table thead {
			display: none;
		}
		.data-table,
		.data-table tbody,
		.data-table tr,
		.data-table td {
			display: block;
			width: 100%;
		}
		.data-table tr.row {
			background: var(--card);
			border: 1px solid var(--line);
			border-radius: 10px;
			padding: 0.75rem;
			margin-bottom: 0.6rem;
		}
		.data-table tr.row td {
			border-bottom: none;
			padding: 0.15rem 0;
		}
		.data-table td.num {
			text-align: left;
		}
		.data-table td.actions {
			text-align: left;
			padding-top: 0.5rem;
			border-top: 1px dashed var(--line);
			margin-top: 0.4rem;
		}
		.data-table td.term {
			font-size: 0.78rem;
		}
		.notes-row td {
			padding: 0.4rem 0.8rem;
			background: var(--paper-2);
			border-radius: 6px;
			margin-top: -0.3rem;
		}
	}
</style>
