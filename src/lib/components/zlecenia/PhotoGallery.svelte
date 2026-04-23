<script lang="ts">
	/**
	 * Sekcja "Zdjęcia" — booking-only dokumentacja.
	 * Grid tiles (4:3 aspect) + upload form (camera capture dla mobile).
	 * Border color per-kind: damage=pomidor, delivery=zielony, return=granat.
	 *
	 * Actions: ?/uploadPhoto (multipart), ?/deletePhoto.
	 * Delete confirm dialog → preventDefault jeżeli anulowane.
	 */

	type Photo = {
		id: string;
		url: string;
		kind: string;
		caption: string | null;
		takenBy: string | null;
		takenByName: string | null;
		uploadedAt: Date;
	};

	interface Props {
		photos: Photo[];
	}

	let { photos }: Props = $props();

	function kindLabel(kind: string): string {
		if (kind === 'delivery') return '🚚 dostawa';
		if (kind === 'return') return '📦 odbiór';
		if (kind === 'damage') return '⚠️ uszkodzenie';
		return '📷 zdjęcie';
	}

	function confirmDelete(e: Event) {
		if (!confirm('Usunąć to zdjęcie?')) e.preventDefault();
	}
</script>

<section class="card">
	<div class="photos-header">
		<h3>📸 Zdjęcia ({photos.length})</h3>
		<span class="photos-hint-inline">dostawa · montaż · odbiór · uszkodzenia</span>
	</div>

	{#if photos.length > 0}
		<div class="photos-grid">
			{#each photos as p}
				<div class="photo-tile kind-{p.kind}">
					<a href={p.url} target="_blank" rel="noopener" class="photo-link">
						<img src={p.url} alt={p.caption ?? p.kind} loading="lazy" />
					</a>
					<div class="photo-meta">
						<span class="photo-kind">{kindLabel(p.kind)}</span>
						{#if p.caption}<span class="photo-caption">{p.caption}</span>{/if}
						{#if p.takenByName}<span class="photo-by">· {p.takenByName}</span>{/if}
					</div>
					<form method="POST" action="?/deletePhoto" class="photo-del-form">
						<input type="hidden" name="photoId" value={p.id} />
						<button
							type="submit"
							class="btn-photo-del"
							aria-label="Usuń"
							onclick={confirmDelete}
						>
							✕
						</button>
					</form>
				</div>
			{/each}
		</div>
	{:else}
		<p class="photos-empty">
			Brak zdjęć. Dodaj foto z telefonu ↓ (kamera włączy się od razu).
		</p>
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
</section>

<style>
	.card {
		background: var(--paper-2, #fff);
		border: 2px solid var(--ink, #111);
		border-radius: 8px;
		padding: 1rem 1.1rem;
		box-shadow: 3px 3px 0 var(--ink, #111);
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
		color: var(--ink, #111);
	}
	.photos-hint-inline {
		color: var(--mute, #777);
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
		background: var(--paper, #f7f7f5);
		border: 1px solid var(--line, #e0e0dd);
	}
	.photo-tile.kind-damage {
		border-color: var(--wn-pomidor, #c04a3a);
	}
	.photo-tile.kind-delivery {
		border-color: var(--wn-zielony, #2a8a4a);
	}
	.photo-tile.kind-return {
		border-color: var(--wn-granat, #2a3a6a);
	}
	.photo-link {
		display: block;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		background: var(--wn-atrament, #111);
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
		color: var(--ink, #111);
	}
	.photo-caption {
		color: var(--ink-2, #444);
	}
	.photo-by {
		color: var(--mute, #777);
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
	.btn-photo-del:hover {
		background: var(--wn-pomidor, #c04a3a);
	}
	.photos-empty {
		color: var(--mute, #777);
		font-style: italic;
		font-size: 0.88rem;
		padding: 0.5rem 0;
		margin: 0 0 1rem;
	}
	.photo-form {
		padding: 0.85rem;
		background: var(--paper, #f7f7f5);
		border: 1px dashed var(--line, #e0e0dd);
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
		color: var(--mute, #777);
		font-weight: 500;
	}
	.photo-field.wide {
		width: 100%;
	}
	.photo-field input[type='text'],
	.photo-field select {
		border: 1px solid var(--line, #e0e0dd);
		padding: 0.4rem 0.55rem;
		background: var(--paper-2, #fff);
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
		background: var(--wn-zielony, #2a8a4a);
		color: var(--wn-atrament, #111);
		border: 2px solid var(--wn-atrament, #111);
		border-radius: 0;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.92rem;
		box-shadow: 3px 3px 0 var(--wn-atrament, #111);
	}
	.btn-photo-upload:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--wn-atrament, #111);
	}

	@media (max-width: 720px) {
		.photo-form-row {
			grid-template-columns: 1fr;
		}
		.photos-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
