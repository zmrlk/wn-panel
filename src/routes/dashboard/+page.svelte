<script lang="ts">
	import { goto } from '$app/navigation';
	import SidebarRail from '$lib/components/SidebarRail.svelte';
	let { data } = $props();

	// Dynamiczna data w nagłówku
	const today = new Date();
	const dateLabel = today.toLocaleDateString('pl-PL', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});
	const weekdayPL = today.toLocaleDateString('pl-PL', { weekday: 'long' });
	const seasonLabel = (() => {
		const m = today.getMonth(); // 0-11
		if (m >= 3 && m <= 8) {
			// kwiecień-wrzesień = sezon
			const monthsPL = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
			return `sezon do 30 ${monthsPL[8]}`;
		}
		const daysToMay = Math.max(0, Math.floor((new Date(today.getFullYear(), 4, 1).getTime() - today.getTime()) / 86400000));
		return daysToMay > 0 ? `${daysToMay} dni do majówki` : 'majówka trwa';
	})();

	// Range toggle
	const currentRange = data.range ?? '21d';
	function setRange(r: '21d' | 'month' | 'season') {
		const p = new URLSearchParams();
		if (r !== '21d') p.set('range', r);
		goto(`/dashboard${p.toString() ? '?' + p.toString() : ''}`);
	}

	// Search (⌘K → routuje do /zlecenia?q=)
	let searchOpen = $state(false);
	let searchInput = $state('');
	function submitGlobalSearch(ev: SubmitEvent) {
		ev.preventDefault();
		const q = searchInput.trim();
		if (!q) return;
		goto(`/zlecenia?tab=wszystko&q=${encodeURIComponent(q)}`);
	}
	function onKeydown(ev: KeyboardEvent) {
		if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
			ev.preventDefault();
			searchOpen = true;
		}
		if (ev.key === 'Escape') searchOpen = false;
	}

	// VRS-style icon paths (lifted)
	const ICONS: Record<string, string> = {
		dashboard: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9ZM9 22V12h6v10',
		zlecenia: 'M22 12h-4l-3 9L9 3l-3 9H2',
		leads: 'M22 12h-4l-3 9L9 3l-3 9H2',
		offers: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
		calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
		tents: 'M3 20 L12 4 L21 20 Z M8 20 L12 13 L16 20',
		team: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
		clients: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
		bookings: 'M3 3h18v18H3zM3 9h18M9 21V9',
		photos: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M21 15l-5-5L5 21',
		pricing: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
		settings: 'M20 7h-9 M14 17H5 M17 14a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z M7 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z'
	};

	const MAIN = [
		{ id: 'dashboard', label: 'Home', active: true },
		{ id: 'zlecenia', label: 'Zlecenia' },
		{ id: 'tents', label: 'Magazyn' },
		{ id: 'team', label: 'Zespół' }
	];
	const ADMIN = [{ id: 'settings', label: 'Ustaw.' }];

	// Komórka: available vs total → kolor + label
	function cellState(item: typeof data.items[number], iso: string) {
		const reserved = item.reserved[iso] ?? 0;
		const maint = item.maintenance[iso] ?? 0;
		const available = item.total - reserved - maint;
		const ratio = available / item.total;
		let cls = 'cell full';
		if (maint > 0 && reserved === 0 && available === item.total - maint) cls = 'cell maint';
		else if (available === 0) cls = 'cell zero';
		else if (ratio < 0.5) cls = 'cell low';
		else if (ratio < 1) cls = 'cell mid';
		return { cls, available, total: item.total, reserved, maint };
	}

	// Display label — skala: dla małych <=10 pokazuj X/Y, dla dużych pokaż X
	function cellLabel(s: { available: number; total: number; maint: number; reserved: number }) {
		if (s.maint > 0 && s.reserved === 0) return `-${s.maint}`;
		if (s.total <= 10) return `${s.available}/${s.total}`;
		return `${s.available}`;
	}

	// Group items by category for matrix (admin only)
	const grouped = (data.items ?? []).reduce<Record<string, NonNullable<typeof data.items>>>((acc, it) => {
		acc[it.group] = acc[it.group] ?? [];
		acc[it.group].push(it);
		return acc;
	}, {});
	const groupOrder = ['Namioty', 'Stoły', 'Krzesła', 'Ławki', 'Oświetlenie', 'Akcesoria'];

	const groupEmoji: Record<string, string> = {
		Namioty: '⛺',
		Stoły: '🟫',
		Krzesła: '🪑',
		Ławki: '🪵',
		Oświetlenie: '💡',
		Akcesoria: '🔧'
	};
</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
	<title>Dashboard · Wolny Namiot panel</title>
</svelte:head>

<div class="app">
	<SidebarRail activeId="dashboard" isAdmin={data.isAdmin} userName={data.user.name} userEmail={data.user.email} />

	<!-- ─── MAIN ────────────────────────────────────────────── -->
	<main class="main">
		<!-- Top bar: kompakt, wszystko w jednym rzędzie -->
		<header class="topbar">
			<div class="top-left">
				<h1>{data.employeeView ? 'Plan pracy' : 'Dashboard'}</h1>
				<span class="top-date">
					{#if data.employeeView}
						{data.nowDate} · {data.totalAssigned} zleceń przypisanych
					{:else}
						{dateLabel} · {seasonLabel}
					{/if}
				</span>
			</div>
			<div class="top-right">
				{#if !data.employeeView}
				<div class="status-inline">
					<span class="si"><b>{data.status.eventsThisWeek}</b> eventy w tygodniu</span>
					<span class="dot-sep">·</span>
					<span class="si" class:alert={data.status.needsAttention > 0}><b>{data.status.needsAttention}</b> wymagają akcji</span>
					<span class="dot-sep">·</span>
					<span class="si"><b>{data.status.flagshipFreeDays}</b>/{data.status.totalDays} dni wolne ({data.status.flagshipName})</span>
				</div>
				{/if}
				<button class="cmdk" type="button" onclick={() => (searchOpen = true)}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<circle cx="11" cy="11" r="8" />
						<path d="m21 21-4.3-4.3" />
					</svg>
					<span>szukaj</span>
					<kbd>⌘K</kbd>
				</button>
			</div>
		</header>

		{#if searchOpen}
			<div class="search-overlay" onclick={() => (searchOpen = false)} role="presentation">
				<form class="search-panel" onclick={(e) => e.stopPropagation()} onsubmit={submitGlobalSearch}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<circle cx="11" cy="11" r="8" />
						<path d="m21 21-4.3-4.3" />
					</svg>
					<!-- svelte-ignore a11y_autofocus -->
					<input
						type="search"
						autofocus
						bind:value={searchInput}
						placeholder="Szukaj klienta, eventu, miejsca…"
					/>
					<kbd>Esc</kbd>
				</form>
			</div>
		{/if}

		<div class="content">
			{#if data.employeeView}
				<!-- ═══ PRACOWNIK: plan pracy zgrupowany ═══ -->
				{#if data.groups.length === 0}
					<div class="empty-work">
						<div class="empty-emoji">🏖️</div>
						<h2>Brak zleceń</h2>
						<p>Nie masz przypisanych eventów. Admin dobierze Cię do zespołu i tu się pojawią.</p>
					</div>
				{:else}
					{#each data.groups as g}
						<section class="work-group">
							<h2 class="group-title">{g.emoji} {g.label} <span class="group-count">({g.events.length})</span></h2>
							<div class="work-cards">
								{#each g.events as ev}
									<a href={`/zlecenia/booking-${ev.bookingId}`} class="work-card status-{ev.status}">
										<div class="wc-head">
											<span class="wc-task">
												{#if ev.task === 'driver'}🚚 kierowca
												{:else if ev.task === 'installer'}🔨 montażysta
												{:else if ev.task === 'lead'}👑 lider
												{:else}{ev.task}{/if}
											</span>
											<span class="wc-status-pill">
												{#if ev.status === 'confirmed'}Potwierdzona
												{:else if ev.status === 'in-progress'}🚚 W realizacji
												{:else if ev.status === 'done'}✓ Zakończony
												{:else if ev.status === 'draft'}Szkic
												{:else}{ev.status}{/if}
											</span>
										</div>
										<h3 class="wc-name">{ev.eventName}</h3>
										<div class="wc-meta">
											<div class="wc-row"><span class="wc-icon">📅</span> {ev.startDate}{ev.endDate !== ev.startDate ? ` — ${ev.endDate}` : ''}</div>
											{#if ev.venue}<div class="wc-row"><span class="wc-icon">📍</span> {ev.venue}</div>{/if}
											{#if ev.clientName}
												<div class="wc-row"><span class="wc-icon">👤</span> {ev.clientName}</div>
											{/if}
											{#if ev.clientPhone}
												<div class="wc-row"><span class="wc-icon">📞</span> <span class="wc-phone">{ev.clientPhone}</span></div>
											{/if}
											{#if ev.assignmentNotes}
												<div class="wc-row wc-note"><span class="wc-icon">📝</span> {ev.assignmentNotes}</div>
											{/if}
										</div>
										<div class="wc-cta">Otwórz zlecenie →</div>
									</a>
								{/each}
							</div>
						</section>
					{/each}
				{/if}

			{:else}

			{#if data.status.belowMin > 0}
				<div class="alert-banner alert-below">
					<span class="alert-icon">⚠️</span>
					<div class="alert-body">
						<strong>{data.status.belowMin} {data.status.belowMin === 1 ? 'pozycja' : 'pozycji'} poniżej min. stanu magazynowego</strong>
						<span class="alert-items">
							{#each data.status.belowMinItems as it, i}
								{it.name} ({it.totalQty}/{it.minQty}){#if i < data.status.belowMinItems.length - 1}, {/if}
							{/each}
						</span>
					</div>
					<a href="/magazyn" class="alert-cta">Magazyn →</a>
				</div>
			{:else if data.status.atMin > 0}
				<div class="alert-banner alert-at">
					<span class="alert-icon">⚠</span>
					<div class="alert-body">
						<strong>{data.status.atMin} {data.status.atMin === 1 ? 'pozycja' : 'pozycji'} na minimum</strong>
						<span class="alert-items">
							{#each data.status.atMinItems as it, i}
								{it.name} ({it.totalQty}){#if i < data.status.atMinItems.length - 1}, {/if}
							{/each}
						</span>
					</div>
					<a href="/magazyn" class="alert-cta">Magazyn →</a>
				</div>
			{/if}

			<!-- HERO: availability matrix -->
			<section class="card matrix-card">
				<div class="card-head">
					<h2>Dostępność — {data.rangeLabel}</h2>
					<div class="tabs">
						<button class="tab" class:active={currentRange === '21d'} onclick={() => setRange('21d')}>21 dni</button>
						<button class="tab" class:active={currentRange === 'month'} onclick={() => setRange('month')}>Miesiąc</button>
						<button class="tab" class:active={currentRange === 'season'} onclick={() => setRange('season')}>Sezon</button>
					</div>
				</div>

				<div class="matrix">
					<div class="matrix-grid" style="grid-template-columns: 200px repeat({data.days.length}, minmax(32px, 1fr));">
						<div class="corner"></div>
						{#each data.days as day}
							<div class="day-head" class:today={day.isToday} class:weekend={day.isWeekend}>
								<div class="d-num">{day.day}</div>
								<div class="d-wd">{day.weekday}</div>
							</div>
						{/each}

						{#each groupOrder as group}
							{#if grouped[group]}
								<div class="group-head" style="grid-column: 1 / -1;">
									<span class="ghead-label">{group}</span>
									<span class="ghead-count">{grouped[group].length} typów</span>
								</div>
								{#each grouped[group] as item}
									<div class="item-row">
										<span class="item-name">{item.name}</span>
										<span class="item-qty">{item.total} szt.</span>
									</div>
									{#each data.days as day}
										{@const s = cellState(item, day.iso)}
										<div class={s.cls} class:today={day.isToday}>
											<span>{cellLabel(s)}</span>
										</div>
									{/each}
								{/each}
							{/if}
						{/each}
					</div>
				</div>

				<div class="legend">
					<span class="lg-item"><i class="lg-swatch full"></i>wszystko wolne</span>
					<span class="lg-item"><i class="lg-swatch mid"></i>częściowo zajęte (&gt;50% wolne)</span>
					<span class="lg-item"><i class="lg-swatch low"></i>mało wolnych (&lt;50%)</span>
					<span class="lg-item"><i class="lg-swatch zero"></i>zero dostępnych</span>
					<span class="lg-item"><i class="lg-swatch maint"></i>serwis</span>
					<span class="lg-note">komórka: <b>dostępne</b>/total (dla ≤10 szt.) lub <b>dostępne</b> (dla &gt;10)</span>
				</div>
			</section>

			<!-- Bottom strip -->
			<section class="grid-2">
				<div class="card">
					<div class="card-head">
						<h2>Wymagają akcji</h2>
						<a href="/bookings" class="head-link">Wszystkie →</a>
					</div>
					<ul class="actions">
						{#each data.actions as a}
							<li>
								<span class="a-date">{a.date}</span>
								<span class="a-event">{a.event}</span>
								<span class="a-reason severity-{a.severity}">{a.reason}</span>
								<button class="a-do">Rozwiąż</button>
							</li>
						{/each}
					</ul>
				</div>

				<div class="card">
					<div class="card-head">
						<h2>Magazyn</h2>
						<a href="/tents" class="head-link">Cały →</a>
					</div>
					<ul class="warehouse">
						{#each data.warehouse as w}
							<li>
								<span class="w-emoji">{groupEmoji[w.group]}</span>
								<div class="w-info">
									<span class="w-name">{w.group}</span>
									<span class="w-sub">{w.types} typów · dziś rez. {w.reserved}{w.maintenance > 0 ? ` · serwis ${w.maintenance}` : ''}</span>
								</div>
								<div class="w-bar">
									<div class="w-bar-fill" style="width: {(w.available / w.total) * 100}%"></div>
								</div>
								<span class="w-ratio"><b>{w.available}</b>/{w.total}</span>
							</li>
						{/each}
					</ul>
				</div>
			</section>
			{/if}
		</div>
	</main>
</div>

<style>
	/* ─── LAYOUT ─────────────────────────────────────── */
	.app {
		display: grid;
		grid-template-columns: var(--nav-width) 1fr;
		min-height: 100dvh;
		background: var(--paper);
	}

	/* ─── RAIL (VRS-style) ───────────────────────────── */
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
		letter-spacing: -0.02em;
	}

	.rail-nav {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.65rem 0;
		gap: 2px;
		overflow-y: auto;
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
		transition: all 150ms ease;
	}
	.rail-item svg {
		width: 20px;
		height: 20px;
	}
	.rail-label {
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.01em;
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
		transition: all 150ms ease;
	}
	.theme-btn:hover {
		color: white;
		background: rgba(255, 255, 255, 0.08);
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
		display: grid;
		place-items: center;
	}
	.avatar {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: var(--wn-zielony);
		color: var(--wn-plotno);
		display: grid;
		place-items: center;
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
	.logout-link:hover {
		color: var(--wn-zielony);
	}

	/* ─── MAIN ─────────────────────────────────────────── */
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
		gap: 1.5rem;
		background: var(--paper);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.top-left {
		display: flex;
		align-items: baseline;
		gap: 0.85rem;
		min-width: 0;
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
		white-space: nowrap;
	}
	.top-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.status-inline {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.4rem 0.85rem;
		background: var(--paper-2);
		border: 1px solid var(--line);
		border-radius: 0;
		font-size: 0.82rem;
		color: var(--mute);
	}
	.status-inline b {
		font-weight: 700;
		color: var(--ink);
		margin-right: 0.25rem;
	}
	.status-inline .si.alert b {
		color: var(--wn-pomidor);
	}
	.dot-sep {
		color: var(--line);
	}
	.cmdk {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.7rem;
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 0;
		font-size: 0.8rem;
		color: var(--mute);
		cursor: pointer;
		font-family: inherit;
	}
	.cmdk:hover { color: var(--ink); border-color: var(--wn-zielony); }
	.cmdk kbd {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		padding: 0.06rem 0.3rem;
		background: var(--paper-2);
		border-radius: 3px;
		color: var(--ink-2);
	}

	/* Search overlay */
	.search-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.4);
		z-index: 1000;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 15vh;
	}
	.search-panel {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: min(560px, 90vw);
		padding: 1rem 1.25rem;
		background: var(--paper);
		border: 2px solid var(--ink);
		box-shadow: 4px 4px 0 var(--wn-atrament);
	}
	.search-panel input {
		flex: 1;
		border: none;
		outline: none;
		background: transparent;
		font-family: var(--font-sans);
		font-size: 1rem;
		color: var(--ink);
	}
	.search-panel kbd {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		padding: 0.1rem 0.4rem;
		background: var(--paper-2);
		color: var(--mute);
		border: 1px solid var(--line);
	}

	.content {
		padding: 1.25rem 1.5rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* ─── ALERT BANNER ─────────────────────────────────── */
	.alert-banner {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.85rem 1.25rem;
		border: 2px solid var(--wn-atrament);
		background: var(--paper);
		box-shadow: 3px 3px 0 var(--wn-atrament);
	}
	.alert-banner.alert-below {
		background: color-mix(in srgb, var(--wn-pomidor) 15%, var(--paper));
		border-color: var(--wn-pomidor);
		box-shadow: 3px 3px 0 var(--wn-pomidor);
	}
	.alert-banner.alert-at {
		background: color-mix(in srgb, var(--wn-zarowka) 25%, var(--paper));
		border-color: #8a6d00;
		box-shadow: 3px 3px 0 #8a6d00;
	}
	.alert-icon {
		font-size: 1.3rem;
	}
	.alert-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.alert-body strong {
		font-size: 0.92rem;
		color: var(--ink);
	}
	.alert-items {
		font-size: 0.8rem;
		color: var(--ink-2);
	}
	.alert-cta {
		padding: 0.35rem 0.85rem;
		background: var(--wn-atrament);
		color: var(--wn-plotno);
		border: 2px solid var(--wn-atrament);
		font-size: 0.82rem;
		font-weight: 700;
		text-decoration: none;
	}
	.alert-cta:hover {
		background: var(--wn-plotno);
		color: var(--wn-atrament);
	}

	/* ─── EMPLOYEE PLAN PRACY ─────────────────────────── */
	.empty-work {
		padding: 4rem 2rem;
		text-align: center;
		color: var(--mute);
	}
	.empty-work .empty-emoji {
		font-size: 3rem;
		margin-bottom: 1rem;
	}
	.empty-work h2 {
		margin: 0 0 0.5rem;
		color: var(--ink);
	}
	.work-group {
		margin-bottom: 1.5rem;
	}
	.group-title {
		font-size: 1.05rem;
		font-weight: 700;
		margin: 0 0 0.85rem;
		color: var(--ink);
	}
	.group-count {
		font-weight: 400;
		color: var(--mute);
		font-size: 0.88rem;
	}
	.work-cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 0.85rem;
	}
	.work-card {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 1rem 1.15rem;
		background: var(--paper);
		border: 2px solid var(--wn-atrament);
		box-shadow: 3px 3px 0 var(--wn-atrament);
		text-decoration: none;
		color: var(--ink);
		transition: transform 0.1s, box-shadow 0.1s;
	}
	.work-card:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--wn-atrament);
	}
	.work-card.status-in-progress {
		background: color-mix(in srgb, var(--wn-zarowka) 18%, var(--paper));
	}
	.work-card.status-done {
		opacity: 0.7;
	}
	.wc-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
	}
	.wc-task {
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.wc-status-pill {
		padding: 0.15rem 0.5rem;
		background: var(--wn-atrament);
		color: var(--wn-plotno);
		font-size: 0.7rem;
		font-weight: 600;
	}
	.wc-name {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}
	.wc-meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.85rem;
	}
	.wc-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--ink-2);
	}
	.wc-icon {
		width: 18px;
		text-align: center;
		font-size: 0.9rem;
	}
	.wc-phone {
		font-family: var(--font-mono);
	}
	.wc-note {
		font-style: italic;
		color: var(--mute);
	}
	.wc-cta {
		margin-top: 0.4rem;
		padding-top: 0.55rem;
		border-top: 1px dashed var(--line);
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--wn-zielony-ink);
	}

	/* ─── CARDS ────────────────────────────────────────── */
	.card {
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 0;
		overflow: hidden;
	}
	.card-head {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--line);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	h2 {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--ink);
		margin: 0;
		font-family: var(--font-sans);
	}
	.tabs {
		display: flex;
		gap: 0.2rem;
	}
	.tab {
		padding: 0.4rem 0.85rem;
		background: transparent;
		border: 2px solid transparent;
		border-radius: 0;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--mute);
		cursor: pointer;
		font-family: var(--font-sans);
		transition: all 0.1s;
	}
	.tab:hover {
		border-color: var(--line);
		color: var(--ink);
	}
	.tab.active {
		background: var(--wn-zielony);
		color: var(--wn-atrament);
		border-color: var(--wn-atrament);
		box-shadow: 2px 2px 0 var(--wn-atrament);
	}
	.head-link {
		font-size: 0.75rem;
		color: var(--mute);
		text-decoration: none;
		font-weight: 500;
	}
	.head-link:hover {
		color: var(--wn-granat);
	}

	/* ─── MATRIX ───────────────────────────────────────── */
	.matrix {
		overflow-x: auto;
	}
	.matrix-grid {
		display: grid;
		font-family: var(--font-mono);
		font-size: 0.72rem;
	}
	.corner {
		border-right: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}
	.day-head {
		padding: 0.45rem 0.2rem;
		text-align: center;
		border-right: 1px solid var(--line-2);
		border-bottom: 1px solid var(--line);
		background: var(--paper-2);
	}
	.day-head.weekend {
		background: color-mix(in srgb, var(--wn-pomidor) 4%, var(--paper-2));
	}
	.day-head.today {
		background: color-mix(in srgb, var(--wn-zarowka) 30%, var(--paper-2));
	}
	.d-num {
		font-size: 0.82rem;
		color: var(--ink);
		font-weight: 600;
	}
	.d-wd {
		font-size: 0.58rem;
		color: var(--mute);
		margin-top: 0.08rem;
	}
	.group-head {
		padding: 0.4rem 1.25rem;
		background: var(--paper-2);
		border-bottom: 1px solid var(--line);
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--mute);
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-family: var(--font-sans);
		font-weight: 600;
	}
	.ghead-count {
		color: var(--dim);
		font-weight: 400;
	}
	.item-row {
		padding: 0.55rem 1.25rem;
		border-right: 1px solid var(--line);
		border-bottom: 1px solid var(--line-2);
		font-family: var(--font-sans);
		font-size: 0.8rem;
		color: var(--ink);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--card);
	}
	.item-qty {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--dim);
	}
	.cell {
		border-right: 1px solid var(--line-2);
		border-bottom: 1px solid var(--line-2);
		display: grid;
		place-items: center;
		min-height: 34px;
		cursor: pointer;
		transition: outline 120ms ease;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--ink);
	}
	.cell:hover {
		outline: 2px inset var(--wn-atrament);
		outline-offset: -2px;
	}
	.cell.today {
		background: color-mix(in srgb, var(--wn-zarowka) 8%, transparent);
	}
	.cell.full {
		background: var(--card);
		color: var(--dim);
	}
	.cell.mid {
		background: color-mix(in srgb, var(--wn-zielony) 16%, var(--card));
		color: var(--wn-zielony-ink);
		font-weight: 600;
	}
	.cell.low {
		background: color-mix(in srgb, var(--wn-zarowka) 55%, transparent);
		color: var(--wn-atrament);
		font-weight: 600;
	}
	.cell.zero {
		background: color-mix(in srgb, var(--wn-pomidor) 75%, transparent);
		color: var(--wn-plotno);
		font-weight: 700;
	}
	.cell.maint {
		background: color-mix(in srgb, var(--wn-granat) 20%, var(--card));
		color: var(--wn-granat-ink);
		font-weight: 600;
	}

	.legend {
		padding: 0.6rem 1.25rem;
		display: flex;
		gap: 1.1rem;
		border-top: 1px solid var(--line);
		font-size: 0.74rem;
		color: var(--mute);
		flex-wrap: wrap;
	}
	.lg-item {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}
	.lg-swatch {
		width: 11px;
		height: 11px;
		border-radius: 3px;
		border: 1px solid var(--line);
	}
	.lg-swatch.full {
		background: var(--card);
	}
	.lg-swatch.mid {
		background: color-mix(in srgb, var(--wn-zielony) 16%, var(--card));
	}
	.lg-swatch.low {
		background: color-mix(in srgb, var(--wn-zarowka) 55%, transparent);
	}
	.lg-swatch.zero {
		background: color-mix(in srgb, var(--wn-pomidor) 75%, transparent);
	}
	.lg-swatch.maint {
		background: color-mix(in srgb, var(--wn-granat) 20%, var(--card));
	}
	.lg-note {
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--dim);
	}
	.lg-note b {
		color: var(--ink);
	}

	/* ─── GRID 2 ───────────────────────────────────────── */
	.grid-2 {
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		gap: 1.25rem;
	}

	/* ─── ACTIONS ──────────────────────────────────────── */
	.actions {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.actions li {
		display: grid;
		grid-template-columns: 64px 1fr auto auto;
		gap: 0.7rem;
		align-items: center;
		padding: 0.7rem 1.25rem;
		border-bottom: 1px solid var(--line-2);
		font-size: 0.85rem;
	}
	.actions li:last-child {
		border-bottom: none;
	}
	.a-date {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--mute);
	}
	.a-event {
		color: var(--ink);
		font-weight: 500;
	}
	.a-reason {
		font-size: 0.73rem;
		padding: 0.18rem 0.5rem;
		border-radius: 4px;
		font-family: var(--font-mono);
	}
	.severity-warn {
		background: color-mix(in srgb, var(--wn-pomidor) 12%, transparent);
		color: var(--wn-pomidor);
	}
	.severity-info {
		background: color-mix(in srgb, var(--wn-granat) 10%, transparent);
		color: var(--wn-granat);
	}
	.a-do {
		padding: 0.3rem 0.65rem;
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 5px;
		font-size: 0.75rem;
		color: var(--ink);
		cursor: pointer;
		font-family: var(--font-sans);
		font-weight: 500;
	}
	.a-do:hover {
		background: var(--wn-zielony);
		color: var(--wn-plotno);
		border-color: var(--wn-zielony);
	}

	/* ─── WAREHOUSE ───────────────────────────────────── */
	.warehouse {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.warehouse li {
		display: grid;
		grid-template-columns: 32px 1fr 100px 90px;
		gap: 0.8rem;
		align-items: center;
		padding: 0.7rem 1.25rem;
		border-bottom: 1px solid var(--line-2);
	}
	.warehouse li:last-child {
		border-bottom: none;
	}
	.w-emoji {
		font-size: 1.25rem;
		opacity: 0.75;
	}
	.w-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.w-name {
		font-size: 0.88rem;
		font-weight: 500;
		color: var(--ink);
	}
	.w-sub {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--mute);
	}
	.w-bar {
		height: 4px;
		background: var(--paper-2);
		border-radius: 2px;
		overflow: hidden;
	}
	.w-bar-fill {
		height: 100%;
		background: var(--wn-zielony);
		transition: width 300ms ease;
	}
	.w-ratio {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--mute);
		text-align: right;
	}
	.w-ratio b {
		color: var(--ink);
		font-weight: 600;
	}

	/* ─── RESPONSIVE ──────────────────────────────────── */
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
		.grid-2 {
			grid-template-columns: 1fr;
		}
		.topbar {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>
