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
	import BookingOpsDispatch from '$lib/components/zlecenia/BookingOpsDispatch.svelte';
	import BookingOpsReturn from '$lib/components/zlecenia/BookingOpsReturn.svelte';
	import PhotoGallery from '$lib/components/zlecenia/PhotoGallery.svelte';
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
				{#if z.status === 'confirmed'}
					<BookingOpsDispatch {leftZl} {paidZl} {totalZl} />
				{:else if z.status === 'in-progress'}
					<BookingOpsReturn bookingTents={z.bookingTents} {leftZl} {totalZl} />
				{/if}

				<!-- 9. PŁATNOŚĆ — admin pełna, pracownik: pill + quick-pay -->
				<PaymentBlock
					payments={z.payments}
					totalCents={z.totalCents}
					paidCents={z.paidCents}
					isAdmin={data.isAdmin}
				/>

				<!-- 10. ZDJĘCIA (sam dół — dokumentacja) -->
				<PhotoGallery photos={z.photos} />
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

	/* .booking-ops + .op-* + .btn-op + .cash-reminder + .return-* → BookingOpsDispatch.svelte + BookingOpsReturn.svelte */

	/* .team-* + .member-* + .btn-assign/unassign → TeamBlock.svelte */

	/* .photos-* + .photo-* + .btn-photo-* → PhotoGallery.svelte */

	/* .pay-* + .btn-*-pay + .payments-block → PaymentBlock.svelte */
	/* .op-* + .btn-op + .cash-reminder + .return-* → BookingOpsDispatch/Return.svelte */

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

		/* .btn-op mobile → BookingOpsDispatch/Return.svelte */
		.btn-assign,
		.btn-add-pay,
		.btn-photo-upload {
			width: 100%;
			padding: 0.85rem 1rem;
			font-size: 1rem;
		}
		/* .photo-form-row + .photos-grid mobile → PhotoGallery.svelte */
		/* .status-chip-btn mobile → StatusChips.svelte */
	}
</style>
