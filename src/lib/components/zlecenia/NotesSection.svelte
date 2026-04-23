<script lang="ts">
	/**
	 * Sekcja "Notatki wewnętrzne" — add note form + lista notatek.
	 * Notatki są append-only, timestamped w server action.
	 * Format entry: `[2026-05-15 14:30 · Karol] Treść notatki` (z server).
	 *
	 * State `addingNote` + `newNote` lokalny w komponencie ($state runes).
	 */

	interface Props {
		/** Raw notes string z DB (separator `\n\n` między wpisami) */
		notes: string | null;
	}

	let { notes }: Props = $props();

	let addingNote = $state(false);
	let newNote = $state('');

	function cancelAdd() {
		addingNote = false;
		newNote = '';
	}
</script>

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
			></textarea>
			<div class="note-actions">
				<button type="button" class="btn-ghost-sm" onclick={cancelAdd}>Anuluj</button>
				<button type="submit" class="btn-primary-sm">Zapisz notatkę</button>
			</div>
		</form>
	{/if}
	<div class="notes-list">
		{#if notes}
			{#each notes.split('\n\n') as noteChunk}
				<div class="note-entry">{noteChunk}</div>
			{/each}
		{:else}
			<p class="empty-note">— brak notatek —</p>
		{/if}
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
	.notes-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.85rem;
	}
	.notes-head h2 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--ink, #111);
	}
	.btn-ghost-sm {
		padding: 0.35rem 0.75rem;
		background: transparent;
		border: 1px solid var(--line, #e0e0dd);
		border-radius: 5px;
		font-size: 0.78rem;
		color: var(--ink-2, #444);
		cursor: pointer;
	}
	.btn-ghost-sm:hover {
		border-color: var(--wn-zielony, #2a8a4a);
		color: var(--wn-zielony-ink, #1a5a2e);
	}
	.btn-primary-sm {
		padding: 0.35rem 0.9rem;
		background: var(--wn-zielony, #2a8a4a);
		color: var(--wn-plotno, #f7f7f5);
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
		border: 1px solid var(--line, #e0e0dd);
		border-radius: 6px;
		font-family: var(--font-sans, system-ui);
		font-size: 0.9rem;
		background: var(--paper-2, #fff);
		color: var(--ink, #111);
		resize: vertical;
	}
	.note-form textarea:focus {
		outline: none;
		border-color: var(--wn-zielony, #2a8a4a);
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
		background: var(--paper, #f7f7f5);
		border-left: 3px solid var(--wn-zielony, #2a8a4a);
		border-radius: 0 6px 6px 0;
		font-size: 0.88rem;
		color: var(--ink-2, #444);
		line-height: 1.55;
		white-space: pre-wrap;
	}
	.empty-note {
		color: var(--dim, #999);
		font-style: italic;
	}
</style>
