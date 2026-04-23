<script lang="ts">
	import { fmtZl } from '$lib/formatters';

	/**
	 * Sekcja "Płatność" — booking-only.
	 * - Pill status (opłacone / partial / brak)
	 * - Summary (total / zapłacone / zostało)
	 * - Quick-pay 1-click (dla obu ról — kierowca zbiera gotówkę, admin szybko)
	 * - Tabelka historii płatności (admin-only)
	 * - Form "Dodaj płatność" (admin-only)
	 *
	 * Widoczność: parent renderuje tylko gdy `type === 'booking'`.
	 * Delete confirm: preventDefault jeżeli anulowane.
	 */

	type Payment = {
		id: string;
		amountCents: number;
		method: string;
		kind: string;
		paidAt: string;
		receivedBy: string | null;
		notes: string | null;
	};

	interface Props {
		payments: Payment[];
		totalCents: number | null;
		paidCents: number;
		isAdmin: boolean;
	}

	let { payments, totalCents, paidCents, isAdmin }: Props = $props();

	const totalZl = $derived((totalCents ?? 0) / 100);
	const paidZl = $derived(paidCents / 100);
	const leftZl = $derived(Math.max(0, totalZl - paidZl));
	const paidPct = $derived(totalZl > 0 ? Math.round((paidZl / totalZl) * 100) : 0);
	const payStatus = $derived(
		paidZl >= totalZl && totalZl > 0 ? 'paid' : paidZl > 0 ? 'partial' : 'none'
	);
	const today = $derived(new Date().toISOString().slice(0, 10));

	function confirmDelete(e: Event) {
		if (!confirm('Usunąć tę płatność?')) e.preventDefault();
	}
</script>

<section class="card">
	<div class="pay-header">
		<h3>💰 Płatność</h3>
		<span class="pay-pill pay-{payStatus}">
			{#if payStatus === 'paid'}
				✓ Opłacone
			{:else if payStatus === 'partial'}
				½ {paidPct}% ({fmtZl(paidZl * 100)})
			{:else}
				✕ Brak płatności
			{/if}
		</span>
	</div>
	<div class="pay-summary">
		<div class="pay-stat"><span class="pay-lbl">Total:</span> <strong>{fmtZl(totalZl * 100)}</strong></div>
		<div class="pay-stat">
			<span class="pay-lbl">Zapłacone:</span> <strong class="pay-in">{fmtZl(paidZl * 100)}</strong>
		</div>
		<div class="pay-stat">
			<span class="pay-lbl">Zostało:</span>
			<strong class:pay-due={leftZl > 0}>{fmtZl(leftZl * 100)}</strong>
		</div>
	</div>

	{#if leftZl > 0}
		<!-- 1-click dla obu ról (kierowca zbiera gotówkę + admin szybko) -->
		<form method="POST" action="?/addPayment" class="pay-quick">
			<input type="hidden" name="amountZl" value={leftZl.toFixed(2)} />
			<input type="hidden" name="method" value="gotówka" />
			<input type="hidden" name="kind" value="pełna" />
			<input type="hidden" name="paidAt" value={today} />
			<button type="submit" class="btn-quick-pay">
				💵 Zapłacił gotówką ({fmtZl(leftZl * 100)})
			</button>
			{#if isAdmin}
				<span class="pay-quick-hint">lub pełne szczegóły ↓</span>
			{/if}
		</form>
	{/if}

	{#if isAdmin && payments.length > 0}
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
				{#each payments as p}
					<tr>
						<td class="mono">{p.paidAt}</td>
						<td class="num pay-amount">{fmtZl(p.amountCents)}</td>
						<td><span class="pay-method">{p.method}</span></td>
						<td class="mute">{p.kind}</td>
						<td class="mute">{p.notes ?? '—'}</td>
						<td class="actions">
							<form method="POST" action="?/deletePayment" style="display:inline;">
								<input type="hidden" name="paymentId" value={p.id} />
								<button type="submit" class="btn-del-pay" onclick={confirmDelete}>Usuń</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}

	{#if isAdmin && (leftZl > 0 || totalZl === 0 || payments.length === 0)}
		<form method="POST" action="?/addPayment" class="pay-form">
			<label class="pay-field">
				<span>Kwota (zł)</span>
				<input
					name="amountZl"
					type="number"
					step="0.01"
					min="0.01"
					value={leftZl > 0 ? leftZl.toFixed(2) : ''}
					placeholder="np. 1800"
					required
				/>
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
				<input name="paidAt" type="date" value={today} required />
			</label>
			<label class="pay-field wide">
				<span>Notatka (opcjonalnie)</span>
				<input name="notes" type="text" placeholder="np. zapłacone przy odbiorze" />
			</label>
			<button type="submit" class="btn-add-pay">+ Dodaj płatność</button>
		</form>
	{/if}
</section>

<style>
	.card {
		background: var(--paper-2, #fff);
		border: 2px solid var(--ink, #111);
		border-radius: 8px;
		padding: 1rem 1.1rem;
		box-shadow: 3px 3px 0 var(--ink, #111);
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
		color: var(--ink, #111);
	}
	.pay-pill {
		padding: 0.2rem 0.7rem;
		border: 1px solid var(--line, #e0e0dd);
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	.pay-pill.pay-paid {
		background: var(--wn-zielony, #2a8a4a);
		color: var(--wn-atrament, #111);
		border-color: var(--wn-atrament, #111);
	}
	.pay-pill.pay-partial {
		background: var(--wn-zarowka, #f4c430);
		color: var(--wn-atrament, #111);
		border-color: #8a6d00;
	}
	.pay-pill.pay-none {
		background: color-mix(in srgb, var(--wn-pomidor, #c04a3a) 15%, transparent);
		color: var(--wn-pomidor, #c04a3a);
		border-color: var(--wn-pomidor, #c04a3a);
	}
	.pay-summary {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
		padding: 0.85rem 1rem;
		background: var(--paper, #f7f7f5);
		border-left: 3px solid var(--wn-zielony, #2a8a4a);
		font-size: 0.9rem;
	}
	.pay-stat .pay-lbl {
		color: var(--mute, #777);
		font-size: 0.8rem;
		margin-right: 0.3rem;
	}
	.pay-stat strong {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.95rem;
	}
	.pay-stat .pay-in {
		color: var(--wn-zielony, #2a8a4a);
	}
	.pay-stat .pay-due {
		color: var(--wn-pomidor, #c04a3a);
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
		border-bottom: 1px solid var(--line, #e0e0dd);
	}
	.pay-table th {
		font-weight: 600;
		color: var(--mute, #777);
		font-size: 0.72rem;
		text-transform: uppercase;
	}
	.pay-table .num {
		text-align: right;
		font-family: var(--font-mono, ui-monospace, monospace);
	}
	.pay-table .mono {
		font-family: var(--font-mono, ui-monospace, monospace);
	}
	.pay-table .mute {
		color: var(--mute, #777);
	}
	.pay-table .actions {
		text-align: right;
	}
	.pay-amount {
		font-weight: 600;
		color: var(--wn-zielony, #2a8a4a);
	}
	.pay-method {
		padding: 0.1rem 0.4rem;
		background: var(--paper, #f7f7f5);
		border: 1px solid var(--line, #e0e0dd);
		font-size: 0.78rem;
	}
	.btn-del-pay {
		padding: 0.25rem 0.55rem;
		border: 1px solid transparent;
		background: transparent;
		color: var(--wn-pomidor, #c04a3a);
		cursor: pointer;
		font-size: 0.75rem;
	}
	.btn-del-pay:hover {
		border-color: var(--wn-pomidor, #c04a3a);
	}
	.pay-quick {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.85rem 1rem;
		background: color-mix(in srgb, var(--wn-zielony, #2a8a4a) 15%, var(--paper, #f7f7f5));
		border: 2px dashed var(--wn-zielony, #2a8a4a);
		margin-bottom: 0.85rem;
	}
	.btn-quick-pay {
		padding: 0.65rem 1.1rem;
		background: var(--wn-zielony, #2a8a4a);
		color: var(--wn-atrament, #111);
		border: 2px solid var(--wn-atrament, #111);
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		border-radius: 0;
		box-shadow: 3px 3px 0 var(--wn-atrament, #111);
	}
	.btn-quick-pay:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--wn-atrament, #111);
	}
	.pay-quick-hint {
		color: var(--mute, #777);
		font-size: 0.8rem;
		font-style: italic;
	}
	.pay-form {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.7rem;
		align-items: end;
		padding: 0.85rem;
		background: var(--paper, #f7f7f5);
		border: 1px dashed var(--line, #e0e0dd);
	}
	.pay-field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.pay-field > span {
		font-size: 0.7rem;
		color: var(--mute, #777);
		font-weight: 500;
	}
	.pay-field.wide {
		grid-column: 1 / -1;
	}
	.pay-field input,
	.pay-field select {
		border: 1px solid var(--line, #e0e0dd);
		padding: 0.4rem 0.55rem;
		background: var(--paper-2, #fff);
		font-family: inherit;
		font-size: 0.85rem;
		border-radius: 0;
	}
	.pay-field input:focus,
	.pay-field select:focus {
		outline: none;
		border-color: var(--wn-zielony, #2a8a4a);
	}
	.btn-add-pay {
		grid-column: 1 / -1;
		justify-self: end;
		padding: 0.55rem 1.15rem;
		background: var(--wn-zielony, #2a8a4a);
		color: var(--wn-atrament, #111);
		border: 2px solid var(--wn-atrament, #111);
		border-radius: 0;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		box-shadow: 3px 3px 0 var(--wn-atrament, #111);
	}
	.btn-add-pay:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--wn-atrament, #111);
	}
</style>
