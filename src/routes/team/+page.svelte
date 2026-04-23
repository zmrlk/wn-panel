<script lang="ts">
	import SidebarRail from '$lib/components/SidebarRail.svelte';
	let { data } = $props();

	const ICONS: Record<string, string> = {
		dashboard: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9ZM9 22V12h6v10',
		zlecenia: 'M22 12h-4l-3 9L9 3l-3 9H2',
		tents: 'M3 20 L12 4 L21 20 Z M8 20 L12 13 L16 20',
		team: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
		settings: 'M20 7h-9 M14 17H5 M17 14a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z M7 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z'
	};

	function fmtDate(iso: string) {
		return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', weekday: 'short' });
	}
	function daysFromToday(iso: string) {
		const target = new Date(iso);
		target.setHours(0, 0, 0, 0);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const diff = Math.floor((target.getTime() - today.getTime()) / 86400000);
		if (diff === 0) return 'dziś';
		if (diff === 1) return 'jutro';
		if (diff === -1) return 'wczoraj';
		if (diff < 0) return `${-diff}d temu`;
		return `za ${diff}d`;
	}
	function taskLabel(task: string) {
		if (task === 'driver') return '🚚 kierowca';
		if (task === 'installer') return '🔨 montażysta';
		if (task === 'lead') return '👑 lider';
		return task;
	}
	function skillEmoji(skills: string[]) {
		return skills.map((s) => (s === 'driver' ? '🚚' : s === 'installer' ? '🔨' : s === 'lead' ? '👑' : '')).join(' ');
	}
</script>

<svelte:head>
	<title>Zespół · Wolny Namiot panel</title>
</svelte:head>

<div class="app">
	<SidebarRail activeId="team" isAdmin={true} userName={data.user.name} userEmail={data.user.email} />

	<main class="main">
		<header class="topbar">
			<div class="top-left">
				<h1>Zespół</h1>
				<span class="top-date">grafik pracy · ostatnie 7 dni + 30 dni do przodu</span>
			</div>
			<div class="top-right">
				{#if data.conflicts.length > 0}
					<span class="conflict-badge">⚠️ {data.conflicts.length} konfliktów</span>
				{/if}
			</div>
		</header>

		<div class="content">
			{#if data.conflicts.length > 0}
				<div class="conflict-banner">
					<strong>⚠️ Konflikty grafikowe:</strong> pracownicy przypisani do 2+ eventów w tym samym dniu.
					<ul>
						{#each data.conflicts as c}
							{@const u = data.team.find((t) => t.user.id === c.userId)?.user}
							<li>
								<strong>{u?.name ?? '—'}</strong> — {fmtDate(c.date)}:
								{c.events.map((e) => e.eventName).join(' + ')}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#each data.team as t}
				<section class="user-block">
					<header class="ub-head">
						<div class="ub-identity">
							<span class="ub-avatar">{t.user.name.charAt(0).toUpperCase()}</span>
							<div>
								<h2 class="ub-name">{t.user.name}</h2>
								<div class="ub-meta">
									<span class="ub-role role-{t.user.role}">{t.user.role}</span>
									{#if t.user.skills && t.user.skills.length > 0}
										<span class="ub-skills">{skillEmoji(t.user.skills)}</span>
									{/if}
								</div>
							</div>
						</div>
						<div class="ub-stats">
							<div class="ub-stat">
								<span class="s-num">{t.todayCount}</span>
								<span class="s-lbl">dziś</span>
							</div>
							<div class="ub-stat">
								<span class="s-num">{t.upcomingCount}</span>
								<span class="s-lbl">zaplanowane</span>
							</div>
						</div>
					</header>

					{#if t.assignments.length === 0}
						<p class="ub-empty">Brak przypisań w tym zakresie.</p>
					{:else}
						<div class="ub-cards">
							{#each t.assignments as a}
								{@const isToday = a.startDate <= data.todayIso && a.endDate >= data.todayIso}
								{@const isPast = a.endDate < data.todayIso}
								<a
									href={`/zlecenia/booking-${a.bookingId}`}
									class="a-card"
									class:today={isToday}
									class:past={isPast}
									class:status-done={a.status === 'done'}
								>
									<div class="ac-when">
										<span class="ac-date">{fmtDate(a.startDate)}</span>
										<span class="ac-rel">{daysFromToday(a.startDate)}</span>
									</div>
									<div class="ac-body">
										<strong class="ac-name">{a.eventName}</strong>
										<span class="ac-task">{taskLabel(a.task)}</span>
										{#if a.venue}<span class="ac-venue">📍 {a.venue}</span>{/if}
										{#if a.clientName}<span class="ac-client">👤 {a.clientName}</span>{/if}
									</div>
									<div class="ac-status">
										{#if a.status === 'confirmed'}Potwierdz.
										{:else if a.status === 'in-progress'}🚚 W real.
										{:else if a.status === 'done'}✓ Gotowe
										{:else if a.status === 'draft'}Szkic
										{:else}{a.status}{/if}
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	</main>
</div>

<style>
	.app {
		display: grid;
		grid-template-columns: 72px 1fr;
		min-height: 100dvh;
		font-family: var(--font-sans);
		background: var(--paper);
	}
	.rail {
		background: var(--nav-bg);
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100dvh;
		position: sticky;
		top: 0;
	}
	.logo {
		display: grid;
		place-items: center;
		height: 64px;
		width: 100%;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		text-decoration: none;
	}
	.logo-mark {
		width: 34px;
		height: 34px;
		background: var(--wn-plotno);
		color: var(--wn-atrament);
		border-radius: 8px;
		display: grid;
		place-items: center;
		font-weight: 700;
	}
	.rail-nav {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.65rem 0;
		gap: 2px;
		width: 100%;
	}
	.rail-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		width: 58px;
		padding: 0.55rem 0;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.45);
		text-decoration: none;
	}
	.rail-item svg { width: 20px; height: 20px; }
	.rail-label { font-size: 0.62rem; font-weight: 600; }
	.rail-item.active { background: rgba(255, 255, 255, 0.08); color: var(--wn-plotno); }
	.rail-item:hover { color: var(--wn-plotno); }
	.rail-sep {
		width: 40px;
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
		margin: 0.5rem 0;
	}

	.main { display: flex; flex-direction: column; min-width: 0; }
	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem max(1.5rem, calc((100% - 1600px) / 2));
		border-bottom: 1px solid var(--line);
		background: var(--paper);
	}
	.top-left { display: flex; align-items: baseline; gap: 1rem; }
	h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
	.top-date { color: var(--mute); font-size: 0.82rem; }
	.conflict-badge {
		padding: 0.3rem 0.75rem;
		background: color-mix(in srgb, var(--wn-pomidor) 15%, transparent);
		color: var(--wn-pomidor);
		border: 1px solid var(--wn-pomidor);
		font-size: 0.82rem;
		font-weight: 600;
	}

	.content {
		padding: 1.25rem max(1.5rem, calc((100% - 1600px) / 2)) 3rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.conflict-banner {
		padding: 0.85rem 1.1rem;
		background: color-mix(in srgb, var(--wn-pomidor) 12%, var(--paper));
		border: 2px solid var(--wn-pomidor);
		box-shadow: 3px 3px 0 var(--wn-pomidor);
		font-size: 0.88rem;
	}
	.conflict-banner ul { margin: 0.4rem 0 0; padding-left: 1.2rem; }
	.conflict-banner li { margin: 0.2rem 0; }

	.user-block {
		background: var(--paper);
		border: 1px solid var(--line);
		padding: 1.25rem 1.5rem;
	}
	.ub-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.9rem;
		flex-wrap: wrap;
	}
	.ub-identity {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.ub-avatar {
		width: 44px;
		height: 44px;
		background: var(--wn-atrament);
		color: var(--wn-plotno);
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 1.15rem;
	}
	.ub-name { margin: 0; font-size: 1.15rem; }
	.ub-meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-top: 0.15rem;
		font-size: 0.82rem;
	}
	.ub-role {
		padding: 0.05rem 0.45rem;
		background: var(--paper-2);
		border: 1px solid var(--line);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		text-transform: uppercase;
	}
	.ub-role.role-admin {
		background: var(--wn-zarowka);
		border-color: var(--wn-atrament);
	}
	.ub-skills { font-size: 0.95rem; }

	.ub-stats {
		display: flex;
		gap: 1.25rem;
	}
	.ub-stat {
		text-align: center;
		min-width: 60px;
	}
	.s-num {
		display: block;
		font-family: var(--font-mono);
		font-size: 1.45rem;
		font-weight: 800;
		color: var(--wn-zielony-ink);
		line-height: 1;
	}
	.s-lbl {
		display: block;
		font-size: 0.7rem;
		color: var(--mute);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin-top: 0.15rem;
	}

	.ub-empty {
		color: var(--mute);
		font-style: italic;
		font-size: 0.9rem;
		margin: 0.3rem 0 0;
	}

	.ub-cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 0.7rem;
	}
	.a-card {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.75rem;
		padding: 0.7rem 0.85rem;
		background: var(--paper);
		border: 2px solid var(--line);
		text-decoration: none;
		color: var(--ink);
		font-size: 0.85rem;
		transition: transform 0.1s, box-shadow 0.1s, border-color 0.1s;
		align-items: start;
	}
	.a-card:hover {
		transform: translate(-1px, -1px);
		box-shadow: 3px 3px 0 var(--wn-atrament);
		border-color: var(--wn-atrament);
	}
	.a-card.today {
		border-color: var(--wn-zielony);
		background: color-mix(in srgb, var(--wn-zielony) 10%, var(--paper));
	}
	.a-card.past {
		opacity: 0.55;
	}
	.a-card.status-done .ac-status {
		color: var(--wn-zielony-ink);
	}
	.ac-when {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-width: 58px;
	}
	.ac-date {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		font-weight: 700;
	}
	.ac-rel {
		font-size: 0.7rem;
		color: var(--mute);
	}
	.ac-body {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}
	.ac-name {
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.ac-task, .ac-venue, .ac-client {
		font-size: 0.75rem;
		color: var(--mute);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.ac-status {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.15rem 0.4rem;
		background: var(--paper-2);
		border: 1px solid var(--line);
		font-weight: 600;
		white-space: nowrap;
		align-self: flex-start;
	}

	@media (max-width: 720px) {
		.app { grid-template-columns: 1fr; padding-bottom: 60px; }
		.rail {
			position: fixed;
			bottom: 0;
			top: auto;
			left: 0;
			right: 0;
			height: 60px;
			width: 100%;
			flex-direction: row;
		}
		.logo { display: none; }
		.rail-nav {
			flex-direction: row;
			padding: 0;
			flex: 1;
			justify-content: space-around;
		}
		.rail-sep { display: none; }
		.ub-cards { grid-template-columns: 1fr; }
	}
</style>
