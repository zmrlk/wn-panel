<script lang="ts">
	import '$lib/styles/tokens.css';
	import '$lib/styles/ui.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';

	let { children } = $props();

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

{@render children()}

