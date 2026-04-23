<script lang="ts">
	import SidebarRail from '$lib/components/SidebarRail.svelte';
	let { data } = $props();

	const groupOrder = ['Namioty', 'Stoły', 'Krzesła', 'Ławki', 'Oświetlenie', 'Akcesoria'];
	const groupedItems = $derived(
		data.allItems.reduce<Record<string, typeof data.allItems>>((acc, it) => {
			const g = it.category ?? 'Inne';
			acc[g] = acc[g] ?? [];
			acc[g].push(it);
			return acc;
		}, {})
	);

	function fmtZl(cents: number | null | undefined) {
		if (cents == null) return '—';
		return (
			(cents / 100).toLocaleString('pl-PL', {
				minimumFractionDigits: 0,
				maximumFractionDigits: 0
			}) + ' zł'
		);
	}
</script>

<svelte:head>
	<title>Pakiet: {data.pkg.name} · Wolny Namiot</title>
</svelte:head>

<div class="app">
	<SidebarRail activeId="tents" isAdmin={data.isAdmin} userName={data.user.name} userEmail={data.user.email} />

	<main class="main">
		<header class="topbar">
			<div class="top-left">
				<a href="/magazyn?tab=packages" class="back-link">← Pakiety</a>
				<h1>{data.pkg.name}</h1>
				<span class="slug-tag">{data.pkg.slug}</span>
			</div>
		</header>

		<div class="content">
			<!-- META -->
			<section class="card">
				<h2>Ustawienia pakietu</h2>
				<form method="POST" action="?/updateMeta" class="meta-form">
					<label class="field">
						<span>Nazwa</span>
						<input name="name" type="text" value={data.pkg.name} required />
					</label>
					<label class="field wide">
						<span>Opis</span>
						<textarea name="description" rows="2">{data.pkg.description ?? ''}</textarea>
					</label>
					<label class="field">
						<span>Cena od (zł)</span>
						<input name="priceFromZl" type="number" step="0.01" value={data.pkg.priceFromCents / 100} required />
					</label>
					<label class="field">
						<span>Cena do (zł, opc.)</span>
						<input name="priceToZl" type="number" step="0.01" value={data.pkg.priceToCents ? data.pkg.priceToCents / 100 : ''} />
					</label>
					<label class="field">
						<span>Min gości</span>
						<input name="minGuests" type="number" value={data.pkg.minGuests ?? ''} />
					</label>
					<label class="field">
						<span>Max gości</span>
						<input name="maxGuests" type="number" value={data.pkg.maxGuests ?? ''} />
					</label>
					<label class="field">
						<span>Metraż (m²)</span>
						<input name="areaM2" type="number" value={data.pkg.areaM2 ?? ''} />
					</label>
					<label class="field">
						<span>Montaż (min.)</span>
						<input name="setupMinutes" type="number" value={data.pkg.setupMinutes ?? ''} />
					</label>
					<div class="toggles">
						<label class="inline-check"><input name="includesDelivery" type="checkbox" checked={data.pkg.includesDelivery} /> Dostawa w cenie</label>
						<label class="inline-check"><input name="includesInstall" type="checkbox" checked={data.pkg.includesInstall} /> Montaż w cenie</label>
						<label class="inline-check"><input name="active" type="checkbox" checked={data.pkg.active} /> Aktywny</label>
					</div>
					<div class="form-actions">
						<button type="submit" class="btn-primary">Zapisz zmiany</button>
					</div>
				</form>
			</section>

			<!-- ITEMS -->
			<section class="card">
				<h2>Co wchodzi w pakiet ({data.pkgItems.length})</h2>
				<p class="hint">
					Items z magazynu lub custom wpisy (np. "Dostawa do 30 km"). Przy zastosowaniu pakietu w kalkulatorze oferty
					— zostaną wczytane jako "w zestawie" (bez dodatkowej opłaty).
				</p>

				{#if data.pkgItems.length === 0}
					<p class="empty-msg">Pakiet jeszcze bez pozycji — dodaj namiot, stoły, krzesła, girlandy itd.</p>
				{:else}
					<table class="items-table">
						<thead>
							<tr>
								<th>Nazwa</th>
								<th>Kategoria</th>
								<th class="num">Stan magazynu</th>
								<th class="num">Ilość w pakiecie</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each data.pkgItems as pi}
								<tr>
									<td class="name">
										{#if pi.itemId}
											{pi.itemName ?? '—'}
										{:else}
											<em class="custom">{pi.customLabel}</em>
										{/if}
									</td>
									<td class="mute">{pi.itemCategory ?? '—'}</td>
									<td class="num mute">{pi.itemTotalQty ?? '—'}</td>
									<td class="num">
										<form method="POST" action="?/updateItem" class="qty-form">
											<input type="hidden" name="id" value={pi.id} />
											<input name="quantity" type="number" min="1" value={pi.quantity} class="qty-input" />
											<button type="submit" class="btn-inline">Zapisz</button>
										</form>
									</td>
									<td>
										<form method="POST" action="?/removeItem" class="remove-form">
											<input type="hidden" name="id" value={pi.id} />
											<button type="submit" class="btn-danger" onclick={(e) => { if (!confirm('Usunąć tę pozycję z pakietu?')) e.preventDefault(); }}>Usuń</button>
										</form>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}

				<!-- ADD ITEM -->
				<form method="POST" action="?/addItem" class="add-form">
					<h3>+ Dodaj pozycję</h3>
					<div class="add-row">
						<label class="field grow">
							<span>Wybierz z magazynu</span>
							<select name="itemId">
								<option value="">— pozycja custom —</option>
								{#each groupOrder as g}
									{#if groupedItems[g]}
										<optgroup label={g}>
											{#each groupedItems[g] as it}
												<option value={it.id}>{it.name} (stan: {it.totalQty})</option>
											{/each}
										</optgroup>
									{/if}
								{/each}
							</select>
						</label>
						<label class="field grow">
							<span>…lub custom label</span>
							<input name="customLabel" type="text" placeholder='np. "Dostawa do 30 km"' />
						</label>
						<label class="field">
							<span>Ilość</span>
							<input name="quantity" type="number" min="1" value="1" required />
						</label>
						<button type="submit" class="btn-primary">Dodaj</button>
					</div>
				</form>
			</section>
		</div>
	</main>
</div>

<style>
	.app {
		display: grid;
		grid-template-columns: 72px 1fr;
		min-height: 100dvh;
		font-family: var(--font-sans);
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
		justify-content: center;
		padding: 0.65rem 0;
		gap: 2px;
		width: 100%;
	}
	.rail-item {
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
	.rail-item svg { width: 20px; height: 20px; }
	.rail-label { font-size: 0.62rem; font-weight: 600; }
	.rail-item.active { background: rgba(255, 255, 255, 0.08); color: var(--wn-plotno); }
	.rail-item:hover { color: var(--wn-plotno); }

	.main { display: flex; flex-direction: column; min-width: 0; }
	.topbar {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem max(1.5rem, calc((100% - 1200px) / 2));
		border-bottom: 1px solid var(--line);
		background: var(--paper);
	}
	.top-left { display: flex; align-items: center; gap: 1rem; }
	.back-link {
		color: var(--mute);
		text-decoration: none;
		font-size: 0.85rem;
	}
	.back-link:hover { color: var(--wn-zielony); }
	h1 { margin: 0; font-family: var(--font-display, var(--font-sans)); font-size: 1.5rem; }
	.slug-tag {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		padding: 0.2rem 0.5rem;
		background: var(--paper-2);
		border: 1px solid var(--line);
	}

	.content {
		padding: 1.25rem max(1.5rem, calc((100% - 1200px) / 2)) 3rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.card {
		background: var(--paper);
		border: 1px solid var(--line);
		padding: 1.25rem 1.5rem;
	}
	.card h2 { margin: 0 0 0.35rem; font-size: 1.1rem; }
	.card h3 { margin: 0 0 0.4rem; font-size: 0.95rem; }
	.hint { color: var(--mute); font-size: 0.82rem; margin: 0 0 1rem; }
	.empty-msg { color: var(--mute); font-style: italic; padding: 1rem; text-align: center; }

	.meta-form {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.75rem 1rem;
		margin-top: 1rem;
	}
	.field { display: flex; flex-direction: column; gap: 0.25rem; }
	.field > span { font-size: 0.75rem; color: var(--mute); }
	.field.wide { grid-column: span 2; }
	.field.grow { flex: 1; }
	.field input, .field textarea, .field select {
		border: 1px solid var(--line);
		padding: 0.45rem 0.6rem;
		background: var(--paper);
		font-family: inherit;
		font-size: 0.88rem;
		border-radius: 0;
	}
	.field input:focus, .field textarea:focus, .field select:focus {
		outline: none;
		border-color: var(--wn-zielony);
	}
	.toggles {
		grid-column: 1 / -1;
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
	}
	.inline-check {
		display: inline-flex;
		gap: 0.4rem;
		align-items: center;
		font-size: 0.85rem;
	}
	.form-actions {
		grid-column: 1 / -1;
		display: flex;
		justify-content: flex-end;
	}
	.btn-primary {
		padding: 0.5rem 1.1rem;
		background: var(--wn-zielony);
		color: var(--wn-atrament);
		border: 2px solid var(--wn-atrament);
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		box-shadow: 3px 3px 0 var(--wn-atrament);
	}
	.btn-primary:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--wn-atrament); }

	.items-table { width: 100%; border-collapse: collapse; margin: 0.75rem 0 1.5rem; font-size: 0.88rem; }
	.items-table th, .items-table td {
		text-align: left;
		padding: 0.5rem 0.6rem;
		border-bottom: 1px solid var(--line);
	}
	.items-table th { font-weight: 600; color: var(--mute); font-size: 0.75rem; text-transform: uppercase; }
	.items-table td.name { font-weight: 500; }
	.items-table .mute { color: var(--mute); }
	.items-table .num { text-align: right; }
	.custom { color: var(--wn-pomidor); }

	.qty-form, .remove-form {
		display: inline-flex;
		gap: 0.35rem;
		align-items: center;
	}
	.qty-input {
		width: 70px;
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--line);
		text-align: right;
	}
	.btn-inline {
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--line);
		background: var(--paper);
		font-size: 0.78rem;
		cursor: pointer;
	}
	.btn-inline:hover { border-color: var(--wn-zielony); color: var(--wn-zielony); }
	.btn-danger {
		padding: 0.3rem 0.6rem;
		border: 1px solid transparent;
		background: transparent;
		color: var(--wn-pomidor);
		cursor: pointer;
		font-size: 0.78rem;
	}
	.btn-danger:hover { border-color: var(--wn-pomidor); }

	.add-form {
		border-top: 2px solid var(--line);
		padding-top: 1rem;
		margin-top: 1rem;
	}
	.add-row {
		display: flex;
		gap: 0.75rem;
		align-items: flex-end;
		flex-wrap: wrap;
	}

	@media (max-width: 720px) {
		.meta-form { grid-template-columns: 1fr; }
		.field.wide { grid-column: span 1; }
	}
</style>
