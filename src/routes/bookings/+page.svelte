<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';

	let { data } = $props();

	let addingBooking = $state(false);

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

	const STATUSES = [
		{ id: 'all', label: 'Wszystkie' },
		{ id: 'draft', label: 'Szkice' },
		{ id: 'confirmed', label: 'Potwierdzone' },
		{ id: 'in-progress', label: 'W trakcie' },
		{ id: 'done', label: 'Zakończone' },
		{ id: 'cancelled', label: 'Anulowane' }
	];

	const STATUS_LABEL: Record<string, string> = {
		draft: '✏️ Szkic',
		confirmed: '✅ Potwierdzone',
		'in-progress': '🚚 W trakcie',
		done: '🎉 Zakończone',
		cancelled: '✕ Anulowane'
	};

	function fmtZl(cents: number | null | undefined) {
		if (cents == null) return '—';
		return (cents / 100).toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' zł';
	}
	function fmtDate(iso: string | null | undefined) {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
	}
	function eventRange(s: string, e: string) {
		const sd = new Date(s);
		const ed = new Date(e);
		if (s === e) return fmtDate(s);
		if (sd.getMonth() === ed.getMonth() && sd.getFullYear() === ed.getFullYear()) {
			return `${sd.getDate()}–${ed.getDate()} ${ed.toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' })}`;
		}
		return `${fmtDate(s)} – ${fmtDate(e)}`;
	}
	function daysCount(s: string, e: string) {
		const sd = new Date(s);
		const ed = new Date(e);
		return Math.max(1, Math.ceil((ed.getTime() - sd.getTime()) / 86400000) + 1);
	}
	function daysUntil(s: string) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const sd = new Date(s);
		const diff = Math.floor((sd.getTime() - today.getTime()) / 86400000);
		if (diff < 0) return { label: `${-diff}d temu`, past: true };
		if (diff === 0) return { label: 'dziś', today: true };
		if (diff === 1) return { label: 'jutro', close: true };
		if (diff <= 7) return { label: `za ${diff}d`, close: true };
		return { label: `za ${diff}d`, future: true };
	}

	function applyFilter(status: string) {
		const params = new URLSearchParams();
		if (status !== 'all') params.set('status', status);
		goto(`/bookings${params.toString() ? '?' + params.toString() : ''}`);
	}
</script>

<svelte:head>
	<title>Rezerwacje · Wolny Namiot panel</title>
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
				<h1>Rezerwacje</h1>
				<span class="top-date">
					{data.counts.all} rezerwacji · {data.counts.confirmed} potwierdzonych · {fmtZl(data.confirmedValue)} obrót potwierdzony
				</span>
			</div>
		</header>

		<div class="filters">
			<div class="filter-chips">
				{#each STATUSES as f}
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
		</div>

		<div class="content">
			<div class="table-card">
				<table class="data-table">
					<thead>
						<tr>
							<th>Event</th>
							<th>Klient</th>
							<th>Termin</th>
							<th class="num">Dni</th>
							<th>Status</th>
							<th class="num">Wartość</th>
							<th>Kiedy</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#if addingBooking}
							<tr class="edit-row">
								<td colspan="8">
									<form
										method="POST"
										action="?/create"
										use:enhance={() => async ({ update }) => {
											await update();
											addingBooking = false;
											await invalidateAll();
										}}
										class="inline-form"
									>
										<input name="eventName" type="text" placeholder="Nazwa eventu *" class="f-event" required />
										<select name="clientId" class="f-client" required>
											<option value="">— Wybierz klienta —</option>
											{#each data.clients as c}
												<option value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>
											{/each}
										</select>
										<input name="startDate" type="date" class="f-date" required />
										<input name="endDate" type="date" class="f-date" required />
										<input name="venue" type="text" placeholder="Miejsce" class="f-venue" />
										<input name="priceZl" type="number" step="0.01" placeholder="Cena brutto (zł)" class="f-num" />
										<select name="status" class="f-status">
											<option value="draft">✏️ Szkic</option>
											<option value="confirmed">✅ Potwierdzone</option>
											<option value="in-progress">🚚 W trakcie</option>
										</select>
										<input name="notes" type="text" placeholder="Notatki" class="f-notes" />
										<button type="submit" class="btn-save">Dodaj</button>
										<button type="button" class="btn-cancel" onclick={() => (addingBooking = false)}>Anuluj</button>
									</form>
								</td>
							</tr>
						{:else}
							<tr class="add-row">
								<td colspan="8">
									<button class="btn-add" onclick={() => (addingBooking = true)}>+ Nowa rezerwacja</button>
								</td>
							</tr>
						{/if}

						{#each data.bookings as b}
							{@const until = daysUntil(b.startDate)}
							<tr class="row status-{b.status}">
								<td>
									<div class="event-cell">
										<span class="event-name">{b.eventName}</span>
										{#if b.venue}<span class="venue">📍 {b.venue}</span>{/if}
									</div>
								</td>
								<td>
									<div class="client-cell">
										<span class="c-name">{b.clientName ?? '—'}</span>
										{#if b.clientCompany}<span class="c-company">{b.clientCompany}</span>{/if}
										{#if b.clientPhone}<span class="c-phone">{b.clientPhone}</span>{/if}
									</div>
								</td>
								<td class="term">{eventRange(b.startDate, b.endDate)}</td>
								<td class="num days">{daysCount(b.startDate, b.endDate)}</td>
								<td>
									<span class="status-badge status-{b.status}">
										{STATUS_LABEL[b.status] ?? b.status}
									</span>
								</td>
								<td class="num price">{fmtZl(b.priceCents)}</td>
								<td>
									<span class="until" class:past={until.past} class:today={until.today} class:close={until.close}>
										{until.label}
									</span>
								</td>
								<td class="actions">
									<a href={`/bookings/${b.id}`} class="row-link">Szczegóły →</a>
								</td>
							</tr>
							{#if b.notes}
								<tr class="notes-row">
									<td></td>
									<td colspan="7" class="notes-cell">📝 {b.notes}</td>
								</tr>
							{/if}
						{/each}

						{#if data.bookings.length === 0}
							<tr class="empty">
								<td colspan="8">
									<div class="empty-state">
										<div class="empty-emoji">📅</div>
										<p>{data.statusFilter !== 'all' ? `Brak rezerwacji ze statusem "${STATUSES.find((s) => s.id === data.statusFilter)?.label}"` : 'Brak rezerwacji. Akceptowane oferty konwertują się tu automatycznie.'}</p>
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
	}
	.top-date {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--mute);
	}

	.filters {
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid var(--line);
		background: var(--paper);
	}
	.filter-chips {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
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
	}
	.chip:not(.active) .chip-count {
		background: var(--card);
		color: var(--mute);
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
		padding: 0.7rem 1rem;
		border-bottom: 1px solid var(--line-2);
		vertical-align: middle;
	}
	.data-table td.num {
		text-align: right;
		font-family: var(--font-mono);
	}

	.row:hover td {
		background: color-mix(in srgb, var(--wn-zielony) 3%, transparent);
	}

	.event-cell {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.event-name {
		font-weight: 600;
		color: var(--ink);
	}
	.venue {
		font-size: 0.73rem;
		color: var(--mute);
		font-family: var(--font-mono);
	}

	.client-cell {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.c-name {
		color: var(--ink-2);
		font-weight: 500;
	}
	.c-company {
		font-size: 0.73rem;
		color: var(--mute);
	}
	.c-phone {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--mute);
	}

	.term {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--ink-2);
		white-space: nowrap;
	}
	.days {
		color: var(--mute);
		font-weight: 600;
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
	.status-badge.status-draft {
		background: color-mix(in srgb, var(--mute) 14%, transparent);
		color: var(--mute);
	}
	.status-badge.status-confirmed {
		background: color-mix(in srgb, var(--wn-zielony) 18%, transparent);
		color: var(--wn-zielony-ink);
	}
	.status-badge.status-in-progress {
		background: color-mix(in srgb, var(--wn-granat) 15%, transparent);
		color: var(--wn-granat);
	}
	.status-badge.status-done {
		background: color-mix(in srgb, var(--wn-zarowka) 40%, transparent);
		color: #8a6d00;
	}
	.status-badge.status-cancelled {
		background: color-mix(in srgb, var(--wn-pomidor) 15%, transparent);
		color: var(--wn-pomidor);
	}

	.price {
		font-weight: 700;
		color: var(--wn-granat);
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

	.notes-row td {
		padding: 0 1rem 0.6rem;
		border-bottom: 1px solid var(--line-2);
		padding-top: 0;
	}
	.notes-cell {
		font-size: 0.78rem;
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
	.inline-form input,
	.inline-form select {
		padding: 0.35rem 0.55rem;
		border: 1px solid var(--line);
		border-radius: 5px;
		font-size: 0.8rem;
		background: var(--card);
	}
	.inline-form input:focus,
	.inline-form select:focus {
		border-color: var(--wn-zielony);
		outline: none;
	}
	.f-event {
		flex: 1;
		min-width: 160px;
	}
	.f-client {
		flex: 1;
		min-width: 180px;
	}
	.f-date {
		width: 150px;
	}
	.f-venue {
		flex: 1;
		min-width: 160px;
	}
	.f-num {
		width: 130px;
	}
	.f-status {
		width: 150px;
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
