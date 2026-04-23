<script lang="ts">
	/**
	 * Sekcja "Zespół realizujący" — booking-only.
	 * Lista przypisanych users (kierowca/montaż/lider) + form żeby przypisać kolejnego.
	 *
	 * Actions: ?/assignUser (form submit), ?/unassignUser (per-member form).
	 * Unassign confirm dialog → jeżeli anulowane, preventDefault.
	 */

	type Assignment = {
		id: string;
		userId: string;
		userName: string;
		task: string;
		notes: string | null;
	};

	type AvailableUser = {
		id: string;
		name: string;
		skills: string[];
	};

	interface Props {
		assignments: Assignment[];
		availableUsers: AvailableUser[];
	}

	let { assignments, availableUsers }: Props = $props();

	const SKILL_EMOJI: Record<string, string> = {
		driver: '🚚',
		installer: '🔨',
		lead: '👑'
	};

	function skillsLabel(skills: string[]): string {
		if (skills.length === 0) return '';
		const emojis = skills.map((s) => SKILL_EMOJI[s] ?? s).join(' ');
		return ` (${emojis})`;
	}

	function taskLabel(task: string): string {
		if (task === 'driver') return '🚚 kierowca';
		if (task === 'installer') return '🔨 montażysta';
		if (task === 'lead') return '👑 lider';
		return task;
	}

	function confirmUnassign(userName: string, e: Event) {
		if (!confirm(`Usunąć ${userName} z zespołu?`)) e.preventDefault();
	}
</script>

<section class="card">
	<div class="team-header">
		<h3>👥 Zespół realizujący ({assignments.length})</h3>
	</div>
	{#if assignments.length > 0}
		<div class="team-list">
			{#each assignments as a}
				<div class="team-member">
					<span class="member-avatar">{a.userName.charAt(0).toUpperCase()}</span>
					<div class="member-info">
						<strong>{a.userName}</strong>
						<span class="member-task">{taskLabel(a.task)}</span>
					</div>
					<form method="POST" action="?/unassignUser" style="display:inline;">
						<input type="hidden" name="assignmentId" value={a.id} />
						<button
							type="submit"
							class="btn-unassign"
							onclick={(e) => confirmUnassign(a.userName, e)}
						>
							✕
						</button>
					</form>
				</div>
			{/each}
		</div>
	{:else}
		<p class="team-empty">Jeszcze nikt nie przypisany. Dobierz zespół poniżej.</p>
	{/if}

	<form method="POST" action="?/assignUser" class="team-form">
		<label class="team-field">
			<span>Osoba</span>
			<select name="userId" required>
				<option value="">— wybierz —</option>
				{#each availableUsers as u}
					<option value={u.id}>{u.name}{skillsLabel(u.skills)}</option>
				{/each}
			</select>
		</label>
		<label class="team-field">
			<span>Rola</span>
			<select name="task">
				<option value="driver">🚚 Kierowca</option>
				<option value="installer">🔨 Montażysta</option>
				<option value="lead">👑 Lider ekipy</option>
				<option value="other">Inne</option>
			</select>
		</label>
		<label class="team-field wide">
			<span>Notatka (opcjonalnie)</span>
			<input name="notes" type="text" placeholder="np. auto + przyczepa, wozi namiot 6×12" />
		</label>
		<button type="submit" class="btn-assign">+ Przypisz</button>
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
	.team-header h3 {
		margin: 0 0 0.85rem;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--ink, #111);
	}
	.team-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.team-member {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.55rem 0.85rem;
		background: var(--paper, #f7f7f5);
		border: 1px solid var(--line, #e0e0dd);
	}
	.member-avatar {
		width: 32px;
		height: 32px;
		background: var(--wn-atrament, #111);
		color: var(--wn-plotno, #f7f7f5);
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 0.85rem;
	}
	.member-info {
		flex: 1;
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
	}
	.member-info strong {
		font-size: 0.95rem;
		color: var(--ink, #111);
	}
	.member-task {
		font-size: 0.82rem;
		color: var(--mute, #777);
	}
	.btn-unassign {
		padding: 0.3rem 0.55rem;
		border: 1px solid transparent;
		background: transparent;
		color: var(--wn-pomidor, #c04a3a);
		cursor: pointer;
		font-size: 0.9rem;
	}
	.btn-unassign:hover {
		border-color: var(--wn-pomidor, #c04a3a);
	}
	.team-empty {
		color: var(--mute, #777);
		font-style: italic;
		font-size: 0.88rem;
		padding: 0.5rem 0;
		margin: 0 0 1rem;
	}
	.team-form {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.7rem;
		align-items: end;
		padding: 0.85rem;
		background: var(--paper, #f7f7f5);
		border: 1px dashed var(--line, #e0e0dd);
	}
	.team-field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.team-field > span {
		font-size: 0.7rem;
		color: var(--mute, #777);
		font-weight: 500;
	}
	.team-field.wide {
		grid-column: 1 / -1;
	}
	.team-field input,
	.team-field select {
		border: 1px solid var(--line, #e0e0dd);
		padding: 0.4rem 0.55rem;
		background: var(--paper-2, #fff);
		font-family: inherit;
		font-size: 0.85rem;
		border-radius: 0;
	}
	.team-field input:focus,
	.team-field select:focus {
		outline: none;
		border-color: var(--wn-zielony, #2a8a4a);
	}
	.btn-assign {
		grid-column: 1 / -1;
		justify-self: end;
		padding: 0.5rem 1.15rem;
		background: var(--wn-zielony, #2a8a4a);
		color: var(--wn-atrament, #111);
		border: 2px solid var(--wn-atrament, #111);
		border-radius: 0;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		box-shadow: 3px 3px 0 var(--wn-atrament, #111);
	}
	.btn-assign:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--wn-atrament, #111);
	}
</style>
