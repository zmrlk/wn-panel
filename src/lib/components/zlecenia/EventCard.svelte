<script lang="ts">
	import { eventRange, daysCount } from '$lib/formatters';

	/**
	 * Sekcja "Event" w zlecenia detail page.
	 * Grid z 3-4 polami: termin, dni, gości (jeśli są), miejsce (klikalny link do Google Maps).
	 */

	type EventInfo = {
		name: string;
		startDate: string | null;
		endDate: string | null;
		venue: string | null;
		guestsCount: number | null;
	};

	interface Props {
		event: EventInfo;
	}

	let { event }: Props = $props();

	const mapsUrl = $derived(
		event.venue
			? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`
			: null
	);
</script>

<section class="card">
	<h2>Event</h2>
	<div class="event-grid">
		<div class="e-field">
			<span class="e-label">Termin</span>
			<span class="e-val">{eventRange(event.startDate, event.endDate)}</span>
		</div>
		<div class="e-field">
			<span class="e-label">Dni</span>
			<span class="e-val">{daysCount(event.startDate, event.endDate)}</span>
		</div>
		{#if event.guestsCount}
			<div class="e-field">
				<span class="e-label">Gości</span>
				<span class="e-val">{event.guestsCount}</span>
			</div>
		{/if}
		<div class="e-field">
			<span class="e-label">Miejsce</span>
			{#if event.venue && mapsUrl}
				<a class="e-val e-map-link" href={mapsUrl} target="_blank" rel="noopener" title="Otwórz w mapach">
					📍 {event.venue}
				</a>
			{:else}
				<span class="e-val">—</span>
			{/if}
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
	h2 {
		margin: 0 0 0.65rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--ink, #111);
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
		color: var(--mute, #777);
		font-family: var(--font-mono, ui-monospace, monospace);
	}
	.e-val {
		font-size: 0.95rem;
		color: var(--ink, #111);
		font-weight: 500;
	}
	.e-map-link {
		color: var(--wn-granat, #2a3a6a);
		text-decoration: none;
		font-weight: 500;
	}
	.e-map-link:hover {
		color: var(--wn-zielony, #2a8a4a);
		text-decoration: underline;
	}
</style>
