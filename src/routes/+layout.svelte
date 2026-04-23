<script lang="ts">
	import '$lib/styles/tokens.css';
	import '$lib/styles/ui.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let { data, children } = $props();

	let switcherOpen = $state(false);

	async function switchTo(userId: string | null) {
		await fetch('/api/switch-user', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ userId })
		});
		switcherOpen = false;
		await invalidateAll();
		location.reload(); // reload żeby hooks.server przeładował locals.user
	}

	onMount(() => {
		const saved = localStorage.getItem('wn-theme') as 'light' | 'dark' | null;
		const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
		const theme = saved ?? (prefersDark ? 'dark' : 'light');
		document.documentElement.dataset.theme = theme;

		(window as typeof window & { toggleTheme?: () => void }).toggleTheme = () => {
			const current = document.documentElement.dataset.theme;
			const next = current === 'dark' ? 'light' : 'dark';
			document.documentElement.dataset.theme = next;
			localStorage.setItem('wn-theme', next);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- Preview user switcher (floating top-right, tylko gdy users.length > 1) -->
{#if data?.users && data.users.length > 1}
	<div class="wn-switcher">
		<button class="wn-switcher-btn" onclick={() => (switcherOpen = !switcherOpen)} title="Preview: przełącz jako inny user">
			👀 Jako: <strong>{data.currentUser?.name ?? 'anonymous'}</strong>
			<span class="wn-switcher-role">({data.currentUser?.role ?? '—'})</span>
			<span class="wn-switcher-caret">▾</span>
		</button>
		{#if switcherOpen}
			<div class="wn-switcher-menu" onclick={(e) => e.stopPropagation()} role="presentation">
				<p class="wn-switcher-hint">Demo mode. Po Keycloak SSO ten przełącznik zniknie.</p>
				{#each data.users as u}
					<button
						class="wn-switcher-item"
						class:active={data.currentUser?.id === u.id}
						onclick={() => switchTo(u.id)}
					>
						<span class="sw-name">{u.name}</span>
						<span class="sw-role">{u.role}</span>
						{#if u.skills && u.skills.length > 0}
							<span class="sw-skills">
								{u.skills.map((s) => s === 'driver' ? '🚚' : s === 'installer' ? '🔨' : s === 'lead' ? '👑' : '').join(' ')}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}

{@render children()}

<style>
	.wn-switcher {
		position: fixed;
		top: 0.5rem;
		right: 0.5rem;
		z-index: 1000;
		font-family: var(--font-sans, sans-serif);
	}
	.wn-switcher-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.65rem;
		background: var(--wn-atrament, #1a1d2e);
		color: var(--wn-plotno, #f5f1e8);
		border: 2px solid var(--wn-atrament, #1a1d2e);
		border-radius: 0;
		font-size: 0.75rem;
		cursor: pointer;
		font-family: inherit;
		box-shadow: 2px 2px 0 var(--wn-zarowka, #f5d35c);
	}
	.wn-switcher-btn:hover {
		transform: translate(-1px, -1px);
		box-shadow: 3px 3px 0 var(--wn-zarowka, #f5d35c);
	}
	.wn-switcher-role {
		opacity: 0.6;
		font-size: 0.7rem;
	}
	.wn-switcher-caret {
		font-size: 0.65rem;
	}
	.wn-switcher-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.3rem;
		background: var(--paper, #fff);
		border: 2px solid var(--wn-atrament, #1a1d2e);
		box-shadow: 4px 4px 0 var(--wn-atrament, #1a1d2e);
		min-width: 240px;
		max-height: 70vh;
		overflow-y: auto;
	}
	.wn-switcher-hint {
		margin: 0;
		padding: 0.55rem 0.7rem;
		background: var(--paper-2, #f0ece0);
		border-bottom: 1px solid var(--line, #ddd);
		font-size: 0.7rem;
		color: var(--mute, #888);
		font-style: italic;
	}
	.wn-switcher-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.7rem;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--line, #eee);
		cursor: pointer;
		font-family: inherit;
		font-size: 0.85rem;
		text-align: left;
	}
	.wn-switcher-item:hover {
		background: var(--paper-2, #f0ece0);
	}
	.wn-switcher-item.active {
		background: var(--wn-zielony, #3ab68d);
		color: var(--wn-atrament, #1a1d2e);
		font-weight: 600;
	}
	.sw-name {
		flex: 1;
	}
	.sw-role {
		font-size: 0.7rem;
		opacity: 0.65;
		padding: 0.05rem 0.3rem;
		border: 1px solid currentColor;
	}
	.sw-skills {
		font-size: 0.9rem;
	}

	@media print {
		.wn-switcher { display: none; }
	}
</style>
