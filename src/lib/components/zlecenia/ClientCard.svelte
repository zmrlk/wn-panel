<script lang="ts">
	import { fmtZl } from '$lib/formatters';

	/**
	 * Sekcja "Klient" w zlecenia detail page.
	 * Header ma po prawej stronie "Wartość" (zielony sticker) jeżeli totalCents > 0.
	 * Kontakty telefon/email są klikalne (tel:/mailto:).
	 */

	type ClientInfo = {
		id?: string | null;
		name: string;
		company?: string | null;
		phone?: string | null;
		email?: string | null;
		address?: string | null;
	} | null;

	interface Props {
		client: ClientInfo;
		totalCents: number | null;
		/** Skąd przyszedł lead (np. "form / wolnynamiot.pl") */
		source?: string | null;
	}

	let { client, totalCents, source = null }: Props = $props();
</script>

<section class="card">
	<div class="client-header">
		<h2>Klient</h2>
		{#if totalCents && totalCents > 0}
			<div class="client-value">
				<span class="cv-label">Wartość</span>
				<span class="cv-amount">{fmtZl(totalCents)}</span>
			</div>
		{/if}
	</div>
	<div class="client-block">
		<div class="c-name-row">
			<span class="c-name">{client?.name ?? '—'}</span>
			{#if client?.company}<span class="c-company">{client.company}</span>{/if}
			{#if source}<span class="source-chip">źródło: {source}</span>{/if}
		</div>
		<div class="c-contact">
			{#if client?.phone}<a href={`tel:${client.phone}`}>📞 {client.phone}</a>{/if}
			{#if client?.email}<a href={`mailto:${client.email}`}>✉️ {client.email}</a>{/if}
			{#if client?.address}<span>📍 {client.address}</span>{/if}
		</div>
	</div>
</section>

<style>
	.card {
		background: var(--paper-2, #fff);
		border: 2px solid var(--ink, #111);
		border-radius: 8px;
		padding: 1rem 1.1rem;
		box-shadow: 3px 3px 0 var(--ink, #111);
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
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--ink, #111);
	}
	.client-value {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		padding: 0.45rem 0.85rem;
		background: var(--paper, #f7f7f5);
		border-left: 3px solid var(--wn-zielony, #2a8a4a);
	}
	.cv-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		color: var(--mute, #777);
		letter-spacing: 0.04em;
	}
	.cv-amount {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 1.85rem;
		line-height: 1;
		font-weight: 800;
		color: var(--wn-zielony-ink, #1a5a2e);
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
		color: var(--ink, #111);
	}
	.c-company {
		color: var(--ink-2, #444);
	}
	.source-chip {
		padding: 0.15rem 0.5rem;
		background: var(--paper, #f7f7f5);
		border-radius: 4px;
		font-size: 0.72rem;
		font-family: var(--font-mono, ui-monospace, monospace);
		color: var(--mute, #777);
	}
	.c-contact {
		display: flex;
		gap: 1rem;
		font-size: 0.88rem;
		flex-wrap: wrap;
	}
	.c-contact a {
		color: var(--wn-granat, #2a3a6a);
		text-decoration: none;
	}
	.c-contact a:hover {
		text-decoration: underline;
	}
</style>
