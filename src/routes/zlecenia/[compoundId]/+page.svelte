<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	const z = $derived(data.zlecenie);

	let newNote = $state('');
	let addingNote = $state(false);

	// Status transitions per type
	const STATUS_OPTIONS: Record<string, Array<{ id: string; label: string; emoji: string }>> = {
		lead: [
			{ id: 'new', label: 'Nowy', emoji: '🆕' },
			{ id: 'contacted', label: 'Skontaktowany', emoji: '📞' },
			{ id: 'qualified', label: 'Kwalifikowany (hot)', emoji: '🎯' },
			{ id: 'lost', label: 'Przegrany', emoji: '✕' },
			{ id: 'archived', label: 'Archiwum', emoji: '📦' }
		],
		offer: [
			{ id: 'draft', label: 'Szkic', emoji: '✏️' },
			{ id: 'sent', label: 'Wysłana', emoji: '✉️' },
			{ id: 'viewed', label: 'Klient zobaczył', emoji: '👀' },
			{ id: 'accepted', label: 'Zaakceptowana', emoji: '✅' },
			{ id: 'rejected', label: 'Odrzucona', emoji: '✕' },
			{ id: 'expired', label: 'Wygasła', emoji: '⏰' }
		],
		booking: [
			{ id: 'draft', label: 'Szkic', emoji: '📝' },
			{ id: 'confirmed', label: 'Potwierdzona', emoji: '✅' },
			{ id: 'in-progress', label: 'W trakcie', emoji: '🚚' },
			{ id: 'done', label: 'Zakończona', emoji: '🎉' },
			{ id: 'cancelled', label: 'Anulowana', emoji: '✕' }
		]
	};
	const statusList = $derived(STATUS_OPTIONS[z.type] ?? []);

	const ICONS: Record<string, string> = {
		dashboard: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9ZM9 22V12h6v10',
		zlecenia: 'M22 12h-4l-3 9L9 3l-3 9H2',
		tents: 'M3 20 L12 4 L21 20 Z M8 20 L12 13 L16 20',
		settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'
	};
	const NAV = [
		{ id: 'dashboard', label: 'Home', href: '/dashboard' },
		{ id: 'zlecenia', label: 'Zlecenia', href: '/zlecenia', active: true },
		{ id: 'tents', label: 'Magazyn', href: '/magazyn' }
	];

	function fmtZl(cents: number | null | undefined) {
		if (cents == null) return '—';
		return (cents / 100).toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' zł';
	}
	function fmtDate(d: string | Date | null | undefined) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
	}
	function fmtDateTime(d: string | Date | null | undefined) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
	function eventRange(s: string | null, e: string | null) {
		if (!s) return '—';
		if (!e || s === e) return fmtDate(s);
		return `${fmtDate(s)} – ${fmtDate(e)}`;
	}
	function daysCount(s: string | null, e: string | null) {
		if (!s) return 0;
		const ed = e ?? s;
		return Math.max(1, Math.ceil((new Date(ed).getTime() - new Date(s).getTime()) / 86400000) + 1);
	}

	// Timeline events (stage-aware)
	const timeline = $derived.by(() => {
		const events: Array<{ label: string; date: Date | null; emoji: string; done: boolean }> = [];
		events.push({ label: 'Utworzono', date: z.createdAt, emoji: '➕', done: true });
		if (z.type === 'offer' || (z.type === 'lead' && z.status === 'quoted')) {
			events.push({ label: 'Wysłano ofertę', date: z.sentAt, emoji: '📤', done: !!z.sentAt });
			events.push({ label: 'Klient otworzył', date: z.viewedAt, emoji: '👁️', done: !!z.viewedAt });
			events.push({ label: 'Zaakceptowana', date: z.acceptedAt, emoji: '✓', done: !!z.acceptedAt });
		}
		if (z.type === 'booking') {
			events.push({ label: 'Event start', date: z.event.startDate ? new Date(z.event.startDate) : null, emoji: '🚀', done: z.event.startDate ? new Date(z.event.startDate) <= new Date() : false });
			events.push({ label: 'Event koniec', date: z.event.endDate ? new Date(z.event.endDate) : null, emoji: '🎉', done: z.status === 'done' });
		}
		return events;
	});
</script>

<svelte:head>
	<title>{z.event.name} · Zlecenie · Wolny Namiot</title>
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
			<a href="/settings" class="rail-item">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
					<path d={ICONS.settings} />
				</svg>
				<span class="rail-label">Ustaw.</span>
			</a>
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
				<a href="/zlecenia" class="back-link">← Zlecenia</a>
				<h1>{z.event.name}</h1>
				<span class="stage-chip">{z.stageEmoji} {z.stageLabel}</span>
				{#if z.number}<span class="mono-num">{z.number}</span>{/if}
			</div>
			<div class="top-right">
				{#if z.type === 'offer'}
					<a href={`/offers/${z.id}`} class="btn-primary">🖨️ PDF oferty</a>
				{/if}
				{#if z.type === 'lead'}
					<a href={`/offers/new?leadId=${z.id}`} class="btn-primary">+ Oferta z leada</a>
				{/if}
			</div>
		</header>

		<div class="content">
			<!-- 1. KLIENT -->
			<section class="card">
				<h2>Klient</h2>
				<div class="client-block">
					<div class="c-name-row">
						<span class="c-name">{z.client?.name ?? '—'}</span>
						{#if z.client?.company}<span class="c-company">{z.client.company}</span>{/if}
						{#if z.source}<span class="source-chip">źródło: {z.source}</span>{/if}
					</div>
					<div class="c-contact">
						{#if z.client?.phone}<a href={`tel:${z.client.phone}`}>📞 {z.client.phone}</a>{/if}
						{#if z.client?.email}<a href={`mailto:${z.client.email}`}>✉️ {z.client.email}</a>{/if}
						{#if z.client?.address}<span>📍 {z.client.address}</span>{/if}
					</div>
				</div>
			</section>

			<!-- 2. EVENT -->
			<section class="card">
				<h2>Event</h2>
				<div class="event-grid">
					<div class="e-field">
						<span class="e-label">Termin</span>
						<span class="e-val">{eventRange(z.event.startDate, z.event.endDate)}</span>
					</div>
					<div class="e-field">
						<span class="e-label">Dni</span>
						<span class="e-val">{daysCount(z.event.startDate, z.event.endDate)}</span>
					</div>
					{#if z.event.guestsCount}
						<div class="e-field">
							<span class="e-label">Gości</span>
							<span class="e-val">{z.event.guestsCount}</span>
						</div>
					{/if}
					<div class="e-field">
						<span class="e-label">Miejsce</span>
						<span class="e-val">{z.event.venue ?? '—'}</span>
					</div>
				</div>
			</section>

			<!-- 3. POZYCJE (jeśli są) -->
			{#if z.items.length > 0}
				<section class="card">
					<h2>Pozycje · {z.items.length}</h2>
					<table class="items-t">
						<thead>
							<tr>
								<th>Pozycja</th>
								<th class="num">Ilość</th>
								<th class="num">Razem</th>
							</tr>
						</thead>
						<tbody>
							{#each z.items as it}
								<tr>
									<td>{it.description}</td>
									<td class="num">{it.quantity}</td>
									<td class="num price">{fmtZl(it.lineTotalCents)}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr>
								<td colspan="2" class="total-label">Razem (brutto)</td>
								<td class="num total-val">{fmtZl(z.totalCents)}</td>
							</tr>
						</tfoot>
					</table>
				</section>
			{:else if z.totalCents}
				<section class="card">
					<h2>Wartość</h2>
					<div class="big-price">{fmtZl(z.totalCents)}</div>
				</section>
			{/if}

			<!-- 4. WIADOMOŚĆ OD KLIENTA (dla leadów) -->
			{#if z.message}
				<section class="card">
					<h2>Wiadomość od klienta</h2>
					<p class="msg-text">💬 {z.message}</p>
				</section>
			{/if}

			<!-- 5. NOTATKI + ADD FORM -->
			<section class="card">
				<div class="notes-head">
					<h2>Notatki wewnętrzne</h2>
					{#if !addingNote}
						<button class="btn-ghost-sm" onclick={() => (addingNote = true)}>+ Dodaj notatkę</button>
					{/if}
				</div>
				{#if addingNote}
					<form
						method="POST"
						action="?/addNote"
						use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === 'success') {
									newNote = '';
									addingNote = false;
								}
								await update();
								await invalidateAll();
							};
						}}
						class="note-form"
					>
						<textarea
							name="content"
							bind:value={newNote}
							placeholder="Napisz notatkę... (kto dzwonił, o co pytał, co ustaliliście)"
							rows="3"
							required
							autofocus
						></textarea>
						<div class="note-actions">
							<button type="button" class="btn-ghost-sm" onclick={() => { addingNote = false; newNote = ''; }}>Anuluj</button>
							<button type="submit" class="btn-primary-sm">Zapisz notatkę</button>
						</div>
					</form>
				{/if}
				<div class="notes-list">
					{#if z.notes}
						{#each z.notes.split('\n\n') as noteChunk}
							<div class="note-entry">{noteChunk}</div>
						{/each}
					{:else}
						<p class="empty-note">— brak notatek —</p>
					{/if}
				</div>
			</section>

			<!-- 6. ZMIANA STATUSU -->
			<section class="card">
				<h2>Status</h2>
				{#if z.type === 'lead'}
					<p class="status-hint">
						Żeby wysłać ofertę → klik <strong>"+ Oferta z leada"</strong> w prawym górnym rogu (otwiera kalkulator). Po zapisaniu oferty lead automatycznie dostanie status <em>"oferta wysłana"</em>.
					</p>
				{/if}
				<form
					method="POST"
					action="?/updateStatus"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							await invalidateAll();
						};
					}}
					class="status-form"
				>
					<div class="status-chips">
						{#each statusList as s}
							<button
								type="submit"
								name="status"
								value={s.id}
								class="status-chip-btn"
								class:active={z.status === s.id}
							>
								<span>{s.emoji}</span>
								<span>{s.label}</span>
							</button>
						{/each}
					</div>
				</form>
			</section>

			<!-- 7. TIMELINE -->
			<section class="card">
				<h2>Przebieg</h2>
				<ul class="timeline">
					{#each timeline as t}
						<li class:done={t.done}>
							<span class="t-emoji">{t.emoji}</span>
							<span class="t-label">{t.label}</span>
							<span class="t-date">{fmtDateTime(t.date)}</span>
						</li>
					{/each}
				</ul>
			</section>
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
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--paper);
		position: sticky;
		top: 0;
		z-index: 10;
		gap: 1rem;
	}
	.top-left {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		flex-wrap: wrap;
	}
	.back-link {
		font-size: 0.82rem;
		color: var(--mute);
		text-decoration: none;
	}
	h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--ink);
	}
	.stage-chip {
		padding: 0.25rem 0.65rem;
		background: var(--paper-2);
		border-radius: 4px;
		font-size: 0.78rem;
		color: var(--ink-2);
	}
	.mono-num {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--wn-granat);
		font-weight: 600;
	}
	.btn-primary {
		padding: 0.5rem 1rem;
		background: var(--wn-zielony);
		color: var(--wn-plotno);
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
	}

	.content {
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 900px;
		margin: 0 auto;
		width: 100%;
	}
	.topbar {
		padding-left: max(1.5rem, calc((100% - 900px) / 2));
		padding-right: max(1.5rem, calc((100% - 900px) / 2));
	}

	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 1rem 1.25rem;
	}
	.card h2 {
		margin: 0 0 0.85rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--mute);
		font-family: var(--font-mono);
		font-weight: 600;
	}

	.client-block {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.c-name-row {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.c-name {
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--ink);
	}
	.c-company {
		color: var(--ink-2);
	}
	.source-chip {
		padding: 0.15rem 0.5rem;
		background: var(--paper-2);
		border-radius: 4px;
		font-size: 0.72rem;
		font-family: var(--font-mono);
		color: var(--mute);
	}
	.c-contact {
		display: flex;
		gap: 1rem;
		font-size: 0.88rem;
		flex-wrap: wrap;
	}
	.c-contact a {
		color: var(--wn-granat);
		text-decoration: none;
	}
	.c-contact a:hover {
		text-decoration: underline;
	}

	.event-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.85rem;
	}
	.e-field {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.e-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--mute);
		font-family: var(--font-mono);
	}
	.e-val {
		font-size: 0.95rem;
		color: var(--ink);
		font-weight: 500;
	}

	.items-t {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.88rem;
	}
	.items-t th {
		text-align: left;
		padding: 0.5rem 0.7rem;
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--mute);
		border-bottom: 1px solid var(--line);
		font-family: var(--font-mono);
	}
	.items-t th.num {
		text-align: right;
	}
	.items-t td {
		padding: 0.55rem 0.7rem;
		border-bottom: 1px solid var(--line-2);
	}
	.items-t td.num {
		text-align: right;
		font-family: var(--font-mono);
	}
	.items-t td.price {
		font-weight: 600;
		color: var(--wn-granat);
	}
	.items-t tfoot td {
		border-bottom: none;
		padding-top: 0.75rem;
		border-top: 1px solid var(--line);
	}
	.total-label {
		font-weight: 600;
	}
	.total-val {
		font-family: var(--font-mono);
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--ink);
	}

	.big-price {
		font-family: var(--font-mono);
		font-size: 2rem;
		font-weight: 700;
		color: var(--wn-granat);
	}

	.msg-text {
		margin: 0;
		font-size: 0.92rem;
		color: var(--ink-2);
		line-height: 1.55;
	}
	.notes-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.85rem;
	}
	.notes-head h2 {
		margin: 0;
	}
	.btn-ghost-sm {
		padding: 0.35rem 0.75rem;
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 5px;
		font-size: 0.78rem;
		color: var(--ink-2);
		cursor: pointer;
	}
	.btn-ghost-sm:hover {
		border-color: var(--wn-zielony);
		color: var(--wn-zielony-ink);
	}
	.btn-primary-sm {
		padding: 0.35rem 0.9rem;
		background: var(--wn-zielony);
		color: var(--wn-plotno);
		border: none;
		border-radius: 5px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}
	.note-form {
		margin-bottom: 1rem;
	}
	.note-form textarea {
		width: 100%;
		padding: 0.65rem 0.85rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		font-family: var(--font-sans);
		font-size: 0.9rem;
		background: var(--paper-2);
		color: var(--ink);
		resize: vertical;
	}
	.note-form textarea:focus {
		outline: none;
		border-color: var(--wn-zielony);
	}
	.note-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 0.5rem;
	}
	.notes-list {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.note-entry {
		padding: 0.7rem 0.95rem;
		background: var(--paper-2);
		border-left: 3px solid var(--wn-zielony);
		border-radius: 0 6px 6px 0;
		font-size: 0.88rem;
		color: var(--ink-2);
		line-height: 1.55;
		white-space: pre-wrap;
	}
	.empty-note {
		color: var(--dim);
		font-style: italic;
	}

	.status-hint {
		margin: 0 0 0.85rem;
		padding: 0.6rem 0.85rem;
		background: color-mix(in srgb, var(--wn-zielony) 8%, transparent);
		border-left: 3px solid var(--wn-zielony);
		border-radius: 0 6px 6px 0;
		font-size: 0.85rem;
		color: var(--ink-2);
	}
	.status-hint strong {
		color: var(--ink);
	}
	.status-hint em {
		font-style: italic;
		color: var(--wn-zielony-ink);
	}

	/* STATUS buttons */
	.status-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.status-chip-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.45rem 0.8rem;
		background: var(--paper-2);
		border: 1px solid var(--line);
		border-radius: 20px;
		font-size: 0.82rem;
		color: var(--ink-2);
		cursor: pointer;
		font-family: var(--font-sans);
		transition: all 120ms ease;
	}
	.status-chip-btn:hover {
		border-color: var(--wn-zielony);
		color: var(--wn-zielony-ink);
	}
	.status-chip-btn.active {
		background: var(--wn-atrament);
		color: var(--wn-plotno);
		border-color: var(--wn-atrament);
		font-weight: 500;
	}

	.timeline {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.timeline li {
		display: grid;
		grid-template-columns: 28px 1fr auto;
		gap: 0.6rem;
		align-items: center;
		padding: 0.5rem 0.65rem;
		background: var(--paper-2);
		border-radius: 6px;
		font-size: 0.85rem;
		opacity: 0.5;
	}
	.timeline li.done {
		opacity: 1;
	}
	.t-emoji {
		font-size: 1.1rem;
	}
	.t-label {
		color: var(--ink);
		font-weight: 500;
	}
	.t-date {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--mute);
	}

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
			z-index: 50;
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
	}
</style>
