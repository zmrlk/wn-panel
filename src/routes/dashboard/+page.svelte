<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let { data } = $props();

	async function logout() {
		await authClient.signOut();
		await goto('/login');
	}
</script>

<svelte:head>
	<title>Dashboard · Wolny Namiot panel</title>
</svelte:head>

<div class="shell">
	<header class="top">
		<div class="brand-row">
			<span class="brand">wolny namiot <span class="dot">·</span> panel</span>
			<button type="button" class="logout" onclick={logout}>wyloguj</button>
		</div>
		<h1>
			<span class="hello">cześć,</span>
			<span class="name">{data.user.name.toLowerCase()}.</span>
			<span class="ghost">🎪</span>
		</h1>
		<p class="sub">phase 0 smoke test — jeśli to widzisz, cały stack działa.</p>
	</header>

	<section class="stats">
		<div class="kpi">
			<span class="kpi-label">namioty</span>
			<span class="kpi-value">{data.stats.tents}</span>
			<span class="kpi-ghost">⛺</span>
		</div>
		<div class="kpi">
			<span class="kpi-label">klienci</span>
			<span class="kpi-value">{data.stats.clients}</span>
			<span class="kpi-ghost">👥</span>
		</div>
		<div class="kpi">
			<span class="kpi-label">rezerwacje</span>
			<span class="kpi-value">{data.stats.bookings}</span>
			<span class="kpi-ghost">📅</span>
		</div>
	</section>

	<section class="status">
		<h2>system status</h2>
		<ul>
			<li><span class="ok">✓</span> SvelteKit 2 + Svelte 5</li>
			<li><span class="ok">✓</span> PostgreSQL 16 (Docker)</li>
			<li><span class="ok">✓</span> Drizzle ORM — 10 tabel</li>
			<li><span class="ok">✓</span> Better Auth — zalogowano jako <code>{data.user.email}</code></li>
			<li><span class="ok">✓</span> Design system lift z VRS v2 + paleta WN + zielony</li>
		</ul>
	</section>

	<section class="next">
		<h2>next up</h2>
		<ol>
			<li>CRUD namiotów (<code>/tents</code>)</li>
			<li>CRUD klientów (<code>/clients</code>)</li>
			<li>Rezerwacje + kalendarz + conflict detection (<code>/bookings</code>)</li>
			<li>Galeria zdjęć z eventów (<code>/photos</code>)</li>
			<li>Cennik własny (<code>/pricing</code>)</li>
		</ol>
	</section>
</div>

<style>
	.shell {
		min-height: 100dvh;
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}

	.top {
		margin-bottom: 3rem;
	}

	.brand-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.brand {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--mute);
	}
	.dot {
		color: var(--wn-pomidor);
	}

	.logout {
		background: none;
		border: 1px solid var(--line);
		border-radius: var(--r-md);
		padding: 0.4rem 0.8rem;
		font-family: var(--font-sans);
		font-size: 0.85rem;
		color: var(--mute);
		cursor: pointer;
		transition: all var(--transition);
	}
	.logout:hover {
		border-color: var(--wn-granat);
		color: var(--wn-granat);
	}

	h1 {
		font-family: var(--font-display);
		font-size: clamp(2.25rem, 5vw, 3.25rem);
		font-weight: 400;
		margin: 0 0 0.5rem;
		line-height: 1.1;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem;
	}
	.hello {
		font-style: italic;
		color: var(--mute);
	}
	.name {
		font-style: italic;
		color: var(--ink);
	}
	.ghost {
		font-size: 0.7em;
		opacity: 0.25;
	}

	.sub {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		color: var(--mute);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 3rem;
	}

	.kpi {
		position: relative;
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--r-lg);
		padding: 1.5rem 1.5rem 1.25rem;
		overflow: hidden;
	}
	.kpi::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--color-pop-green);
		opacity: 0.6;
	}

	.kpi-label {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--mute);
		margin-bottom: 0.5rem;
	}

	.kpi-value {
		font-family: var(--font-hero);
		font-size: 2.5rem;
		color: var(--ink);
		line-height: 1;
	}

	.kpi-ghost {
		position: absolute;
		right: 0.75rem;
		bottom: 0.5rem;
		font-size: 3rem;
		opacity: 0.08;
	}

	.status,
	.next {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--r-lg);
		padding: 1.5rem 1.75rem;
		margin-bottom: 1.5rem;
	}

	h2 {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 400;
		font-size: 1.25rem;
		margin: 0 0 1rem;
		color: var(--ink);
	}

	ul,
	ol {
		margin: 0;
		padding-left: 1.25rem;
		font-size: 0.95rem;
		line-height: 1.9;
	}

	ul {
		list-style: none;
		padding-left: 0;
	}

	.ok {
		display: inline-block;
		color: var(--color-pop-green);
		font-weight: 700;
		margin-right: 0.5rem;
	}

	code {
		font-family: var(--font-mono);
		font-size: 0.85em;
		background: var(--paper-2);
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		color: var(--wn-granat);
	}
</style>
