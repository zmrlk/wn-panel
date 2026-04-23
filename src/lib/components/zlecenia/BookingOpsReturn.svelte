<script lang="ts">
	import { fmtZl } from '$lib/formatters';

	/**
	 * Booking ops: "Zakończ + zwróć na magazyn" (in-progress → done).
	 * Tworzy IN movements `zwrot_po_evencie` na podstawie ile wróciło per item.
	 * Różnica wydane - wróciło = strata (osobny OUT movement `strata`).
	 *
	 * UX: onsubmit pre-check ostrzega jeżeli wykryte straty (confirm dialog).
	 * Parent renderuje tylko gdy status === 'in-progress'.
	 */

	type BookingTent = {
		tentId: string;
		itemName: string;
		quantity: number;
	};

	interface Props {
		bookingTents: BookingTent[];
		leftZl: number;
		totalZl: number;
	}

	let { bookingTents, leftZl, totalZl }: Props = $props();

	function handleSubmit(e: SubmitEvent) {
		const fd = new FormData(e.currentTarget as HTMLFormElement);
		const losses: string[] = [];
		for (const bt of bookingTents) {
			const returned = Number(fd.get(`return_${bt.tentId}`) ?? bt.quantity);
			const lost = bt.quantity - returned;
			if (lost > 0) {
				losses.push(`${lost}× ${bt.itemName} (wydane ${bt.quantity}, wróciło ${returned})`);
			}
		}
		if (losses.length > 0) {
			const msg =
				'⚠️ WYKRYTE STRATY:\n\n' +
				losses.join('\n') +
				'\n\nNa pewno zapisujesz? Ta strata zostanie zapisana i możesz ją wykorzystać do obciążenia klienta.';
			if (!confirm(msg)) e.preventDefault();
		}
	}
</script>

<section class="card">
	<h2>📦 Zamknij event</h2>
	<form method="POST" action="?/returnBooking" class="op-form" onsubmit={handleSubmit}>
		<p class="op-hint">
			Event w trakcie. <strong>Zakończ + zwróć na magazyn</strong> — wpisz ile sztuk
			faktycznie wróciło (default = ile wydane). Różnica = strata.
		</p>
		{#if leftZl > 0}
			<div class="cash-reminder urgent">
				⚠️ <strong>Nieopłacone: {fmtZl(leftZl * 100)}</strong> — pobierz kasę przy odbiorze
				sprzętu albo dodaj płatność poniżej.
			</div>
		{:else if totalZl > 0}
			<div class="cash-reminder ok">✓ Opłacone w całości — można zamykać event.</div>
		{/if}
		{#if bookingTents.length > 0}
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
					{#each bookingTents as bt}
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
	.op-hint-small {
		margin: 0;
		font-size: 0.82rem;
		color: var(--mute, #777);
		font-style: italic;
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
	.cash-reminder.urgent {
		border-left-color: var(--wn-pomidor, #c04a3a);
		background: color-mix(in srgb, var(--wn-pomidor, #c04a3a) 12%, var(--paper, #f7f7f5));
	}
	.cash-reminder.ok {
		border-left-color: var(--wn-zielony, #2a8a4a);
		background: color-mix(in srgb, var(--wn-zielony, #2a8a4a) 14%, var(--paper, #f7f7f5));
		color: var(--wn-zielony-ink, #1a5a2e);
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
		border-bottom: 1px solid var(--line, #e0e0dd);
	}
	.return-table th {
		font-weight: 600;
		color: var(--mute, #777);
		font-size: 0.72rem;
		text-transform: uppercase;
	}
	.return-table .num {
		text-align: right;
	}
	.return-input {
		width: 70px;
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--line, #e0e0dd);
		text-align: right;
		font-family: var(--font-mono, ui-monospace, monospace);
		border-radius: 0;
	}
	.return-input:focus {
		outline: none;
		border-color: var(--wn-zielony, #2a8a4a);
	}
	.return-note-input {
		width: 100%;
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--line, #e0e0dd);
		font-family: inherit;
		font-size: 0.82rem;
		border-radius: 0;
	}
	.return-note-input:focus {
		outline: none;
		border-color: var(--wn-zielony, #2a8a4a);
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
	.btn-op.return {
		background: var(--wn-zielony, #2a8a4a);
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
