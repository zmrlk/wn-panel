<script lang="ts">
	import { fmtDateTime } from '$lib/formatters';

	/**
	 * Timeline "Przebieg" dla zlecenia detail page.
	 * Bierze gotowe eventy (pre-computed w +page.svelte / builder) i renderuje.
	 */

	type TimelineItem = {
		label: string;
		date: Date | null;
		emoji: string;
		kind: string;
		note: string | null;
		done: boolean;
	};

	interface Props {
		timeline: TimelineItem[];
	}

	let { timeline }: Props = $props();
</script>

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

<style>
	.card {
		background: var(--paper-2, #fff);
		border-radius: 8px;
		padding: 1rem;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}
	h2 {
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
		color: var(--ink, #111);
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
		background: var(--paper, #f7f7f5);
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
		color: var(--mute, #777);
		font-style: italic;
	}
	.t-emoji {
		font-size: 1.1rem;
	}
	.t-label {
		color: var(--ink, #111);
		font-weight: 500;
	}
	.t-date {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.75rem;
		color: var(--mute, #777);
	}
</style>
