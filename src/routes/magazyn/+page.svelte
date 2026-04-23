<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let activeTab = $state<'items' | 'packages' | 'movements'>('items');
	let editingItemId = $state<string | null>(null);
	let addingItem = $state(false);
	let addingMovement = $state(false);

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
		settings: 'M20 7h-9 M14 17H5 M17 14a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z M7 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z'
	};
	const MAIN = [
		{ id: 'dashboard', label: 'Home', href: '/dashboard' },
		{ id: 'zlecenia', label: 'Zlecenia', href: '/zlecenia' },
		{ id: 'tents', label: 'Magazyn', href: '/magazyn', active: true }
	];
	const ADMIN = [{ id: 'settings', label: 'Ustaw.', href: '/settings' }];

	function fmtZl(cents: number | null | undefined) {
		if (cents == null) return '—';
		return (cents / 100).toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' zł';
	}
	function priceRange(from: number, to: number | null | undefined) {
		if (!to || to === from) return fmtZl(from);
		return `${fmtZl(from)}–${fmtZl(to)}`;
	}
	function fmtSetup(minutes: number | null | undefined) {
		if (!minutes) return '—';
		if (minutes < 60) return `${minutes} min`;
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m > 0 ? `${h}h ${m}min` : `${h}h`;
	}
	function fmtDateTime(d: Date | string | null | undefined) {
		if (!d) return '—';
		const date = new Date(d);
		return date.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
	}

	function stockStatus(totalQty: number, minQty: number) {
		if (totalQty < minQty) return { cls: 'alert', label: 'niski' };
		if (minQty > 0 && totalQty === minQty) return { cls: 'warn', label: 'min' };
		return { cls: 'ok', label: 'ok' };
	}

	const tierLabel: Record<string, string> = {
		ekspres: 'Ekspres',
		'ekspres-stoly': 'Ekspres+stoły',
		'duze-montaz': 'Duży z montażem',
		'duze-pelny': 'Pełny pakiet'
	};

	const categoryEmoji: Record<string, string> = {
		Namioty: '⛺',
		Stoły: '🟫',
		Krzesła: '🪑',
		Ławki: '🪵',
		Oświetlenie: '💡',
		Akcesoria: '🔧'
	};

	const kindLabel: Record<string, string> = {
		zakup: 'Zakup',
		zwrot_po_evencie: 'Zwrot po evencie',
		korekta_plus: 'Korekta +',
		serwis_powrot: 'Powrót z serwisu',
		wydanie_na_event: 'Wydanie na event',
		wydanie_serwis: 'Do serwisu',
		strata: 'Strata',
		korekta_minus: 'Korekta −'
	};
	const kindEmoji: Record<string, string> = {
		zakup: '🛒',
		zwrot_po_evencie: '↩️',
		korekta_plus: '➕',
		serwis_powrot: '🔧',
		wydanie_na_event: '📤',
		wydanie_serwis: '🔨',
		strata: '💢',
		korekta_minus: '➖'
	};

	const grouped = $derived.by(() => {
		const out: Record<string, typeof data.items> = {};
		for (const it of data.items) {
			const cat = it.category ?? 'Inne';
			out[cat] ??= [];
			out[cat].push(it);
		}
		return out;
	});
	const categoryOrder = ['Namioty', 'Stoły', 'Krzesła', 'Ławki', 'Oświetlenie', 'Akcesoria'];
</script>

<svelte:head>
	<title>Magazyn · Wolny Namiot panel</title>
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
			<button class="theme-btn" type="button" aria-label="Motyw" onclick={() => (window as typeof window & { toggleTheme?: () => void }).toggleTheme?.()}>
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
				<h1>Magazyn</h1>
				<span class="top-date">
					{data.packages.length} pakietów · {data.items.length} itemów
					{#if data.stats.belowMin > 0}
						· <span class="stat-alert">⚠️ {data.stats.belowMin} poniżej min.</span>
					{/if}
					{#if data.stats.atMin > 0}
						· <span class="stat-warn">{data.stats.atMin} na minimum</span>
					{/if}
				</span>
			</div>
		</header>

		<div class="tabs-wrap">
			<div class="tabs">
				<button class="tab" class:active={activeTab === 'items'} onclick={() => (activeTab = 'items')}>
					<span>Przedmioty</span>
					<span class="tab-count">{data.items.length}</span>
				</button>
				<button class="tab" class:active={activeTab === 'packages'} onclick={() => (activeTab = 'packages')}>
					<span>Pakiety</span>
					<span class="tab-count">{data.packages.length}</span>
				</button>
				<button class="tab" class:active={activeTab === 'movements'} onclick={() => (activeTab = 'movements')}>
					<span>Ruchy magazynowe</span>
					<span class="tab-count">{data.movements.length}</span>
				</button>
			</div>
		</div>

		<div class="content">
			<!-- ─── TAB: ITEMY ──────────────────────────────── -->
			{#if activeTab === 'items'}
				<div class="table-card">
					<table class="data-table">
						<thead>
							<tr>
								<th>SKU</th>
								<th>Nazwa</th>
								<th>Kategoria</th>
								<th>Rozmiar</th>
								<th>Kolor</th>
								<th class="num">Stan</th>
								<th class="num">Min</th>
								<th class="num">Cena/dzień</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each categoryOrder as cat}
								{#if grouped[cat]}
									<tr class="group-divider">
										<td colspan="9">
											<span class="g-emoji">{categoryEmoji[cat]}</span>
											<span class="g-name">{cat}</span>
											<span class="g-count">{grouped[cat].length} typów</span>
										</td>
									</tr>
									{#each grouped[cat] as it}
										{@const stock = stockStatus(it.totalQty, it.minQty)}
										{#if editingItemId === it.id}
											<!-- INLINE EDIT ROW -->
											<tr class="edit-row">
												<td colspan="9">
													<form
														method="POST"
														action="?/updateItem"
														use:enhance={() => async ({ update }) => {
															await update();
															editingItemId = null;
															await invalidateAll();
														}}
														class="inline-form"
													>
														<input type="hidden" name="id" value={it.id} />
														<input name="sku" type="text" value={it.sku ?? ''} placeholder="SKU" class="f-sku" />
														<input name="name" type="text" value={it.name} placeholder="Nazwa" class="f-name" required />
														<input name="sizeLabel" type="text" value={it.sizeLabel ?? ''} placeholder="Rozmiar" class="f-size" />
														<input name="color" type="text" value={it.color ?? ''} placeholder="Kolor" class="f-color" />
														<input name="minQty" type="number" value={it.minQty} placeholder="Min" class="f-num" />
														<input name="priceZl" type="number" step="0.01" value={it.pricePerDayCents ? it.pricePerDayCents / 100 : ''} placeholder="zł/dzień" class="f-num" />
														<button type="submit" class="btn-save">Zapisz</button>
														<button type="button" class="btn-cancel" onclick={() => (editingItemId = null)}>Anuluj</button>
													</form>
												</td>
											</tr>
										{:else}
											<tr class="row">
												<td class="sku">{it.sku ?? '—'}</td>
												<td class="name">{it.name}</td>
												<td class="cat-cell">{it.category ?? '—'}</td>
												<td class="size">{it.sizeLabel ?? '—'}</td>
												<td class="color">{it.color ?? '—'}</td>
												<td class="num stan stan-{stock.cls}">
													<strong>{it.totalQty}</strong>
													{#if stock.cls !== 'ok'}<span class="stan-badge">{stock.label}</span>{/if}
												</td>
												<td class="num">{it.minQty}</td>
												<td class="num price">{fmtZl(it.pricePerDayCents)}</td>
												<td class="actions">
													<button class="row-edit" onclick={() => (editingItemId = it.id)}>Edytuj</button>
													<form method="POST" action="?/archiveItem" style="display:inline;">
														<input type="hidden" name="id" value={it.id} />
														<button
															type="submit"
															class="row-del"
															title="Usuń pozycję (zachowa historię ruchów)"
															onclick={(e) => { if (!confirm(`Usunąć \"${it.name}\"? Historia ruchów zostanie zachowana.`)) e.preventDefault(); }}
														>Usuń</button>
													</form>
												</td>
											</tr>
										{/if}
									{/each}
								{/if}
							{/each}

							<!-- ADD ROW -->
							{#if addingItem}
								<tr class="edit-row">
									<td colspan="9">
										<form
											method="POST"
											action="?/addItem"
											use:enhance={() => async ({ update }) => {
												await update();
												addingItem = false;
												await invalidateAll();
											}}
											class="inline-form"
										>
											<input name="sku" type="text" placeholder="SKU" class="f-sku" />
											<input name="name" type="text" placeholder="Nazwa (wymagane)" class="f-name" required />
											<select name="category" class="f-cat">
												{#each categoryOrder as c}
													<option value={c}>{c}</option>
												{/each}
											</select>
											<input name="sizeLabel" type="text" placeholder="Rozmiar" class="f-size" />
											<input name="color" type="text" placeholder="Kolor" class="f-color" />
											<input name="qty" type="number" placeholder="Stan" class="f-num" min="0" />
											<input name="minQty" type="number" placeholder="Min" class="f-num" min="0" />
											<input name="priceZl" type="number" step="0.01" placeholder="zł/dzień" class="f-num" />
											<button type="submit" class="btn-save">Dodaj</button>
											<button type="button" class="btn-cancel" onclick={() => (addingItem = false)}>Anuluj</button>
										</form>
									</td>
								</tr>
							{:else}
								<tr class="add-row-btn">
									<td colspan="9">
										<button class="btn-add" onclick={() => (addingItem = true)}>+ Dodaj pozycję</button>
									</td>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- ─── TAB: PAKIETY ───────────────────────────── -->
			{#if activeTab === 'packages'}
				<div class="table-card">
					<table class="data-table">
						<thead>
							<tr>
								<th>Slug</th>
								<th>Nazwa</th>
								<th>Tier</th>
								<th class="num">Cena</th>
								<th class="num">Goście</th>
								<th class="num">m²</th>
								<th class="num">Montaż</th>
								<th>Dostawa/montaż</th>
								<th>Active</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each data.packages as p}
								<tr class="row" class:inactive={!p.active}>
									<td class="sku">{p.slug}</td>
									<td class="name">{p.name}</td>
									<td><span class="tier-tag">{tierLabel[p.tier]}</span></td>
									<td class="num price">{priceRange(p.priceFromCents, p.priceToCents)}</td>
									<td class="num">{p.minGuests && p.maxGuests ? `${p.minGuests}–${p.maxGuests}` : '—'}</td>
									<td class="num">{p.areaM2 ?? '—'}</td>
									<td class="num">{fmtSetup(p.setupMinutes)}</td>
									<td>
										{#if p.includesDelivery && p.includesInstall}
											<span class="chip-yes">🚚 + 🔨</span>
										{:else if p.includesInstall}
											<span class="chip-yes">🔨</span>
										{:else}
											<span class="chip-no">odbiór własny</span>
										{/if}
									</td>
									<td>{p.active ? '✓' : '✕'}</td>
									<td class="actions">
										<a class="row-edit" href={`/magazyn/packages/${p.id}`} title="Edytuj pakiet, cenę, items">Edytuj →</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- ─── TAB: RUCHY MAGAZYNOWE ──────────────────── -->
			{#if activeTab === 'movements'}
				<div class="table-card">
					<table class="data-table">
						<thead>
							<tr>
								<th>Data</th>
								<th>Typ</th>
								<th>Item</th>
								<th class="num">Ilość</th>
								<th>Event / powód</th>
								<th>Notatki</th>
							</tr>
						</thead>
						<tbody>
							{#if addingMovement}
								<tr class="edit-row">
									<td colspan="6">
										<form
											method="POST"
											action="?/addMovement"
											use:enhance={() => async ({ update }) => {
												await update();
												addingMovement = false;
												await invalidateAll();
											}}
											class="inline-form"
										>
											<select name="direction" class="f-dir">
												<option value="IN">IN ↑</option>
												<option value="OUT">OUT ↓</option>
											</select>
											<select name="kind" class="f-kind">
												<option value="zakup">Zakup</option>
												<option value="zwrot_po_evencie">Zwrot po evencie</option>
												<option value="korekta_plus">Korekta +</option>
												<option value="serwis_powrot">Powrót z serwisu</option>
												<option value="wydanie_na_event">Wydanie na event</option>
												<option value="wydanie_serwis">Do serwisu</option>
												<option value="strata">Strata</option>
												<option value="korekta_minus">Korekta −</option>
											</select>
											<select name="itemId" class="f-item" required>
												{#each data.items as it}
													<option value={it.id}>{it.name} ({it.totalQty})</option>
												{/each}
											</select>
											<input name="qty" type="number" min="1" placeholder="Ilość" class="f-num" required />
											<input name="reason" type="text" placeholder="Powód / notatki" class="f-reason" />
											<button type="submit" class="btn-save">Dodaj ruch</button>
											<button type="button" class="btn-cancel" onclick={() => (addingMovement = false)}>Anuluj</button>
										</form>
									</td>
								</tr>
							{:else}
								<tr class="add-row-btn">
									<td colspan="6">
										<button class="btn-add" onclick={() => (addingMovement = true)}>+ Nowy ruch magazynowy</button>
									</td>
								</tr>
							{/if}
							{#each data.movements as m}
								<tr class="row mv-{m.direction.toLowerCase()}">
									<td class="mono">{fmtDateTime(m.createdAt)}</td>
									<td>
										<span class="mv-kind">
											<span>{kindEmoji[m.kind]}</span>
											{kindLabel[m.kind] ?? m.kind}
										</span>
									</td>
									<td class="name">
										<span class="mv-item">{m.itemName}</span>
										{#if m.itemSku}<span class="mv-sku">{m.itemSku}</span>{/if}
									</td>
									<td class="num qty-{m.direction.toLowerCase()}">
										<strong>{m.direction === 'IN' ? '+' : '−'}{m.qty}</strong>
									</td>
									<td>
										{#if m.bookingEvent && m.bookingId}
											<a href="/zlecenia/booking-{m.bookingId}" class="mv-booking" title="Otwórz booking">📅 {m.bookingEvent} →</a>
										{:else if m.bookingEvent}
											<span class="mv-booking">📅 {m.bookingEvent}</span>
										{:else if m.reason}
											<span class="mv-reason">{m.reason}</span>
										{:else}
											—
										{/if}
									</td>
									<td class="mv-notes">{m.notes ?? '—'}</td>
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
		font-size: 0.75rem;
		color: var(--mute);
	}
	.stat-alert {
		color: var(--wn-pomidor);
		font-weight: 500;
	}
	.stat-warn {
		color: #a07c00;
	}

	.tabs-wrap {
		padding: 0.75rem 1.5rem 0;
		border-bottom: 1px solid var(--line);
		background: var(--paper);
	}
	.tabs {
		display: flex;
		gap: 0.2rem;
	}
	.tab {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 1rem;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		font-size: 0.88rem;
		color: var(--mute);
		cursor: pointer;
		font-family: var(--font-sans);
		font-weight: 500;
		margin-bottom: -1px;
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
		font-size: 0.7rem;
		background: var(--paper-2);
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		color: var(--mute);
	}
	.tab.active .tab-count {
		background: color-mix(in srgb, var(--wn-zielony) 15%, transparent);
		color: var(--wn-zielony-ink);
	}

	.content {
		padding: 1.25rem 1.5rem;
		max-width: 1600px;
		margin: 0 auto;
		width: 100%;
	}
	.topbar,
	.tabs-wrap {
		padding-left: max(1.5rem, calc((100% - 1600px) / 2));
		padding-right: max(1.5rem, calc((100% - 1600px) / 2));
	}

	/* TABLES */
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
	}
	.data-table tr.row:hover td {
		background: var(--paper-2);
	}
	.data-table td.num {
		text-align: right;
		font-family: var(--font-mono);
	}
	.data-table td.sku {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--mute);
	}
	.data-table td.name {
		font-weight: 500;
		color: var(--ink);
	}
	.data-table td.price {
		font-weight: 600;
		color: var(--wn-granat);
	}
	.data-table td.mono {
		font-family: var(--font-mono);
		font-size: 0.74rem;
		color: var(--mute);
	}

	/* GROUP DIVIDER */
	.group-divider td {
		background: var(--paper-2);
		padding: 0.45rem 1rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.g-emoji {
		margin-right: 0.4rem;
	}
	.g-name {
		font-weight: 600;
		color: var(--ink-2);
	}
	.g-count {
		margin-left: 0.5rem;
		color: var(--mute);
	}

	/* STAN badge */
	.stan-ok strong {
		color: var(--wn-zielony-ink);
	}
	.stan-warn strong {
		color: #a07c00;
	}
	.stan-alert strong {
		color: var(--wn-pomidor);
	}
	.stan-badge {
		display: inline-block;
		margin-left: 0.35rem;
		padding: 0.08rem 0.35rem;
		font-size: 0.62rem;
		font-weight: 600;
		border-radius: 3px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-family: var(--font-mono);
	}
	.stan-warn .stan-badge {
		background: color-mix(in srgb, var(--wn-zarowka) 35%, transparent);
		color: #8a6d00;
	}
	.stan-alert .stan-badge {
		background: color-mix(in srgb, var(--wn-pomidor) 20%, transparent);
		color: var(--wn-pomidor);
	}

	.tier-tag {
		display: inline-block;
		padding: 0.1rem 0.45rem;
		border-radius: 3px;
		background: var(--paper-2);
		color: var(--ink-2);
		font-size: 0.72rem;
		font-weight: 500;
	}

	.chip-yes {
		display: inline-block;
		padding: 0.1rem 0.5rem;
		background: color-mix(in srgb, var(--wn-zielony) 15%, transparent);
		color: var(--wn-zielony-ink);
		border-radius: 3px;
		font-size: 0.75rem;
	}
	.chip-no {
		color: var(--mute);
		font-size: 0.75rem;
	}

	/* ACTIONS */
	.data-table td.actions {
		text-align: right;
	}
	.row-del {
		padding: 0.25rem 0.55rem;
		border: 1px solid transparent;
		background: transparent;
		color: var(--wn-pomidor);
		cursor: pointer;
		font-size: 0.75rem;
		margin-left: 0.25rem;
		font-family: inherit;
	}
	.row-del:hover { border-color: var(--wn-pomidor); }
	.row-edit {
		padding: 0.22rem 0.55rem;
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 4px;
		font-size: 0.72rem;
		color: var(--mute);
		cursor: pointer;
	}
	.row-edit:hover {
		border-color: var(--wn-zielony);
		color: var(--wn-zielony-ink);
	}

	/* ─── INLINE EDIT ROW ───────────────────────────── */
	.edit-row td {
		background: color-mix(in srgb, var(--wn-zielony) 4%, transparent);
		padding: 0.55rem 1rem;
	}
	.inline-form {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		align-items: center;
	}
	.inline-form input[type='text'],
	.inline-form input[type='number'],
	.inline-form select {
		padding: 0.35rem 0.55rem;
		border: 1px solid var(--line);
		border-radius: 5px;
		font-size: 0.8rem;
		font-family: var(--font-sans);
		background: var(--card);
	}
	.inline-form input:focus,
	.inline-form select:focus {
		border-color: var(--wn-zielony);
		outline: none;
	}
	.f-sku {
		width: 110px;
	}
	.f-name {
		flex: 1;
		min-width: 180px;
	}
	.f-size {
		width: 90px;
	}
	.f-color {
		width: 90px;
	}
	.f-cat {
		width: 130px;
	}
	.f-num {
		width: 80px;
	}
	.f-dir {
		width: 75px;
	}
	.f-kind {
		width: 160px;
	}
	.f-item {
		flex: 1;
		min-width: 200px;
	}
	.f-reason {
		flex: 1;
		min-width: 160px;
	}
	.inline-check {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.78rem;
		color: var(--ink-2);
	}
	.pkg-inline {
		flex-wrap: wrap;
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

	/* ADD ROW BTN */
	.add-row-btn td {
		padding: 0;
	}
	.btn-add {
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
	.btn-add:hover {
		background: color-mix(in srgb, var(--wn-zielony) 5%, transparent);
	}

	/* MOVEMENTS specific */
	.mv-kind {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.82rem;
	}
	.mv-item {
		font-weight: 500;
		color: var(--ink);
	}
	.mv-sku {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--mute);
		margin-left: 0.4rem;
	}
	.qty-in strong {
		color: var(--wn-zielony-ink);
	}
	.qty-out strong {
		color: var(--wn-pomidor);
	}
	.mv-booking {
		display: inline-block;
		padding: 0.1rem 0.45rem;
		background: color-mix(in srgb, var(--wn-granat) 10%, transparent);
		color: var(--wn-granat);
		border: 1px solid color-mix(in srgb, var(--wn-granat) 30%, transparent);
		border-radius: 0;
		font-size: 0.78rem;
		text-decoration: none;
	}
	a.mv-booking:hover {
		background: var(--wn-granat);
		color: var(--wn-plotno);
		border-color: var(--wn-granat);
	}
	.mv-reason {
		color: var(--ink-2);
		font-size: 0.8rem;
	}
	.mv-notes {
		color: var(--mute);
		font-size: 0.78rem;
	}
	tr.inactive {
		opacity: 0.5;
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
		.topbar {
			flex-direction: column;
			align-items: flex-start;
		}
		.data-table {
			font-size: 0.78rem;
		}
	}
</style>
