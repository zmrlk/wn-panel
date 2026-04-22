<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';

	let { data } = $props();

	let editingId = $state<string | null>(null);
	let addingClient = $state(false);
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
		{ id: 'zlecenia', label: 'Zlecenia', href: '/zlecenia' },
		{ id: 'tents', label: 'Magazyn', href: '/magazyn' }
	];
	const ADMIN = [{ id: 'settings', label: 'Ustaw.', href: '/settings' }];

	function fmtZl(cents: number | null | undefined) {
		if (cents == null) return '—';
		return (cents / 100).toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' zł';
	}
	function fmtDate(d: Date | string | null | undefined) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' });
	}
	function initials(name: string) {
		const parts = name.split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0][0].toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
	function avatarColor(name: string) {
		const hash = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
		const colors = ['#3AB68D', '#1E3A5F', '#E8544F', '#F5D35C', '#8b5cf6', '#e89a4f'];
		return colors[hash % colors.length];
	}

	function applySearch(e: Event) {
		e.preventDefault();
		const params = new URLSearchParams();
		if (search) params.set('q', search);
		goto(`/clients${params.toString() ? '?' + params.toString() : ''}`);
	}
</script>

<svelte:head>
	<title>Klienci · Wolny Namiot panel</title>
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
				<h1>Klienci</h1>
				<span class="top-date">
					{data.stats.total} klientów · {data.stats.withBookings} z rezerwacjami · łączny LTV {fmtZl(data.stats.totalLifetimeCents)}
				</span>
			</div>
			<div class="top-right">
				<form class="search" onsubmit={applySearch}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="8" />
						<path d="m21 21-4.3-4.3" />
					</svg>
					<input bind:value={search} type="search" placeholder="Szukaj klienta..." />
				</form>
			</div>
		</header>

		<div class="content">
			<div class="table-card">
				<table class="data-table">
					<thead>
						<tr>
							<th>Klient</th>
							<th>Kontakt</th>
							<th>Adres</th>
							<th class="num">Oferty</th>
							<th class="num">Rezerw.</th>
							<th class="num">LTV</th>
							<th>Dodany</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#if addingClient}
							<tr class="edit-row">
								<td colspan="8">
									<form
										method="POST"
										action="?/create"
										use:enhance={() => async ({ update }) => {
											await update();
											addingClient = false;
											await invalidateAll();
										}}
										class="inline-form"
									>
										<input name="name" type="text" placeholder="Imię / nazwa *" class="f-name" required />
										<input name="company" type="text" placeholder="Firma" class="f-company" />
										<input name="phone" type="tel" placeholder="Telefon" class="f-phone" />
										<input name="email" type="email" placeholder="Email" class="f-email" />
										<input name="address" type="text" placeholder="Adres" class="f-address" />
										<input name="notes" type="text" placeholder="Notatki" class="f-notes" />
										<button type="submit" class="btn-save">Dodaj</button>
										<button type="button" class="btn-cancel" onclick={() => (addingClient = false)}>Anuluj</button>
									</form>
								</td>
							</tr>
						{:else}
							<tr class="add-row">
								<td colspan="8">
									<button class="btn-add" onclick={() => (addingClient = true)}>+ Nowy klient</button>
								</td>
							</tr>
						{/if}

						{#each data.clients as c}
							{#if editingId === c.id}
								<tr class="edit-row">
									<td colspan="8">
										<form
											method="POST"
											action="?/update"
											use:enhance={() => async ({ update }) => {
												await update();
												editingId = null;
												await invalidateAll();
											}}
											class="inline-form"
										>
											<input type="hidden" name="id" value={c.id} />
											<input name="name" type="text" value={c.name} placeholder="Imię / nazwa *" class="f-name" required />
											<input name="company" type="text" value={c.company ?? ''} placeholder="Firma" class="f-company" />
											<input name="phone" type="tel" value={c.phone ?? ''} placeholder="Telefon" class="f-phone" />
											<input name="email" type="email" value={c.email ?? ''} placeholder="Email" class="f-email" />
											<input name="address" type="text" value={c.address ?? ''} placeholder="Adres" class="f-address" />
											<input name="notes" type="text" value={c.notes ?? ''} placeholder="Notatki" class="f-notes" />
											<button type="submit" class="btn-save">Zapisz</button>
											<button type="button" class="btn-cancel" onclick={() => (editingId = null)}>Anuluj</button>
										</form>
									</td>
								</tr>
							{:else}
								<tr class="row">
									<td>
										<div class="client-cell">
											<span class="avatar" style="background: {avatarColor(c.name)}">{initials(c.name)}</span>
											<div class="client-info">
												<span class="c-name">{c.name}</span>
												{#if c.company}<span class="c-company">{c.company}</span>{/if}
											</div>
										</div>
									</td>
									<td>
										<div class="contact-cell">
											{#if c.phone}<span class="c-phone">{c.phone}</span>{/if}
											{#if c.email}<span class="c-email">{c.email}</span>{/if}
											{#if !c.phone && !c.email}<span class="mute">—</span>{/if}
										</div>
									</td>
									<td class="address">{c.address ?? '—'}</td>
									<td class="num">
										{#if c.offersCount > 0}
											<span class="metric-chip">{c.offersCount}</span>
										{:else}
											<span class="mute">0</span>
										{/if}
									</td>
									<td class="num">
										{#if c.bookingsCount > 0}
											<span class="metric-chip ok">{c.bookingsCount}</span>
										{:else}
											<span class="mute">0</span>
										{/if}
									</td>
									<td class="num ltv">
										{#if c.lifetimeCents > 0 || c.offersValueCents > 0}
											<strong>{fmtZl(c.lifetimeCents + c.offersValueCents)}</strong>
										{:else}
											<span class="mute">—</span>
										{/if}
									</td>
									<td class="mono">{fmtDate(c.createdAt)}</td>
									<td class="actions">
										<a href={`/offers/new?clientId=${c.id}`} class="row-offer" title="Nowa oferta">+ Oferta</a>
										<button class="row-edit" onclick={() => (editingId = c.id)}>Edytuj</button>
									</td>
								</tr>
								{#if c.notes}
									<tr class="notes-row">
										<td></td>
										<td colspan="7" class="notes-cell">📝 {c.notes}</td>
									</tr>
								{/if}
							{/if}
						{/each}

						{#if data.clients.length === 0}
							<tr class="empty">
								<td colspan="8">
									<div class="empty-state">
										<div class="empty-emoji">👥</div>
										<p>{data.search ? `Brak wyników dla "${data.search}"` : 'Brak klientów. Kliknij "+ Nowy klient" żeby dodać.'}</p>
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
	.rail-foot .avatar {
		width: 100%;
		height: 100%;
		background: var(--wn-zielony);
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
		background: var(--paper);
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
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
	.top-date {
		font-family: var(--font-mono);
		font-size: 0.72rem;
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
		min-width: 240px;
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
		flex: 1;
	}

	.content {
		padding: 1.25rem 1.5rem;
	}
	.table-card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 10px;
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
		padding: 0.65rem 1rem;
		border-bottom: 1px solid var(--line-2);
		vertical-align: middle;
	}
	.data-table tr.row:hover td {
		background: color-mix(in srgb, var(--wn-zielony) 3%, transparent);
	}
	.data-table td.num {
		text-align: right;
		font-family: var(--font-mono);
	}
	.data-table td.mono {
		font-family: var(--font-mono);
		font-size: 0.74rem;
		color: var(--mute);
		white-space: nowrap;
	}

	.client-cell {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}
	.avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: var(--wn-plotno);
		font-weight: 700;
		font-size: 0.8rem;
		font-family: var(--font-sans);
	}
	.client-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.c-name {
		font-weight: 600;
		color: var(--ink);
	}
	.c-company {
		font-size: 0.74rem;
		color: var(--mute);
	}
	.contact-cell {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.c-phone,
	.c-email {
		font-family: var(--font-mono);
		font-size: 0.76rem;
		color: var(--ink-2);
	}
	.address {
		font-size: 0.8rem;
		color: var(--ink-2);
	}
	.mute {
		color: var(--mute);
	}
	.metric-chip {
		display: inline-block;
		padding: 0.1rem 0.45rem;
		background: var(--paper-2);
		color: var(--ink-2);
		border-radius: 10px;
		font-size: 0.75rem;
		font-weight: 600;
	}
	.metric-chip.ok {
		background: color-mix(in srgb, var(--wn-zielony) 16%, transparent);
		color: var(--wn-zielony-ink);
	}
	.ltv strong {
		color: var(--wn-granat);
		font-weight: 700;
	}

	.data-table td.actions {
		text-align: right;
		white-space: nowrap;
	}
	.row-offer {
		padding: 0.28rem 0.6rem;
		background: color-mix(in srgb, var(--wn-zielony) 12%, transparent);
		color: var(--wn-zielony-ink);
		border-radius: 4px;
		font-size: 0.73rem;
		font-weight: 500;
		text-decoration: none;
		margin-right: 0.3rem;
	}
	.row-offer:hover {
		background: var(--wn-zielony);
		color: var(--wn-plotno);
	}
	.row-edit {
		padding: 0.25rem 0.55rem;
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 4px;
		font-size: 0.72rem;
		color: var(--mute);
		cursor: pointer;
	}
	.row-edit:hover {
		border-color: var(--wn-atrament);
		color: var(--ink);
	}

	.notes-row td {
		padding: 0 1rem 0.6rem;
		border-bottom: 1px solid var(--line-2);
		padding-top: 0;
	}
	.notes-cell {
		font-size: 0.8rem;
		color: var(--mute);
		font-style: italic;
	}

	/* INLINE EDIT */
	.edit-row td {
		background: color-mix(in srgb, var(--wn-zielony) 4%, transparent);
	}
	.inline-form {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
	}
	.inline-form input {
		padding: 0.35rem 0.55rem;
		border: 1px solid var(--line);
		border-radius: 5px;
		font-size: 0.8rem;
		background: var(--card);
	}
	.inline-form input:focus {
		border-color: var(--wn-zielony);
		outline: none;
	}
	.f-name {
		flex: 1;
		min-width: 160px;
	}
	.f-company {
		flex: 1;
		min-width: 140px;
	}
	.f-phone {
		width: 140px;
	}
	.f-email {
		flex: 1;
		min-width: 160px;
	}
	.f-address {
		flex: 1;
		min-width: 180px;
	}
	.f-notes {
		flex: 1;
		min-width: 180px;
	}
	.btn-save {
		padding: 0.38rem 0.85rem;
		background: var(--wn-zielony);
		color: var(--wn-plotno);
		border: none;
		border-radius: 5px;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}
	.btn-cancel {
		padding: 0.38rem 0.75rem;
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 5px;
		font-size: 0.78rem;
		color: var(--ink-2);
		cursor: pointer;
	}
	.add-row td {
		padding: 0;
	}
	.btn-add {
		width: 100%;
		padding: 0.55rem;
		background: transparent;
		border: none;
		border-bottom: 1px dashed var(--line);
		font-size: 0.82rem;
		color: var(--wn-zielony-ink);
		cursor: pointer;
		font-weight: 500;
	}
	.btn-add:hover {
		background: color-mix(in srgb, var(--wn-zielony) 5%, transparent);
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

	@media (max-width: 900px) {
		.app {
			grid-template-columns: 1fr;
		}
		.rail {
			display: none;
		}
	}
</style>
