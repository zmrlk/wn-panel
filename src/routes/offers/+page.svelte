<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	let search = $state(data.search);

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

	const STATUS_FILTERS = [
		{ id: 'all', label: 'Wszystkie' },
		{ id: 'draft', label: 'Szkice' },
		{ id: 'sent', label: 'Wysłane' },
		{ id: 'viewed', label: 'Otwarte' },
		{ id: 'accepted', label: 'Zaakceptowane' },
		{ id: 'rejected', label: 'Odrzucone' }
	];

	const STATUS_LABEL: Record<string, string> = {
		draft: 'Szkic',
		sent: 'Wysłane',
		viewed: 'Otwarte',
		accepted: 'Zaakceptowane',
		rejected: 'Odrzucone',
		expired: 'Wygasłe'
	};

	const STATUS_EMOJI: Record<string, string> = {
		draft: '✏️',
		sent: '✉️',
		viewed: '👀',
		accepted: '✅',
		rejected: '✕',
		expired: '⏰'
	};

	function fmtZl(cents: number | null | undefined) {
		if (cents == null) return '—';
		return (cents / 100).toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' zł';
	}

	function fmtDate(iso: string | null | undefined) {
		if (!iso) return '—';
		const d = new Date(iso);
		return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
	}

	function fmtDateTime(iso: Date | null | undefined) {
		if (!iso) return '—';
		const d = new Date(iso);
		return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	}

	function eventRange(start: string, end: string) {
		if (start === end) return fmtDate(start);
		return `${fmtDate(start)} – ${fmtDate(end)}`;
	}

	function applyFilter(status: string) {
		const params = new URLSearchParams();
		if (status !== 'all') params.set('status', status);
		if (search) params.set('q', search);
		goto(`/offers${params.toString() ? '?' + params.toString() : ''}`);
	}

	function applySearch(e: Event) {
		e.preventDefault();
		const params = new URLSearchParams();
		if (data.statusFilter !== 'all') params.set('status', data.statusFilter);
		if (search) params.set('q', search);
		goto(`/offers${params.toString() ? '?' + params.toString() : ''}`);
	}
</script>

<svelte:head>
	<title>Oferty · Wolny Namiot panel</title>
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
				<h1>Oferty</h1>
				<span class="top-date">{data.counts.all} ofert · {fmtZl(data.stats.totalPendingValueCents)} pending · {data.stats.conversionPct}% konwersji</span>
			</div>
			<div class="top-right">
				<a href="/offers/new" class="btn-primary">+ Nowa oferta</a>
			</div>
		</header>

		<!-- Filters row -->
		<div class="filters">
			<div class="filter-chips">
				{#each STATUS_FILTERS as f}
					<button
						class="chip"
						class:active={data.statusFilter === f.id}
						onclick={() => applyFilter(f.id)}
					>
						<span>{f.label}</span>
						<span class="chip-count">{data.counts[f.id as keyof typeof data.counts] ?? 0}</span>
					</button>
				{/each}
			</div>

			<form class="search" onsubmit={applySearch}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
				</svg>
				<input bind:value={search} type="search" placeholder="Numer, event lub klient..." />
			</form>
		</div>

		<div class="content">
			{#if data.offers.length === 0}
				<div class="empty">
					<div class="empty-emoji">📭</div>
					<h2>Brak ofert</h2>
					<p>{data.statusFilter !== 'all' ? `Brak ofert ze statusem "${STATUS_LABEL[data.statusFilter] ?? data.statusFilter}".` : 'Jeszcze nie wysłałeś żadnej oferty.'}</p>
					<a href="/offers/new" class="btn-primary-lg">+ Nowa oferta</a>
				</div>
			{:else}
				<div class="table-card">
					<table class="offers-table">
						<thead>
							<tr>
								<th>Nr oferty</th>
								<th>Klient / Event</th>
								<th>Termin</th>
								<th>Status</th>
								<th class="num">Wartość</th>
								<th>Tracking</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each data.offers as o}
								<tr class="row status-{o.status}">
									<td class="num-cell">
										<span class="offer-number">{o.number}</span>
									</td>
									<td>
										<div class="client-event">
											<span class="client">{o.clientName ?? '—'}</span>
											<span class="event">{o.eventName}</span>
											{#if o.venue}<span class="venue">📍 {o.venue}</span>{/if}
										</div>
									</td>
									<td class="term">
										{eventRange(o.eventStartDate, o.eventEndDate)}
									</td>
									<td>
										<span class="status-badge status-{o.status}">
											<span>{STATUS_EMOJI[o.status]}</span>
											{STATUS_LABEL[o.status] ?? o.status}
										</span>
									</td>
									<td class="num price">{fmtZl(o.totalCents)}</td>
									<td class="track">
										{#if o.sentAt}
											<span class="track-step done" title={fmtDateTime(o.sentAt)}>📤</span>
										{:else}
											<span class="track-step">·</span>
										{/if}
										{#if o.viewedAt}
											<span class="track-step done" title={fmtDateTime(o.viewedAt)}>👁️</span>
										{:else}
											<span class="track-step">·</span>
										{/if}
										{#if o.acceptedAt}
											<span class="track-step done" title={fmtDateTime(o.acceptedAt)}>✓</span>
										{:else}
											<span class="track-step">·</span>
										{/if}
									</td>
									<td class="actions">
										<a href={`/offers/${o.id}`} class="row-link">Otwórz →</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</main>
</div>

<style>
	/* LAYOUT + RAIL (lift z /pricing) */
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
		font-size: 0.85rem;
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
		border-radius: 0 2px 2px 0;
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
		font-size: 0.9rem;
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

	/* MAIN */
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
		gap: 0.85rem;
	}
	h1 {
		margin: 0;
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--ink);
		letter-spacing: -0.01em;
	}
	.top-date {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--mute);
	}
	.btn-primary {
		padding: 0.45rem 0.9rem;
		background: var(--wn-zielony);
		color: var(--wn-plotno);
		border: none;
		border-radius: 6px;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
	}
	.btn-primary:hover {
		background: var(--wn-zielony-ink);
	}

	/* FILTERS */
	.filters {
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid var(--line);
		display: flex;
		align-items: center;
		gap: 1rem;
		background: var(--paper);
		flex-wrap: wrap;
	}
	.filter-chips {
		display: flex;
		gap: 0.3rem;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.7rem;
		background: var(--paper-2);
		border: 1px solid var(--line);
		border-radius: 20px;
		font-size: 0.78rem;
		color: var(--ink-2);
		cursor: pointer;
		font-family: var(--font-sans);
	}
	.chip:hover {
		border-color: var(--wn-atrament);
	}
	.chip.active {
		background: var(--wn-atrament);
		color: var(--wn-plotno);
		border-color: var(--wn-atrament);
	}
	.chip-count {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		padding: 0.05rem 0.3rem;
		background: rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		color: inherit;
		opacity: 0.85;
	}
	.chip:not(.active) .chip-count {
		background: var(--card);
		color: var(--mute);
	}

	.search {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.7rem;
		background: var(--paper-2);
		border: 1px solid var(--line);
		border-radius: 6px;
		margin-left: auto;
		min-width: 280px;
	}
	.search svg {
		color: var(--mute);
	}
	.search input {
		background: transparent;
		border: none;
		outline: none;
		font-size: 0.82rem;
		color: var(--ink);
		font-family: var(--font-sans);
		flex: 1;
	}
	.search input::placeholder {
		color: var(--mute);
	}

	.content {
		padding: 1.25rem 1.5rem;
	}

	/* EMPTY STATE */
	.empty {
		background: var(--card);
		border: 1px dashed var(--line);
		border-radius: 10px;
		padding: 3rem 1.5rem;
		text-align: center;
	}
	.empty-emoji {
		font-size: 3rem;
		opacity: 0.35;
		margin-bottom: 0.5rem;
	}
	.empty h2 {
		margin: 0 0 0.3rem;
		font-size: 1.15rem;
		color: var(--ink);
	}
	.empty p {
		color: var(--mute);
		font-size: 0.88rem;
		margin: 0 0 1.25rem;
	}
	.btn-primary-lg {
		padding: 0.6rem 1.2rem;
		background: var(--wn-zielony);
		color: var(--wn-plotno);
		border-radius: 6px;
		font-size: 0.88rem;
		font-weight: 600;
		text-decoration: none;
		display: inline-block;
	}

	/* TABLE */
	.table-card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 10px;
		overflow: hidden;
	}
	.offers-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	.offers-table th {
		text-align: left;
		padding: 0.7rem 1.25rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--mute);
		border-bottom: 1px solid var(--line);
		background: var(--paper-2);
	}
	.offers-table th.num {
		text-align: right;
	}
	.offers-table td {
		padding: 0.75rem 1.25rem;
		border-bottom: 1px solid var(--line-2);
		vertical-align: top;
	}
	.offers-table tr.row:hover td {
		background: var(--paper-2);
	}
	.offers-table tr:last-child td {
		border-bottom: none;
	}

	.num-cell {
		font-family: var(--font-mono);
	}
	.offer-number {
		font-size: 0.78rem;
		color: var(--wn-granat);
		font-weight: 600;
	}
	.client-event {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.client {
		font-weight: 600;
		color: var(--ink);
	}
	.event {
		color: var(--ink-2);
		font-size: 0.82rem;
	}
	.venue {
		font-size: 0.72rem;
		color: var(--mute);
		font-family: var(--font-mono);
	}
	.term {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--ink-2);
		white-space: nowrap;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.55rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}
	.status-draft {
		background: color-mix(in srgb, var(--mute) 12%, transparent);
		color: var(--mute);
	}
	.status-sent {
		background: color-mix(in srgb, var(--wn-granat) 12%, transparent);
		color: var(--wn-granat);
	}
	.status-viewed {
		background: color-mix(in srgb, var(--wn-zarowka) 25%, transparent);
		color: #8a6d00;
	}
	.status-accepted {
		background: color-mix(in srgb, var(--wn-zielony) 18%, transparent);
		color: var(--wn-zielony-ink);
	}
	.status-rejected {
		background: color-mix(in srgb, var(--wn-pomidor) 15%, transparent);
		color: var(--wn-pomidor);
	}
	.status-expired {
		background: color-mix(in srgb, var(--wn-atrament) 8%, transparent);
		color: var(--ink-2);
	}

	.num {
		text-align: right;
	}
	.price {
		font-family: var(--font-mono);
		font-weight: 700;
		color: var(--ink);
		font-size: 0.92rem;
	}

	.track {
		font-size: 0.85rem;
		letter-spacing: 0.15em;
	}
	.track-step {
		opacity: 0.25;
	}
	.track-step.done {
		opacity: 1;
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
		text-underline-offset: 3px;
	}

	@media (max-width: 900px) {
		.app {
			grid-template-columns: 1fr;
		}
		.rail {
			display: none;
		}
		.filters {
			flex-direction: column;
			align-items: stretch;
		}
		.search {
			min-width: 0;
		}
	}
</style>
