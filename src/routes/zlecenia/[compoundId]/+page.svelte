<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import SidebarRail from '$lib/components/SidebarRail.svelte';

	let { data } = $props();
	const z = $derived(data.zlecenie);

	let newNote = $state('');
	let addingNote = $state(false);

	// UNIFIED 6-STATUS (v5.20): nowy / w-trakcie / wygrany / zrealizowany / przegrany / archiwum
	// Każdy chip ma semantyczny sens i mapuje na różny DB-status per typ
	const ALL_STATUSES: Array<{ id: string; label: string; emoji: string }> = [
		{ id: 'nowy', label: 'Nowy', emoji: '🆕' },
		{ id: 'w-trakcie', label: 'W trakcie', emoji: '⚙️' },
		{ id: 'wygrany', label: 'Wygrany', emoji: '✅' },
		{ id: 'zrealizowany', label: 'Zrealizowany', emoji: '🎉' },
		{ id: 'przegrany', label: 'Przegrany', emoji: '✕' },
		{ id: 'archiwum', label: 'Archiwum', emoji: '📦' }
	];

	// Mapowanie DB-status → unified bucket (do podświetlenia aktywnego chipa)
	const DB_TO_UNIFIED: Record<string, Record<string, string>> = {
		lead: {
			new: 'nowy',
			contacted: 'w-trakcie',
			qualified: 'w-trakcie',
			quoted: 'w-trakcie',
			won: 'zrealizowany',
			lost: 'przegrany',
			archived: 'archiwum'
		},
		offer: {
			draft: 'w-trakcie',
			sent: 'w-trakcie',
			viewed: 'w-trakcie',
			accepted: 'wygrany',
			rejected: 'przegrany',
			expired: 'przegrany'
		},
		booking: {
			draft: 'wygrany',
			confirmed: 'wygrany',
			'in-progress': 'wygrany',
			done: 'zrealizowany',
			cancelled: 'przegrany'
		}
	};
	const currentUnified = $derived(DB_TO_UNIFIED[z.type]?.[z.status] ?? z.status);

	// Per-type dostępne chipy — tylko sensowne przejścia:
	//  lead    = nowy → w-trakcie → przegrany / archiwum (wygrany = tylko przez ofertę)
	//  offer   = w-trakcie → wygrany (auto tworzy booking) / przegrany
	//  booking = wygrany (aktywne) / zrealizowany / przegrany
	const ALLOWED_PER_TYPE: Record<string, string[]> = {
		lead: ['nowy', 'w-trakcie', 'przegrany', 'archiwum'],
		offer: ['w-trakcie', 'wygrany', 'przegrany'],
		booking: ['wygrany', 'zrealizowany', 'przegrany']
	};
	const statusList = $derived(
		ALL_STATUSES.filter((s) => ALLOWED_PER_TYPE[z.type]?.includes(s.id) ?? true)
	);

	const ICONS: Record<string, string> = {
		dashboard: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9ZM9 22V12h6v10',
		zlecenia: 'M22 12h-4l-3 9L9 3l-3 9H2',
		tents: 'M3 20 L12 4 L21 20 Z M8 20 L12 13 L16 20',
		team: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
		settings: 'M20 7h-9 M14 17H5 M17 14a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z M7 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z'
	};
	const NAV = [
		{ id: 'dashboard', label: 'Home', href: '/dashboard' },
		{ id: 'zlecenia', label: 'Zlecenia', href: '/zlecenia', active: true },
		{ id: 'tents', label: 'Magazyn', href: '/magazyn' },
		{ id: 'team', label: 'Zespół', href: '/team' }
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
			<!-- 1. KLIENT + WARTOŚĆ (w header po prawej) -->
			<section class="card">
				<div class="client-header">
					<h2>Klient</h2>
					{#if z.totalCents && z.totalCents > 0}
						<div class="client-value">
							<span class="cv-label">Wartość</span>
							<span class="cv-amount">{fmtZl(z.totalCents)}</span>
						</div>
					{/if}
				</div>
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
						{#if z.event.venue}
							<a
								class="e-val e-map-link"
								href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(z.event.venue)}`}
								target="_blank"
								rel="noopener"
								title="Otwórz w mapach"
							>
								📍 {z.event.venue}
							</a>
						{:else}
							<span class="e-val">—</span>
						{/if}
					</div>
				</div>
			</section>

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
			<section class="card">
				<div class="notes-head">
					<h2>Notatki wewnętrzne</h2>
					{#if !addingNote}
						<button class="btn-ghost-sm" onclick={() => (addingNote = true)}>+ Dodaj notatkę</button>
					{/if}
				</div>
				{#if addingNote}
					<form method="POST" action="?/addNote" class="note-form">
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

			<!-- 6. ZMIANA STATUSU (admin only) -->
			{#if data.isAdmin}
			<section class="card">
				<h2>Status</h2>
				{#if z.type === 'lead'}
					<p class="status-hint">
						Żeby wysłać ofertę → klik <strong>"+ Oferta z leada"</strong> w prawym górnym rogu (otwiera kalkulator). Po zapisaniu oferty lead automatycznie dostanie status <em>"oferta wysłana"</em>.
					</p>
				{:else if z.type === 'offer'}
					<p class="status-hint">
						Klik <strong>"Wygrany"</strong> = oferta przyjęta → automatycznie utworzymy rezerwację w magazynie (z items oferty).
					</p>
				{/if}
				<form method="POST" action="?/updateStatus" class="status-form">
					<div class="status-chips">
						{#each statusList as s}
							<button
								type="submit"
								name="status"
								value={s.id}
								class="status-chip-btn"
								class:active={currentUnified === s.id}
							>
								<span>{s.emoji}</span>
								<span>{s.label}</span>
							</button>
						{/each}
					</div>
				</form>
			</section>
			{/if}

			{#if z.type === 'booking'}
				{@const totalZl = (z.totalCents ?? 0) / 100}
				{@const paidZl = z.paidCents / 100}
				{@const leftZl = Math.max(0, totalZl - paidZl)}
				{@const paidPct = totalZl > 0 ? Math.round((paidZl / totalZl) * 100) : 0}
				{@const payStatus = paidZl >= totalZl && totalZl > 0 ? 'paid' : paidZl > 0 ? 'partial' : 'none'}

				<!-- 7. ZESPÓŁ REALIZUJĄCY -->
				<section class="card">
					<div class="team-block no-border">
						<div class="team-header">
							<h3>👥 Zespół realizujący ({z.assignments.length})</h3>
						</div>
						{#if z.assignments.length > 0}
							<div class="team-list">
								{#each z.assignments as a}
									<div class="team-member">
										<span class="member-avatar">{a.userName.charAt(0).toUpperCase()}</span>
										<div class="member-info">
											<strong>{a.userName}</strong>
											<span class="member-task">
												{#if a.task === 'driver'}🚚 kierowca
												{:else if a.task === 'installer'}🔨 montażysta
												{:else if a.task === 'lead'}👑 lider
												{:else}{a.task}{/if}
											</span>
										</div>
										<form method="POST" action="?/unassignUser" style="display:inline;">
											<input type="hidden" name="assignmentId" value={a.id} />
											<button type="submit" class="btn-unassign" onclick={(e) => { if (!confirm(`Usunąć ${a.userName} z zespołu?`)) e.preventDefault(); }}>✕</button>
										</form>
									</div>
								{/each}
							</div>
						{:else}
							<p class="team-empty">Jeszcze nikt nie przypisany. Dobierz zespół poniżej.</p>
						{/if}

						<form method="POST" action="?/assignUser" class="team-form">
							<label class="team-field">
								<span>Osoba</span>
								<select name="userId" required>
									<option value="">— wybierz —</option>
									{#each data.availableUsers as u}
										<option value={u.id}>
											{u.name}{u.skills.length > 0 ? ` (${u.skills.map((s) => s === 'driver' ? '🚚' : s === 'installer' ? '🔨' : s === 'lead' ? '👑' : s).join(' ')})` : ''}
										</option>
									{/each}
								</select>
							</label>
							<label class="team-field">
								<span>Rola</span>
								<select name="task">
									<option value="driver">🚚 Kierowca</option>
									<option value="installer">🔨 Montażysta</option>
									<option value="lead">👑 Lider ekipy</option>
									<option value="other">Inne</option>
								</select>
							</label>
							<label class="team-field wide">
								<span>Notatka (opcjonalnie)</span>
								<input name="notes" type="text" placeholder="np. auto + przyczepa, wozi namiot 6×12" />
							</label>
							<button type="submit" class="btn-assign">+ Przypisz</button>
						</form>
					</div>
				</section>

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
				<section class="card">
					<div class="payments-block no-border">
						<div class="pay-header">
							<h3>💰 Płatność</h3>
							<span class="pay-pill pay-{payStatus}">
								{#if payStatus === 'paid'}✓ Opłacone{:else if payStatus === 'partial'}½ {paidPct}% ({fmtZl(paidZl * 100)}){:else}✕ Brak płatności{/if}
							</span>
						</div>
						<div class="pay-summary">
							<div class="pay-stat"><span class="pay-lbl">Total:</span> <strong>{fmtZl(totalZl * 100)}</strong></div>
							<div class="pay-stat"><span class="pay-lbl">Zapłacone:</span> <strong class="pay-in">{fmtZl(paidZl * 100)}</strong></div>
							<div class="pay-stat"><span class="pay-lbl">Zostało:</span> <strong class:pay-due={leftZl > 0}>{fmtZl(leftZl * 100)}</strong></div>
						</div>

						{#if leftZl > 0}
							<!-- 1-click dla obu ról (kierowca zbiera gotówkę + admin szybko) -->
							<form method="POST" action="?/addPayment" class="pay-quick">
								<input type="hidden" name="amountZl" value={leftZl.toFixed(2)} />
								<input type="hidden" name="method" value="gotówka" />
								<input type="hidden" name="kind" value="pełna" />
								<input type="hidden" name="paidAt" value={new Date().toISOString().slice(0, 10)} />
								<button type="submit" class="btn-quick-pay">
									💵 Zapłacił gotówką ({fmtZl(leftZl * 100)})
								</button>
								{#if data.isAdmin}
									<span class="pay-quick-hint">lub pełne szczegóły ↓</span>
								{/if}
							</form>
						{/if}

						{#if data.isAdmin && z.payments.length > 0}
							<table class="pay-table">
								<thead>
									<tr>
										<th>Data</th>
										<th class="num">Kwota</th>
										<th>Metoda</th>
										<th>Rodzaj</th>
										<th>Notatka</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{#each z.payments as p}
										<tr>
											<td class="mono">{p.paidAt}</td>
											<td class="num pay-amount">{fmtZl(p.amountCents)}</td>
											<td><span class="pay-method">{p.method}</span></td>
											<td class="mute">{p.kind}</td>
											<td class="mute">{p.notes ?? '—'}</td>
											<td class="actions">
												<form method="POST" action="?/deletePayment" style="display:inline;">
													<input type="hidden" name="paymentId" value={p.id} />
													<button type="submit" class="btn-del-pay" onclick={(e) => { if (!confirm('Usunąć tę płatność?')) e.preventDefault(); }}>Usuń</button>
												</form>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}

						{#if data.isAdmin && (leftZl > 0 || totalZl === 0 || z.payments.length === 0)}
							<form method="POST" action="?/addPayment" class="pay-form">
								<label class="pay-field">
									<span>Kwota (zł)</span>
									<input name="amountZl" type="number" step="0.01" min="0.01" value={leftZl > 0 ? leftZl.toFixed(2) : ''} placeholder="np. 1800" required />
								</label>
								<label class="pay-field">
									<span>Metoda</span>
									<select name="method">
										<option value="gotówka">💵 Gotówka</option>
										<option value="przelew">🏦 Przelew</option>
										<option value="inne">inne</option>
									</select>
								</label>
								<label class="pay-field">
									<span>Rodzaj</span>
									<select name="kind">
										<option value="pełna">Pełna</option>
										<option value="dopłata">Dopłata</option>
									</select>
								</label>
								<label class="pay-field">
									<span>Data</span>
									<input name="paidAt" type="date" value={new Date().toISOString().slice(0, 10)} required />
								</label>
								<label class="pay-field wide">
									<span>Notatka (opcjonalnie)</span>
									<input name="notes" type="text" placeholder="np. zapłacone przy odbiorze" />
								</label>
								<button type="submit" class="btn-add-pay">+ Dodaj płatność</button>
							</form>
						{/if}
					</div>
				</section>

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
			<section class="card">
				<h2>Przebieg</h2>
				<ul class="timeline">
					{#each timeline as t}
						<li class:done={t.done} class="tl-{t.kind}">
							<span class="t-emoji">{t.emoji}</span>
							<div class="t-body">
								<span class="t-label">{t.label}</span>
								{#if t.note}<span class="t-note">{t.note}</span>{/if}
							</div>
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

	.client-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.4rem;
	}
	.client-header h2 {
		margin: 0;
	}
	.client-value {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		padding: 0.45rem 0.85rem;
		background: var(--paper-2);
		border-left: 3px solid var(--wn-zielony);
	}
	.cv-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		color: var(--mute);
		letter-spacing: 0.04em;
	}
	.cv-amount {
		font-family: var(--font-mono);
		font-size: 1.85rem;
		line-height: 1;
		font-weight: 800;
		color: var(--wn-zielony-ink);
	}
	.e-map-link {
		color: var(--wn-granat);
		text-decoration: none;
		font-weight: 500;
	}
	.e-map-link:hover {
		color: var(--wn-zielony);
		text-decoration: underline;
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
		gap: 0.4rem;
		padding: 0.5rem 0.95rem;
		background: var(--paper);
		border: 2px solid var(--line);
		border-radius: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--ink-2);
		cursor: pointer;
		font-family: var(--font-sans);
		transition: transform 0.1s, box-shadow 0.1s;
	}
	.status-chip-btn:hover {
		border-color: var(--wn-atrament);
		color: var(--ink);
	}
	.status-chip-btn.active {
		background: var(--wn-zielony);
		color: var(--wn-atrament);
		border-color: var(--wn-atrament);
		box-shadow: 3px 3px 0 var(--wn-atrament);
		transform: translate(-1px, -1px);
	}

	.booking-ops {
		margin-top: 1.25rem;
		padding-top: 1.25rem;
		border-top: 2px solid var(--line);
	}

	/* ─── ZESPÓŁ ─────────────────────────────── */
	.team-block {
		margin-top: 1.25rem;
		padding-top: 1.25rem;
		border-top: 2px solid var(--line);
	}
	.team-header h3 {
		margin: 0 0 0.85rem;
		font-size: 1.05rem;
		font-weight: 700;
	}
	.team-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.team-member {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.55rem 0.85rem;
		background: var(--paper-2);
		border: 1px solid var(--line);
	}
	.member-avatar {
		width: 32px;
		height: 32px;
		background: var(--wn-atrament);
		color: var(--wn-plotno);
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 0.85rem;
	}
	.member-info {
		flex: 1;
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
	}
	.member-info strong {
		font-size: 0.95rem;
	}
	.member-task {
		font-size: 0.82rem;
		color: var(--mute);
	}
	.btn-unassign {
		padding: 0.3rem 0.55rem;
		border: 1px solid transparent;
		background: transparent;
		color: var(--wn-pomidor);
		cursor: pointer;
		font-size: 0.9rem;
	}
	.btn-unassign:hover { border-color: var(--wn-pomidor); }
	.team-empty {
		color: var(--mute);
		font-style: italic;
		font-size: 0.88rem;
		padding: 0.5rem 0;
		margin: 0 0 1rem;
	}
	.team-form {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.7rem;
		align-items: end;
		padding: 0.85rem;
		background: var(--paper-2);
		border: 1px dashed var(--line);
	}
	.team-field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.team-field > span {
		font-size: 0.7rem;
		color: var(--mute);
		font-weight: 500;
	}
	.team-field.wide { grid-column: 1 / -1; }
	.team-field input,
	.team-field select {
		border: 1px solid var(--line);
		padding: 0.4rem 0.55rem;
		background: var(--paper);
		font-family: inherit;
		font-size: 0.85rem;
		border-radius: 0;
	}
	.team-field input:focus,
	.team-field select:focus {
		outline: none;
		border-color: var(--wn-zielony);
	}
	.btn-assign {
		grid-column: 1 / -1;
		justify-self: end;
		padding: 0.5rem 1.15rem;
		background: var(--wn-zielony);
		color: var(--wn-atrament);
		border: 2px solid var(--wn-atrament);
		border-radius: 0;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		box-shadow: 3px 3px 0 var(--wn-atrament);
	}
	.btn-assign:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--wn-atrament);
	}

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

	/* ─── PŁATNOŚCI ─────────────────────────────── */
	.payments-block {
		margin-top: 1.25rem;
		padding-top: 1.25rem;
		border-top: 2px solid var(--line);
	}
	.pay-header {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		margin-bottom: 0.85rem;
	}
	.pay-header h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
	}
	.pay-pill {
		padding: 0.2rem 0.7rem;
		border: 1px solid var(--line);
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	.pay-pill.pay-paid {
		background: var(--wn-zielony);
		color: var(--wn-atrament);
		border-color: var(--wn-atrament);
	}
	.pay-pill.pay-partial {
		background: var(--wn-zarowka);
		color: var(--wn-atrament);
		border-color: #8a6d00;
	}
	.pay-pill.pay-none {
		background: color-mix(in srgb, var(--wn-pomidor) 15%, transparent);
		color: var(--wn-pomidor);
		border-color: var(--wn-pomidor);
	}
	.pay-summary {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
		padding: 0.85rem 1rem;
		background: var(--paper-2);
		border-left: 3px solid var(--wn-zielony);
		font-size: 0.9rem;
	}
	.pay-stat .pay-lbl {
		color: var(--mute);
		font-size: 0.8rem;
		margin-right: 0.3rem;
	}
	.pay-stat strong {
		font-family: var(--font-mono);
		font-size: 0.95rem;
	}
	.pay-stat .pay-in {
		color: var(--wn-zielony);
	}
	.pay-stat .pay-due {
		color: var(--wn-pomidor);
	}
	.pay-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}
	.pay-table th,
	.pay-table td {
		text-align: left;
		padding: 0.5rem 0.6rem;
		border-bottom: 1px solid var(--line);
	}
	.pay-table th {
		font-weight: 600;
		color: var(--mute);
		font-size: 0.72rem;
		text-transform: uppercase;
	}
	.pay-table .num { text-align: right; font-family: var(--font-mono); }
	.pay-table .mono { font-family: var(--font-mono); }
	.pay-table .mute { color: var(--mute); }
	.pay-table .actions { text-align: right; }
	.pay-amount { font-weight: 600; color: var(--wn-zielony); }
	.pay-method {
		padding: 0.1rem 0.4rem;
		background: var(--paper-2);
		border: 1px solid var(--line);
		font-size: 0.78rem;
	}
	.btn-del-pay {
		padding: 0.25rem 0.55rem;
		border: 1px solid transparent;
		background: transparent;
		color: var(--wn-pomidor);
		cursor: pointer;
		font-size: 0.75rem;
	}
	.btn-del-pay:hover { border-color: var(--wn-pomidor); }

	.pay-quick {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.85rem 1rem;
		background: color-mix(in srgb, var(--wn-zielony) 15%, var(--paper));
		border: 2px dashed var(--wn-zielony);
		margin-bottom: 0.85rem;
	}
	.btn-quick-pay {
		padding: 0.65rem 1.1rem;
		background: var(--wn-zielony);
		color: var(--wn-atrament);
		border: 2px solid var(--wn-atrament);
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		border-radius: 0;
		box-shadow: 3px 3px 0 var(--wn-atrament);
	}
	.btn-quick-pay:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--wn-atrament);
	}
	.pay-quick-hint {
		color: var(--mute);
		font-size: 0.8rem;
		font-style: italic;
	}
	.pay-form {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.7rem;
		align-items: end;
		padding: 0.85rem;
		background: var(--paper-2);
		border: 1px dashed var(--line);
	}
	.pay-field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.pay-field > span {
		font-size: 0.7rem;
		color: var(--mute);
		font-weight: 500;
	}
	.pay-field.wide { grid-column: 1 / -1; }
	.pay-field input,
	.pay-field select {
		border: 1px solid var(--line);
		padding: 0.4rem 0.55rem;
		background: var(--paper);
		font-family: inherit;
		font-size: 0.85rem;
		border-radius: 0;
	}
	.pay-field input:focus,
	.pay-field select:focus {
		outline: none;
		border-color: var(--wn-zielony);
	}
	.btn-add-pay {
		grid-column: 1 / -1;
		justify-self: end;
		padding: 0.55rem 1.15rem;
		background: var(--wn-zielony);
		color: var(--wn-atrament);
		border: 2px solid var(--wn-atrament);
		border-radius: 0;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		box-shadow: 3px 3px 0 var(--wn-atrament);
	}
	.btn-add-pay:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--wn-atrament);
	}
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
	.t-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.t-note {
		font-size: 0.78rem;
		color: var(--mute);
		font-style: italic;
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
		.status-chip-btn {
			padding: 0.7rem 0.95rem;
			font-size: 0.95rem;
		}
	}
</style>
