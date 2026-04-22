<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';

	let { data } = $props();

	let editingId = $state<string | null>(null);
	let addingLead = $state(false);

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
		{ id: 'all', label: 'Wszyscy' },
		{ id: 'new', label: 'Nowi' },
		{ id: 'contacted', label: 'Skontaktowani' },
		{ id: 'qualified', label: 'Kwalifikowani' },
		{ id: 'quoted', label: 'Oferta wysłana' },
		{ id: 'won', label: 'Wygrani' },
		{ id: 'lost', label: 'Przegrani' }
	];

	const STATUS_OPTIONS = [
		{ id: 'new', label: '🆕 Nowy' },
		{ id: 'contacted', label: '📞 Skontaktowany' },
		{ id: 'qualified', label: '🎯 Kwalifikowany' },
		{ id: 'quoted', label: '✉️ Oferta wysłana' },
		{ id: 'won', label: '✅ Wygrany' },
		{ id: 'lost', label: '✕ Przegrany' },
		{ id: 'archived', label: '📦 Archiwum' }
	];

	const SOURCE_EMOJI: Record<string, string> = {
		website: '🌐',
		phone: '📞',
		referral: '👤',
		facebook: '📘',
		olx: '🟢',
		other: '📝'
	};
	const SOURCE_LABEL: Record<string, string> = {
		website: 'strona',
		phone: 'telefon',
		referral: 'polecenie',
		facebook: 'Facebook',
		olx: 'OLX',
		other: 'inne'
	};

	function fmtDate(d: Date | string | null | undefined) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
	}
	function fmtEventDate(d: string | null | undefined) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function applyFilter(status: string) {
		const params = new URLSearchParams();
		if (status !== 'all') params.set('status', status);
		goto(`/leads${params.toString() ? '?' + params.toString() : ''}`);
	}
</script>

<svelte:head>
	<title>Leady · Wolny Namiot panel</title>
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
				<h1>Leady</h1>
				<span class="top-date">
					{data.counts.all} leadów ·
					{data.counts.new} nowych ·
					{data.counts.qualified} kwalifikowanych ·
					{Math.round((data.counts.won / Math.max(1, data.counts.all)) * 100)}% win rate
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
							<th>Data</th>
							<th>Kontakt</th>
							<th>Event + termin</th>
							<th class="num">Goście</th>
							<th>Źródło</th>
							<th>Status</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#if addingLead}
							<tr class="edit-row">
								<td colspan="7">
									<form
										method="POST"
										action="?/create"
										use:enhance={() => async ({ update }) => {
											await update();
											addingLead = false;
											await invalidateAll();
										}}
										class="inline-form"
									>
										<input name="name" type="text" placeholder="Imię / nazwa firmy *" class="f-name" required />
										<input name="phone" type="tel" placeholder="Telefon" class="f-phone" />
										<input name="email" type="email" placeholder="Email" class="f-email" />
										<input name="eventName" type="text" placeholder="Event (np. Wesele)" class="f-event" />
										<input name="eventDateHint" type="date" class="f-date" />
										<input name="guestsCount" type="number" placeholder="Gości" class="f-num" />
										<input name="venueHint" type="text" placeholder="Miejsce" class="f-venue" />
										<select name="source" class="f-source">
											<option value="website">🌐 strona</option>
											<option value="phone">📞 telefon</option>
											<option value="referral">👤 polecenie</option>
											<option value="facebook">📘 Facebook</option>
											<option value="olx">🟢 OLX</option>
											<option value="other">📝 inne</option>
										</select>
										<input name="message" type="text" placeholder="Wiadomość od klienta" class="f-message" />
										<button type="submit" class="btn-save">Dodaj leada</button>
										<button type="button" class="btn-cancel" onclick={() => (addingLead = false)}>Anuluj</button>
									</form>
								</td>
							</tr>
						{:else}
							<tr class="add-row">
								<td colspan="7">
									<button class="btn-add" onclick={() => (addingLead = true)}>+ Nowy lead</button>
								</td>
							</tr>
						{/if}

						{#each data.leads as l}
							{#if editingId === l.id}
								<tr class="edit-row">
									<td colspan="7">
										<form
											method="POST"
											action="?/update"
											use:enhance={() => async ({ update }) => {
												await update();
												editingId = null;
												await invalidateAll();
											}}
											class="inline-form edit-layout"
										>
											<input type="hidden" name="id" value={l.id} />
											<input name="name" type="text" value={l.name} placeholder="Imię / firma" class="f-name" required />
											<input name="company" type="text" value={l.company ?? ''} placeholder="Firma" class="f-company" />
											<input name="phone" type="tel" value={l.phone ?? ''} placeholder="Telefon" class="f-phone" />
											<input name="email" type="email" value={l.email ?? ''} placeholder="Email" class="f-email" />
											<input name="eventName" type="text" value={l.eventName ?? ''} placeholder="Event" class="f-event" />
											<input name="eventDateHint" type="date" value={l.eventDateHint ?? ''} class="f-date" />
											<input name="guestsCount" type="number" value={l.guestsCount ?? ''} placeholder="Gości" class="f-num" />
											<input name="venueHint" type="text" value={l.venueHint ?? ''} placeholder="Miejsce" class="f-venue" />
											<select name="source" value={l.source ?? 'website'} class="f-source">
												<option value="website">🌐 strona</option>
												<option value="phone">📞 telefon</option>
												<option value="referral">👤 polecenie</option>
												<option value="facebook">📘 Facebook</option>
												<option value="olx">🟢 OLX</option>
												<option value="other">📝 inne</option>
											</select>
											<select name="status" value={l.status} class="f-status">
												{#each STATUS_OPTIONS as s}
													<option value={s.id}>{s.label}</option>
												{/each}
											</select>
											<textarea name="notes" placeholder="Notatki wewnętrzne" class="f-notes" rows="2">{l.notes ?? ''}</textarea>
											<button type="submit" class="btn-save">Zapisz</button>
											<button type="button" class="btn-cancel" onclick={() => (editingId = null)}>Anuluj</button>
										</form>
									</td>
								</tr>
							{:else}
								<tr class="row lead-row status-{l.status}">
									<td class="mono">{fmtDate(l.createdAt)}</td>
									<td>
										<div class="contact-cell">
											<span class="lead-name">{l.name}</span>
											{#if l.company}<span class="lead-company">{l.company}</span>{/if}
											{#if l.phone}<span class="lead-phone">{l.phone}</span>{/if}
											{#if l.email}<span class="lead-email">{l.email}</span>{/if}
										</div>
									</td>
									<td>
										<div class="event-cell">
											<span class="event-name">{l.eventName ?? '—'}</span>
											{#if l.eventDateHint}
												<span class="event-date">{fmtEventDate(l.eventDateHint)}</span>
											{/if}
											{#if l.venueHint}
												<span class="event-venue">📍 {l.venueHint}</span>
											{/if}
										</div>
									</td>
									<td class="num guests">{l.guestsCount ?? '—'}</td>
									<td>
										<span class="source-chip">
											<span>{SOURCE_EMOJI[l.source ?? 'other']}</span>
											{SOURCE_LABEL[l.source ?? 'other']}
										</span>
									</td>
									<td>
										<span class="status-chip status-{l.status}">
											{STATUS_OPTIONS.find((s) => s.id === l.status)?.label ?? l.status}
										</span>
									</td>
									<td class="actions">
										<a href={`/offers/new?leadId=${l.id}`} class="row-offer" title="Utwórz ofertę z tego leada">
											+ Oferta
										</a>
										<button class="row-edit" onclick={() => (editingId = l.id)}>Edytuj</button>
									</td>
								</tr>
								{#if l.message}
									<tr class="msg-row status-{l.status}">
										<td></td>
										<td colspan="6" class="msg-cell">
											💬 {l.message}
											{#if l.notes}
												<div class="lead-notes">📝 {l.notes}</div>
											{/if}
										</td>
									</tr>
								{/if}
							{/if}
						{/each}
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
		padding: 0.55rem 1rem;
		border-bottom: 1px solid var(--line-2);
		vertical-align: top;
	}
	.data-table td.num {
		text-align: right;
		font-family: var(--font-mono);
	}
	.data-table td.mono {
		font-family: var(--font-mono);
		font-size: 0.73rem;
		color: var(--mute);
		white-space: nowrap;
	}

	.lead-row:hover {
		background: color-mix(in srgb, var(--wn-zielony) 2%, transparent);
	}

	/* CONTACT cell */
	.contact-cell {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.lead-name {
		font-weight: 600;
		color: var(--ink);
	}
	.lead-company {
		font-size: 0.77rem;
		color: var(--ink-2);
	}
	.lead-phone,
	.lead-email {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--mute);
	}

	/* EVENT cell */
	.event-cell {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.event-name {
		color: var(--ink);
		font-weight: 500;
	}
	.event-date {
		font-family: var(--font-mono);
		font-size: 0.74rem;
		color: var(--wn-granat);
	}
	.event-venue {
		font-size: 0.73rem;
		color: var(--mute);
	}
	.guests {
		font-weight: 600;
		color: var(--ink-2);
	}

	/* SOURCE chip */
	.source-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.18rem 0.5rem;
		background: var(--paper-2);
		border-radius: 4px;
		font-size: 0.75rem;
		color: var(--ink-2);
	}

	/* STATUS chip */
	.status-chip {
		display: inline-flex;
		align-items: center;
		padding: 0.22rem 0.6rem;
		border-radius: 4px;
		font-size: 0.74rem;
		font-weight: 500;
	}
	.status-chip.status-new {
		background: color-mix(in srgb, var(--wn-atrament) 8%, transparent);
		color: var(--ink-2);
	}
	.status-chip.status-contacted {
		background: color-mix(in srgb, var(--wn-granat) 14%, transparent);
		color: var(--wn-granat);
	}
	.status-chip.status-qualified {
		background: color-mix(in srgb, var(--wn-zielony) 18%, transparent);
		color: var(--wn-zielony-ink);
	}
	.status-chip.status-quoted {
		background: color-mix(in srgb, var(--wn-zarowka) 45%, transparent);
		color: #8a6d00;
	}
	.status-chip.status-won {
		background: var(--wn-zielony);
		color: var(--wn-plotno);
	}
	.status-chip.status-lost {
		background: color-mix(in srgb, var(--wn-pomidor) 12%, transparent);
		color: var(--wn-pomidor);
	}
	.status-chip.status-archived {
		background: var(--paper-2);
		color: var(--mute);
	}

	/* ACTIONS */
	.data-table td.actions {
		text-align: right;
		white-space: nowrap;
	}
	.row-offer {
		padding: 0.3rem 0.65rem;
		background: color-mix(in srgb, var(--wn-zielony) 12%, transparent);
		color: var(--wn-zielony-ink);
		border-radius: 4px;
		font-size: 0.74rem;
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

	/* MESSAGE row */
	.msg-row td {
		padding: 0 1rem 0.6rem;
		border-bottom: 1px solid var(--line-2);
	}
	.msg-cell {
		font-size: 0.82rem;
		color: var(--ink-2);
		font-style: italic;
		line-height: 1.5;
	}
	.lead-notes {
		margin-top: 0.3rem;
		padding-top: 0.3rem;
		border-top: 1px dashed var(--line);
		font-style: normal;
		color: var(--mute);
		font-size: 0.78rem;
	}

	/* INLINE EDIT / ADD */
	.edit-row td {
		background: color-mix(in srgb, var(--wn-zielony) 4%, transparent);
		padding: 0.65rem 1rem;
	}
	.inline-form {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
	}
	.inline-form input,
	.inline-form select,
	.inline-form textarea {
		padding: 0.35rem 0.55rem;
		border: 1px solid var(--line);
		border-radius: 5px;
		font-size: 0.8rem;
		font-family: var(--font-sans);
		background: var(--card);
	}
	.inline-form input:focus,
	.inline-form select:focus,
	.inline-form textarea:focus {
		border-color: var(--wn-zielony);
		outline: none;
	}
	.f-name {
		flex: 1;
		min-width: 180px;
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
		min-width: 180px;
	}
	.f-event {
		flex: 1;
		min-width: 140px;
	}
	.f-date {
		width: 140px;
	}
	.f-num {
		width: 70px;
	}
	.f-venue {
		flex: 1;
		min-width: 140px;
	}
	.f-message {
		flex: 1;
		min-width: 220px;
	}
	.f-source {
		width: 140px;
	}
	.f-status {
		width: 160px;
	}
	.f-notes {
		flex: 1;
		min-width: 280px;
		min-height: 40px;
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
		font-size: 0.82rem;
		color: var(--wn-zielony-ink);
		cursor: pointer;
		font-family: var(--font-sans);
		font-weight: 500;
		border-bottom: 1px dashed var(--line);
	}
	.btn-add:hover {
		background: color-mix(in srgb, var(--wn-zielony) 5%, transparent);
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
