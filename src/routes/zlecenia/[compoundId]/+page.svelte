<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import SidebarRail from '$lib/components/SidebarRail.svelte';
	import TimelineSection from '$lib/components/zlecenia/TimelineSection.svelte';
	import ClientCard from '$lib/components/zlecenia/ClientCard.svelte';
	import EventCard from '$lib/components/zlecenia/EventCard.svelte';
	import StatusChips from '$lib/components/zlecenia/StatusChips.svelte';
	import NotesSection from '$lib/components/zlecenia/NotesSection.svelte';
	import TeamBlock from '$lib/components/zlecenia/TeamBlock.svelte';
	import PaymentBlock from '$lib/components/zlecenia/PaymentBlock.svelte';
	import {
		dbStatusToUnified,
		allowedStatusesForType,
		type ZlecenieType
	} from '$lib/booking-stages';
	import { fmtZl, fmtDate, fmtDateTime, eventRange, daysCount } from '$lib/formatters';

	let { data } = $props();
	const z = $derived(data.zlecenie);

	// State dla notes form → w NotesSection component (lokalny state)

	// Status mapping + filter wyniesione do $lib/booking-stages (24 testów unit)
	const currentUnified = $derived(dbStatusToUnified(z.type as ZlecenieType, z.status));
	const statusList = $derived(allowedStatusesForType(z.type as ZlecenieType));

	// ICONS + NAV usunięte — SidebarRail używa NAV_ITEMS z $lib/constants/icons
	// Formatters wyniesione do $lib/formatters (23 testów)

	// Timeline events — booking ma multi-source z server (z.timeline),
	// lead/offer dostają stage-aware fallback
	const timeline = $derived.by(() => {
		if (z.type === 'booking' && z.timeline?.length > 0) {
			return z.timeline.map((t: { label: string; date: Date | string | null; emoji: string; kind: string; note: string | null }) => ({
				label: t.label,
				date: t.date ? (t.date instanceof Date ? t.date : new Date(t.date)) : null,
				emoji: t.emoji,
				kind: t.kind,
				note: t.note,
				done: true
			}));
		}
		const events: Array<{ label: string; date: Date | null; emoji: string; kind: string; note: string | null; done: boolean }> = [];
		events.push({ label: 'Utworzono', date: z.createdAt, emoji: '➕', kind: 'created', note: null, done: true });
		if (z.type === 'offer' || (z.type === 'lead' && z.status === 'quoted')) {
			events.push({ label: 'Wysłano ofertę', date: z.sentAt, emoji: '📤', kind: 'sent', note: null, done: !!z.sentAt });
			events.push({ label: 'Klient otworzył', date: z.viewedAt, emoji: '👁️', kind: 'viewed', note: null, done: !!z.viewedAt });
			events.push({ label: 'Zaakceptowana', date: z.acceptedAt, emoji: '✓', kind: 'accepted', note: null, done: !!z.acceptedAt });
		}
		return events;
	});
</script>

<svelte:head>
	<title>{z.event.name} · Zlecenie · Wolny Namiot</title>
</svelte:head>

<div class="app">
	<SidebarRail activeId="zlecenia" isAdmin={data.isAdmin} userName={data.user.name} userEmail={data.user.email} />

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
					<a href={`/offers/${z.id}`} class="btn-ghost">🖨️ PDF oferty</a>
					{#if z.client?.email && data.isAdmin}
						<form method="POST" action="?/sendOfferEmail" style="display:inline;">
							<button
								type="submit"
								class="btn-primary"
								onclick={(e) => { if (!confirm(`Wysłać ofertę do ${z.client?.email}?`)) e.preventDefault(); }}
							>
								📤 Wyślij ofertę
							</button>
						</form>
					{/if}
				{/if}
				{#if z.type === 'lead'}
					<a href={`/offers/new?leadId=${z.id}`} class="btn-primary">+ Oferta z leada</a>
				{/if}
			</div>
		</header>

		<div class="content">
			<!-- 1. KLIENT + WARTOŚĆ -->
			<ClientCard client={z.client} totalCents={z.totalCents} source={z.source} />

			<!-- 2. EVENT -->
			<EventCard event={z.event} />

			<!-- 3. POZYCJE (admin only — pracownik ma to w return form) -->
			{#if z.items.length > 0 && data.isAdmin}
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
			{/if}

			<!-- 4. WIADOMOŚĆ OD KLIENTA (dla leadów) -->
			{#if z.message}
				<section class="card">
					<h2>Wiadomość od klienta</h2>
					<p class="msg-text">💬 {z.message}</p>
				</section>
			{/if}

			<!-- 5. NOTATKI + ADD FORM -->
			<NotesSection notes={z.notes} />

			<!-- 6. ZMIANA STATUSU (admin only) -->
			{#if data.isAdmin}
				<StatusChips zType={z.type} {currentUnified} {statusList} />
			{/if}

			{#if z.type === 'booking'}
				{@const totalZl = (z.totalCents ?? 0) / 100}
				{@const paidZl = z.paidCents / 100}
				{@const leftZl = Math.max(0, totalZl - paidZl)}
				<!-- paidPct + payStatus → zamknięte w PaymentBlock -->
				<!-- totalZl/paidZl/leftZl używane przez cash-reminder w BookingOps (c4 extract) -->


				<!-- 7. ZESPÓŁ REALIZUJĄCY -->
				<TeamBlock assignments={z.assignments} availableUsers={data.availableUsers} />

				<!-- 8. OPERACJE: Wydaj / Zakończ (dispatch/return) -->
				{#if z.status === 'confirmed' || z.status === 'in-progress'}
					<section class="card">
						<h2>
							{#if z.status === 'confirmed'}🚚 Realizacja{:else}📦 Zamknij event{/if}
						</h2>
						<div class="booking-ops no-border">
						{#if z.status === 'confirmed'}
							<form method="POST" action="?/dispatchBooking" class="op-form">
								<p class="op-hint">
									Rezerwacja potwierdzona. <strong>Wydaj na event</strong> — items znikną z magazynu do momentu zwrotu.
								</p>
								{#if leftZl > 0}
									<div class="cash-reminder">
										💰 <strong>Do pobrania od klienta: {fmtZl(leftZl * 100)}</strong>
										{#if paidZl === 0}
											— najczęściej klient płaci przy dostawie.
										{:else}
											— wpłacone już {fmtZl(paidZl * 100)}.
										{/if}
										Dodaj w sekcji "💰 Płatność" poniżej <em>przed</em> albo <em>po</em> wydaniu — kolejność bez znaczenia.
									</div>
								{:else if totalZl > 0}
									<div class="cash-reminder ok">✓ Wszystko opłacone — lec spokojnie na event.</div>
								{/if}
								<label class="op-note-field">
									<span>Notatka z wydania (opcjonalnie)</span>
									<textarea
										name="dispatchNote"
										rows="2"
										placeholder="np. Pepe + Mateusz, auto z przyczepą, wszystko sprawdzone, brak uszkodzeń"
									></textarea>
								</label>
								<button type="submit" class="btn-op dispatch">🚚 Wydaj na event</button>
							</form>
						{:else if z.status === 'in-progress'}
							<form
								method="POST"
								action="?/returnBooking"
								class="op-form"
								onsubmit={(e) => {
									const fd = new FormData(e.currentTarget as HTMLFormElement);
									const losses: string[] = [];
									for (const bt of z.bookingTents) {
										const r = Number(fd.get(`return_${bt.tentId}`) ?? bt.quantity);
										const lost = bt.quantity - r;
										if (lost > 0) losses.push(`${lost}× ${bt.itemName} (wydane ${bt.quantity}, wróciło ${r})`);
									}
									if (losses.length > 0) {
										const msg = '⚠️ WYKRYTE STRATY:\n\n' + losses.join('\n') + '\n\nNa pewno zapisujesz? Ta strata zostanie zapisana i możesz ją wykorzystać do obciążenia klienta.';
										if (!confirm(msg)) e.preventDefault();
									}
								}}
							>
								<p class="op-hint">
									Event w trakcie. <strong>Zakończ + zwróć na magazyn</strong> — wpisz ile sztuk faktycznie wróciło (default = ile wydane). Różnica = strata.
								</p>
								{#if leftZl > 0}
									<div class="cash-reminder urgent">
										⚠️ <strong>Nieopłacone: {fmtZl(leftZl * 100)}</strong> — pobierz kasę przy odbiorze sprzętu albo dodaj płatność poniżej.
									</div>
								{:else if totalZl > 0}
									<div class="cash-reminder ok">✓ Opłacone w całości — można zamykać event.</div>
								{/if}
								{#if z.bookingTents.length > 0}
									<table class="return-table">
										<thead>
											<tr>
												<th>Pozycja</th>
												<th class="num">Wydane</th>
												<th class="num">Wróciło</th>
												<th>Uwagi (np. brudne, uszkodzone)</th>
											</tr>
										</thead>
										<tbody>
											{#each z.bookingTents as bt}
												<tr>
													<td>{bt.itemName}</td>
													<td class="num">{bt.quantity}</td>
													<td class="num">
														<input
															type="number"
															name="return_{bt.tentId}"
															min="0"
															max={bt.quantity}
															value={bt.quantity}
															class="return-input"
														/>
													</td>
													<td>
														<input
															type="text"
															name="note_{bt.tentId}"
															placeholder="opcjonalnie — zapisze się w magazynie"
															class="return-note-input"
														/>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								{:else}
									<p class="op-hint-small">Brak pozycji magazynowych — tylko zmiana statusu.</p>
								{/if}
								<label class="op-note-field">
									<span>Notatka końcowa (opcjonalnie)</span>
									<textarea
										name="returnNote"
										rows="2"
										placeholder="np. Klient zadowolony, 2 krzesła zostały polane winem — naprawimy, namiot OK"
									></textarea>
								</label>
								<button type="submit" class="btn-op return">📦 Zakończ + zwróć</button>
							</form>
						{/if}
						</div>
					</section>
				{/if}

				<!-- 9. PŁATNOŚĆ — admin pełna, pracownik: pill + quick-pay -->
				<PaymentBlock
					payments={z.payments}
					totalCents={z.totalCents}
					paidCents={z.paidCents}
					isAdmin={data.isAdmin}
				/>

				<!-- 10. ZDJĘCIA (sam dół — dokumentacja) -->
				<section class="card">
					<div class="photos-block no-border">
						<div class="photos-header">
							<h3>📸 Zdjęcia ({z.photos.length})</h3>
							<span class="photos-hint-inline">dostawa · montaż · odbiór · uszkodzenia</span>
						</div>

						{#if z.photos.length > 0}
							<div class="photos-grid">
								{#each z.photos as p}
									<div class="photo-tile kind-{p.kind}">
										<a href={p.url} target="_blank" rel="noopener" class="photo-link">
											<img src={p.url} alt={p.caption ?? p.kind} loading="lazy" />
										</a>
										<div class="photo-meta">
											<span class="photo-kind">
												{#if p.kind === 'delivery'}🚚 dostawa
												{:else if p.kind === 'return'}📦 odbiór
												{:else if p.kind === 'damage'}⚠️ uszkodzenie
												{:else}📷 zdjęcie{/if}
											</span>
											{#if p.caption}<span class="photo-caption">{p.caption}</span>{/if}
											{#if p.takenByName}<span class="photo-by">· {p.takenByName}</span>{/if}
										</div>
										<form method="POST" action="?/deletePhoto" class="photo-del-form">
											<input type="hidden" name="photoId" value={p.id} />
											<button type="submit" class="btn-photo-del" aria-label="Usuń" onclick={(e) => { if (!confirm('Usunąć to zdjęcie?')) e.preventDefault(); }}>✕</button>
										</form>
									</div>
								{/each}
							</div>
						{:else}
							<p class="photos-empty">Brak zdjęć. Dodaj foto z telefonu ↓ (kamera włączy się od razu).</p>
						{/if}

						<form method="POST" action="?/uploadPhoto" enctype="multipart/form-data" class="photo-form">
							<div class="photo-form-row">
								<label class="photo-field photo-file-field">
									<span>Zdjęcie</span>
									<input type="file" name="file" accept="image/*" capture="environment" required />
								</label>
								<label class="photo-field">
									<span>Typ</span>
									<select name="kind">
										<option value="delivery">🚚 Dostawa</option>
										<option value="general" selected>📷 Inne</option>
										<option value="return">📦 Odbiór</option>
										<option value="damage">⚠️ Uszkodzenie</option>
									</select>
								</label>
							</div>
							<label class="photo-field wide">
								<span>Opis (opcjonalnie)</span>
								<input name="caption" type="text" placeholder="np. namiot ustawiony 14:30" />
							</label>
							<button type="submit" class="btn-photo-upload">📤 Wyślij</button>
						</form>
					</div>
				</section>
			{/if}


			<!-- 7. TIMELINE -->
			<TimelineSection {timeline} />
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
		border: 1px solid var(--line);
		border-radius: 0;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--ink-2);
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	.mono-num {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--wn-granat);
		font-weight: 600;
	}
	.btn-primary {
		padding: 0.5rem 1.15rem;
		background: var(--wn-zielony);
		color: var(--wn-atrament);
		border: 2px solid var(--wn-atrament);
		border-radius: 0;
		font-size: 0.88rem;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
		text-decoration: none;
		box-shadow: 3px 3px 0 var(--wn-atrament);
		transition: transform 0.1s, box-shadow 0.1s;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	.btn-ghost {
		padding: 0.5rem 0.95rem;
		background: var(--paper);
		color: var(--ink);
		border: 1px solid var(--line);
		border-radius: 0;
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
		margin-right: 0.4rem;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	.btn-ghost:hover {
		border-color: var(--wn-zielony);
		color: var(--wn-zielony);
	}
	.btn-primary:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--wn-atrament);
	}
	.btn-primary:active {
		transform: translate(1px, 1px);
		box-shadow: 1px 1px 0 var(--wn-atrament);
	}

	.content {
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-width: 1100px;
		margin: 0 auto;
		width: 100%;
	}
	.topbar {
		padding-left: max(1.5rem, calc((100% - 1100px) / 2));
		padding-right: max(1.5rem, calc((100% - 1100px) / 2));
	}

	.card {
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 0;
		padding: 1.25rem 1.5rem;
	}
	.card h2 {
		margin: 0 0 0.6rem;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--ink);
		font-family: var(--font-sans);
	}

	/* .client-* + .cv-* → ClientCard.svelte */
	/* .event-grid + .e-* → EventCard.svelte */

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

	/* .msg-text zostaje — "Wiadomość od klienta" inline (1 liner, nie warto komponent) */
	.msg-text {
		margin: 0;
		font-size: 0.92rem;
		color: var(--ink-2);
		line-height: 1.55;
	}
	/* .notes-* + .note-* + .btn-ghost/primary-sm + .empty-note → NotesSection.svelte */

	/* .status-* → StatusChips.svelte */

	.booking-ops {
		margin-top: 1.25rem;
		padding-top: 1.25rem;
		border-top: 2px solid var(--line);
	}

	/* .team-* + .member-* + .btn-assign/unassign → TeamBlock.svelte */

	/* ─── ZDJĘCIA ─────────────────────────────── */
	.photos-block {
		margin-top: 1.25rem;
		padding-top: 1.25rem;
		border-top: 2px solid var(--line);
	}
	.photos-header {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 0.85rem;
		flex-wrap: wrap;
	}
	.photos-header h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
	}
	.photos-hint-inline {
		color: var(--mute);
		font-size: 0.78rem;
	}
	.photos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.photo-tile {
		position: relative;
		display: flex;
		flex-direction: column;
		background: var(--paper-2);
		border: 1px solid var(--line);
	}
	.photo-tile.kind-damage { border-color: var(--wn-pomidor); }
	.photo-tile.kind-delivery { border-color: var(--wn-zielony); }
	.photo-tile.kind-return { border-color: var(--wn-granat); }
	.photo-link {
		display: block;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		background: var(--wn-atrament);
	}
	.photo-link img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.photo-meta {
		padding: 0.45rem 0.55rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		font-size: 0.75rem;
	}
	.photo-kind {
		font-weight: 600;
	}
	.photo-caption {
		color: var(--ink-2);
	}
	.photo-by {
		color: var(--mute);
		font-size: 0.7rem;
	}
	.photo-del-form {
		position: absolute;
		top: 4px;
		right: 4px;
	}
	.btn-photo-del {
		width: 26px;
		height: 26px;
		border: none;
		background: rgba(0, 0, 0, 0.55);
		color: white;
		cursor: pointer;
		font-size: 0.85rem;
		line-height: 1;
	}
	.btn-photo-del:hover { background: var(--wn-pomidor); }
	.photos-empty {
		color: var(--mute);
		font-style: italic;
		font-size: 0.88rem;
		padding: 0.5rem 0;
		margin: 0 0 1rem;
	}
	.photo-form {
		padding: 0.85rem;
		background: var(--paper-2);
		border: 1px dashed var(--line);
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	.photo-form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.7rem;
	}
	.photo-field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.photo-field > span {
		font-size: 0.7rem;
		color: var(--mute);
		font-weight: 500;
	}
	.photo-field.wide { width: 100%; }
	.photo-field input[type='text'],
	.photo-field select {
		border: 1px solid var(--line);
		padding: 0.4rem 0.55rem;
		background: var(--paper);
		font-family: inherit;
		font-size: 0.85rem;
		border-radius: 0;
	}
	.photo-file-field input[type='file'] {
		padding: 0.35rem;
		font-size: 0.85rem;
	}
	.btn-photo-upload {
		align-self: flex-end;
		padding: 0.6rem 1.3rem;
		background: var(--wn-zielony);
		color: var(--wn-atrament);
		border: 2px solid var(--wn-atrament);
		border-radius: 0;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.92rem;
		box-shadow: 3px 3px 0 var(--wn-atrament);
	}
	.btn-photo-upload:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--wn-atrament);
	}

	/* .pay-* + .btn-*-pay + .payments-block → PaymentBlock.svelte */
	.op-form {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}
	.op-hint {
		margin: 0;
		font-size: 0.88rem;
		color: var(--ink-2);
		line-height: 1.5;
	}
	.op-hint-small {
		margin: 0;
		font-size: 0.82rem;
		color: var(--mute);
		font-style: italic;
	}
	.cash-reminder {
		padding: 0.7rem 1rem;
		border-left: 3px solid var(--wn-zarowka);
		background: color-mix(in srgb, var(--wn-zarowka) 20%, var(--paper));
		font-size: 0.88rem;
		line-height: 1.45;
	}
	.cash-reminder strong {
		font-family: var(--font-mono);
	}
	.cash-reminder em {
		font-style: italic;
		color: var(--wn-atrament);
	}
	.cash-reminder.urgent {
		border-left-color: var(--wn-pomidor);
		background: color-mix(in srgb, var(--wn-pomidor) 12%, var(--paper));
	}
	.cash-reminder.ok {
		border-left-color: var(--wn-zielony);
		background: color-mix(in srgb, var(--wn-zielony) 14%, var(--paper));
		color: var(--wn-zielony-ink);
	}
	.btn-op {
		padding: 0.65rem 1.3rem;
		border: 2px solid var(--wn-atrament);
		border-radius: 0;
		font-size: 0.95rem;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
		box-shadow: 3px 3px 0 var(--wn-atrament);
		transition: transform 0.1s, box-shadow 0.1s;
		align-self: flex-start;
	}
	.btn-op.dispatch {
		background: var(--wn-zarowka);
		color: var(--wn-atrament);
	}
	.btn-op.return {
		background: var(--wn-zielony);
		color: var(--wn-atrament);
	}
	.btn-op:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--wn-atrament);
	}
	.btn-op:active {
		transform: translate(1px, 1px);
		box-shadow: 1px 1px 0 var(--wn-atrament);
	}
	.return-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.88rem;
	}
	.return-table th,
	.return-table td {
		text-align: left;
		padding: 0.4rem 0.5rem;
		border-bottom: 1px solid var(--line);
	}
	.return-table th {
		font-weight: 600;
		color: var(--mute);
		font-size: 0.72rem;
		text-transform: uppercase;
	}
	.return-table .num {
		text-align: right;
	}
	.return-input {
		width: 70px;
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--line);
		text-align: right;
		font-family: var(--font-mono);
		border-radius: 0;
	}
	.return-input:focus {
		outline: none;
		border-color: var(--wn-zielony);
	}
	.return-note-input {
		width: 100%;
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--line);
		font-family: inherit;
		font-size: 0.82rem;
		border-radius: 0;
	}
	.return-note-input:focus {
		outline: none;
		border-color: var(--wn-zielony);
	}
	.op-note-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.op-note-field > span {
		font-size: 0.78rem;
		color: var(--mute);
		font-weight: 500;
	}
	.op-note-field textarea {
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--line);
		background: var(--paper);
		font-family: inherit;
		font-size: 0.88rem;
		resize: vertical;
		border-radius: 0;
	}
	.op-note-field textarea:focus {
		outline: none;
		border-color: var(--wn-zielony);
	}

	/* .timeline / .t-* styles przeniesione do TimelineSection.svelte */

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

		/* Mobile — większe CTA dla field worka (kierowcy w ruchu) */
		.btn-op {
			width: 100%;
			padding: 0.95rem 1rem;
			font-size: 1.05rem;
		}
		.btn-assign,
		.btn-add-pay,
		.btn-photo-upload {
			width: 100%;
			padding: 0.85rem 1rem;
			font-size: 1rem;
		}
		.photo-form-row {
			grid-template-columns: 1fr;
		}
		.photos-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		/* .status-chip-btn mobile → StatusChips.svelte */
	}
</style>
