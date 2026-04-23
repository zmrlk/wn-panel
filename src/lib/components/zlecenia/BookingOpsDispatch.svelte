<script lang="ts">
	import { fmtZl } from '$lib/formatters';

	/**
	 * Booking ops: "Wydaj na event" (confirmed → in-progress).
	 * Tworzy OUT movements `wydanie_na_event` na wszystkie booking_tents.
	 *
	 * UI: cash-reminder (ile zostało do pobrania), notatka opcjonalna, przycisk.
	 * Parent renderuje tylko gdy status === 'confirmed'.
	 */

	interface Props {
		/** Kwota pozostała do zapłaty (w zł, nie cents) */
		leftZl: number;
		/** Kwota już zapłacona (w zł) */
		paidZl: number;
		/** Kwota total oferty (w zł) */
		totalZl: number;
	}

	let { leftZl, paidZl, totalZl }: Props = $props();
</script>

<section class="card">
	<h2>🚚 Realizacja</h2>
	<form method="POST" action="?/dispatchBooking" class="op-form">
		<p class="op-hint">
			Rezerwacja potwierdzona. <strong>Wydaj na event</strong> — items znikną z magazynu
			do momentu zwrotu.
		</p>
		{#if leftZl > 0}
			<div class="cash-reminder">
				💰 <strong>Do pobrania od klienta: {fmtZl(leftZl * 100)}</strong>
				{#if paidZl === 0}
					— najczęściej klient płaci przy dostawie.
				{:else}
					— wpłacone już {fmtZl(paidZl * 100)}.
				{/if}
				Dodaj w sekcji "💰 Płatność" poniżej <em>przed</em> albo <em>po</em> wydaniu —
				kolejność bez znaczenia.
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
	.op-form {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}
	.op-hint {
		margin: 0;
		font-size: 0.88rem;
		color: var(--ink-2, #444);
		line-height: 1.5;
	}
	.cash-reminder {
		padding: 0.7rem 1rem;
		border-left: 3px solid var(--wn-zarowka, #f4c430);
		background: color-mix(in srgb, var(--wn-zarowka, #f4c430) 20%, var(--paper, #f7f7f5));
		font-size: 0.88rem;
		line-height: 1.45;
	}
	.cash-reminder strong {
		font-family: var(--font-mono, ui-monospace, monospace);
	}
	.cash-reminder em {
		font-style: italic;
		color: var(--wn-atrament, #111);
	}
	.cash-reminder.ok {
		border-left-color: var(--wn-zielony, #2a8a4a);
		background: color-mix(in srgb, var(--wn-zielony, #2a8a4a) 14%, var(--paper, #f7f7f5));
		color: var(--wn-zielony-ink, #1a5a2e);
	}
	.op-note-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.op-note-field > span {
		font-size: 0.78rem;
		color: var(--mute, #777);
		font-weight: 500;
	}
	.op-note-field textarea {
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--line, #e0e0dd);
		background: var(--paper, #f7f7f5);
		font-family: inherit;
		font-size: 0.88rem;
		resize: vertical;
		border-radius: 0;
	}
	.op-note-field textarea:focus {
		outline: none;
		border-color: var(--wn-zielony, #2a8a4a);
	}
	.btn-op {
		padding: 0.65rem 1.3rem;
		border: 2px solid var(--wn-atrament, #111);
		border-radius: 0;
		font-size: 0.95rem;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
		box-shadow: 3px 3px 0 var(--wn-atrament, #111);
		transition: transform 0.1s, box-shadow 0.1s;
		align-self: flex-start;
	}
	.btn-op.dispatch {
		background: var(--wn-zarowka, #f4c430);
		color: var(--wn-atrament, #111);
	}
	.btn-op:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--wn-atrament, #111);
	}
	.btn-op:active {
		transform: translate(1px, 1px);
		box-shadow: 1px 1px 0 var(--wn-atrament, #111);
	}

	@media (max-width: 720px) {
		.btn-op {
			align-self: stretch;
			text-align: center;
		}
	}
</style>
