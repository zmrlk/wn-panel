<script lang="ts">
	import type { ZlecenieType, UnifiedStatus } from '$lib/booking-stages';

	/**
	 * Sekcja "Status" — chipy unified (nowy / w-trakcie / wygrany / zrealizowany / przegrany / archiwum).
	 * Each chip = form submit button z value=`{status id}` → `?/updateStatus` action.
	 * Status-hint per typ (lead → oferta, offer → wygrany = auto-konwersja).
	 *
	 * Widoczność: admin-only (z parenta).
	 */

	type StatusChip = { id: UnifiedStatus; label: string; emoji: string };

	interface Props {
		zType: ZlecenieType;
		currentUnified: string;
		statusList: StatusChip[];
	}

	let { zType, currentUnified, statusList }: Props = $props();
</script>

<section class="card">
	<h2>Status</h2>
	{#if zType === 'lead'}
		<p class="status-hint">
			Żeby wysłać ofertę → klik <strong>"+ Oferta z leada"</strong> w prawym górnym rogu
			(otwiera kalkulator). Po zapisaniu oferty lead automatycznie dostanie status
			<em>"oferta wysłana"</em>.
		</p>
	{:else if zType === 'offer'}
		<p class="status-hint">
			Klik <strong>"Wygrany"</strong> = oferta przyjęta → automatycznie utworzymy rezerwację
			w magazynie (z items oferty).
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

<style>
	.card {
		background: var(--paper-2, #fff);
		border: 2px solid var(--ink, #111);
		border-radius: 8px;
		padding: 1rem 1.1rem;
		box-shadow: 3px 3px 0 var(--ink, #111);
	}
	h2 {
		margin: 0 0 0.65rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--ink, #111);
	}
	.status-hint {
		margin: 0 0 0.85rem;
		padding: 0.6rem 0.85rem;
		background: color-mix(in srgb, var(--wn-zielony, #2a8a4a) 8%, transparent);
		border-left: 3px solid var(--wn-zielony, #2a8a4a);
		border-radius: 0 6px 6px 0;
		font-size: 0.85rem;
		color: var(--ink-2, #444);
	}
	.status-hint strong {
		color: var(--ink, #111);
	}
	.status-hint em {
		font-style: italic;
		color: var(--wn-zielony-ink, #1a5a2e);
	}
	.status-form {
		margin: 0;
	}
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
		background: var(--paper, #f7f7f5);
		border: 2px solid var(--line, #e0e0dd);
		border-radius: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--ink-2, #444);
		cursor: pointer;
		font-family: var(--font-sans, system-ui);
		transition: transform 0.1s, box-shadow 0.1s;
	}
	.status-chip-btn:hover {
		border-color: var(--wn-atrament, #111);
		color: var(--ink, #111);
	}
	.status-chip-btn.active {
		background: var(--wn-zielony, #2a8a4a);
		color: var(--wn-atrament, #111);
		border-color: var(--wn-atrament, #111);
		box-shadow: 3px 3px 0 var(--wn-atrament, #111);
		transform: translate(-1px, -1px);
	}

	@media (max-width: 720px) {
		.status-chip-btn {
			padding: 0.7rem 0.95rem;
			font-size: 0.95rem;
		}
	}
</style>
