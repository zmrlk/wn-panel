<script lang="ts">
	/**
	 * Shared sidebar rail dla całego panelu.
	 * - Logo + nav items + admin section + foot (theme, avatar, logout)
	 * - Filter per-role: admin ma wszystkie linki, pracownik tylko dashboard
	 * - Mobile (@media 720px): bottom bar fixed, tylko ikony + label
	 *
	 * Przedtem: 7 plików duplikat ~40 linii. Po: 1 źródło prawdy.
	 */
	import {
		NAV_ICONS,
		NAV_ITEMS,
		ADMIN_NAV_ITEMS,
		filterNavForRole,
		type NavIconKey
	} from '$lib/constants/icons';

	interface Props {
		/** Aktywna pozycja — pokolorowana + indicator */
		activeId: NavIconKey;
		/** Rola — pracownik widzi tylko dashboard, admin pełny set */
		isAdmin: boolean;
		/** Dla avatar letter + logout tooltip */
		userName?: string;
		userEmail?: string | null;
	}

	let { activeId, isAdmin, userName = '?', userEmail }: Props = $props();

	// Filter per-role — pure logic w constants/icons.ts (testable)
	const visibleItems = $derived(filterNavForRole(NAV_ITEMS, isAdmin));

	function toggleTheme() {
		const w = window as typeof window & { toggleTheme?: () => void };
		w.toggleTheme?.();
	}
</script>

<aside class="rail">
	<a href="/" class="logo">
		<span class="logo-mark">wn</span>
	</a>

	<nav class="rail-nav">
		{#each visibleItems as item}
			<a href={item.href} class="rail-item" class:active={item.id === activeId}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
					<path d={NAV_ICONS[item.id]} />
				</svg>
				<span class="rail-label">{item.label}</span>
				{#if item.id === activeId}<div class="rail-indicator"></div>{/if}
			</a>
		{/each}

		{#if isAdmin}
			<div class="rail-sep"></div>
			{#each ADMIN_NAV_ITEMS as item}
				<a href={item.href} class="rail-item" class:active={item.id === activeId}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
						<path d={NAV_ICONS[item.id]} />
					</svg>
					<span class="rail-label">{item.label}</span>
				</a>
			{/each}
		{/if}
	</nav>

	<div class="rail-foot">
		<button class="theme-btn" type="button" aria-label="Przełącz motyw" onclick={toggleTheme}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
			</svg>
		</button>
		<a href="/profile" class="avatar-link" title={userEmail ?? userName}>
			<span class="avatar">{userName.charAt(0).toUpperCase()}</span>
		</a>
		<a href="/auth/logout" class="logout-link">Wyloguj</a>
	</div>
</aside>

<style>
	.rail {
		background: var(--nav-bg, #1a1d2e);
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100dvh;
		position: sticky;
		top: 0;
		width: 72px;
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
		font-size: 0.85rem;
		letter-spacing: -0.02em;
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
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		width: 58px;
		padding: 0.55rem 0;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.45);
		text-decoration: none;
		transition: color 0.12s, background 0.12s;
	}
	.rail-item svg {
		width: 20px;
		height: 20px;
	}
	.rail-label {
		font-size: 0.62rem;
		font-weight: 600;
	}
	.rail-item.active {
		background: rgba(255, 255, 255, 0.08);
		color: var(--wn-plotno);
	}
	.rail-item:hover {
		color: var(--wn-plotno);
	}
	.rail-indicator {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 3px;
		height: 22px;
		background: var(--wn-zielony);
		border-radius: 0 2px 2px 0;
	}
	.rail-sep {
		width: 40px;
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
		margin: 0.5rem 0;
	}

	.rail-foot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 0;
		width: 100%;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}
	.theme-btn {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.45);
		cursor: pointer;
		padding: 0.25rem;
	}
	.theme-btn svg {
		width: 18px;
		height: 18px;
	}
	.theme-btn:hover {
		color: var(--wn-plotno);
	}
	.avatar-link {
		text-decoration: none;
	}
	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--wn-zielony);
		color: var(--wn-atrament);
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 0.85rem;
	}
	.logout-link {
		font-size: 0.62rem;
		color: rgba(255, 255, 255, 0.45);
		text-decoration: none;
	}
	.logout-link:hover {
		color: var(--wn-plotno);
	}

	/* Mobile: bottom bar fixed */
	@media (max-width: 720px) {
		.rail {
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			top: auto;
			height: 60px;
			width: 100%;
			flex-direction: row;
			border-top: 1px solid rgba(255, 255, 255, 0.08);
			z-index: 50;
		}
		.logo {
			display: none;
		}
		.rail-nav {
			flex-direction: row;
			padding: 0;
			flex: 1;
			justify-content: space-around;
			gap: 0;
		}
		.rail-item {
			width: auto;
			padding: 0.4rem 0.5rem;
		}
		.rail-indicator {
			top: 0;
			left: 50%;
			transform: translateX(-50%);
			width: 28px;
			height: 2px;
			border-radius: 0 0 2px 2px;
		}
		.rail-sep,
		.rail-foot {
			display: none;
		}
	}
</style>
