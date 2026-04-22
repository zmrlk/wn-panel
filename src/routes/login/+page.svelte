<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let mode = $state<'signin' | 'signup'>('signin');
	let email = $state('');
	let password = $state('');
	let name = $state('');
	let loading = $state(false);
	let error = $state('');

	async function submit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			if (mode === 'signin') {
				const { error: authError } = await authClient.signIn.email({
					email,
					password
				});
				if (authError) {
					error = authError.message ?? 'Niepoprawne dane logowania.';
					return;
				}
			} else {
				const { error: authError } = await authClient.signUp.email({
					email,
					password,
					name
				});
				if (authError) {
					error = authError.message ?? 'Rejestracja nie powiodła się.';
					return;
				}
			}
			await goto('/dashboard');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Coś poszło nie tak.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{mode === 'signin' ? 'Logowanie' : 'Rejestracja'} · Wolny Namiot</title>
</svelte:head>

<div class="shell">
	<div class="card">
		<header>
			<p class="brand">wolny namiot <span class="brand-dot">·</span> panel</p>
			<h1>{mode === 'signin' ? 'zaloguj się.' : 'załóż konto.'}</h1>
			<p class="hint">
				{#if mode === 'signin'}
					nie masz konta?
					<button type="button" class="link" onclick={() => (mode = 'signup')}>zarejestruj</button>
				{:else}
					masz już konto?
					<button type="button" class="link" onclick={() => (mode = 'signin')}>zaloguj</button>
				{/if}
			</p>
		</header>

		<form onsubmit={submit}>
			{#if mode === 'signup'}
				<label>
					<span>imię</span>
					<input type="text" bind:value={name} required placeholder="Denis" />
				</label>
			{/if}
			<label>
				<span>email</span>
				<input
					type="email"
					bind:value={email}
					required
					placeholder="denis@wolnynamiot.pl"
					autocomplete="email"
				/>
			</label>
			<label>
				<span>hasło</span>
				<input
					type="password"
					bind:value={password}
					required
					minlength="8"
					placeholder="min. 8 znaków"
					autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
				/>
			</label>

			{#if error}
				<div class="alert">{error}</div>
			{/if}

			<button type="submit" class="btn-primary" disabled={loading}>
				{loading ? 'chwila…' : mode === 'signin' ? 'zaloguj' : 'załóż konto'}
			</button>
		</form>

		<footer>
			<span class="ghost">🎪</span>
			<p class="foot">panel zarządzania wypożyczalnią. stawiaj co chcesz, rezerwuj jak chcesz.</p>
		</footer>
	</div>
</div>

<style>
	.shell {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 2rem 1rem;
		background:
			radial-gradient(ellipse at top left, var(--wn-granat-soft) 0%, transparent 50%),
			radial-gradient(ellipse at bottom right, var(--wn-zielony-soft) 0%, transparent 50%),
			var(--paper);
	}

	.card {
		width: 100%;
		max-width: 420px;
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--r-lg);
		padding: 2.5rem 2rem 2rem;
		box-shadow: var(--shadow-lg);
		position: relative;
		overflow: hidden;
	}

	header {
		margin-bottom: 1.5rem;
	}

	.brand {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--mute);
		margin: 0 0 0.5rem;
	}
	.brand-dot {
		color: var(--wn-pomidor);
	}

	h1 {
		font-family: var(--font-display);
		font-size: 2rem;
		font-style: italic;
		font-weight: 400;
		color: var(--ink);
		margin: 0 0 0.5rem;
		line-height: 1.1;
	}

	.hint {
		font-size: 0.88rem;
		color: var(--mute);
		margin: 0;
	}

	.link {
		background: none;
		border: none;
		color: var(--wn-granat);
		font: inherit;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.link:hover {
		color: var(--wn-granat-ink);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	label span {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--ink-2);
		text-transform: lowercase;
	}

	input {
		padding: 0.7rem 0.9rem;
		font-size: 0.95rem;
		font-family: var(--font-sans);
		border: 1px solid var(--line);
		border-radius: var(--r-md);
		background: var(--paper-2);
		color: var(--ink);
		transition: border-color var(--transition);
	}
	input:focus {
		border-color: var(--wn-granat);
		background: var(--card);
	}

	.btn-primary {
		margin-top: 0.5rem;
		padding: 0.8rem 1rem;
		font-size: 0.95rem;
		font-weight: 600;
		font-family: var(--font-sans);
		background: var(--wn-granat);
		color: var(--paper);
		border: none;
		border-radius: var(--r-md);
		cursor: pointer;
		transition: background var(--transition);
		text-transform: lowercase;
	}
	.btn-primary:hover:not(:disabled) {
		background: var(--wn-granat-ink);
	}
	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.alert {
		padding: 0.75rem 1rem;
		background: color-mix(in srgb, var(--wn-pomidor) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--wn-pomidor) 40%, transparent);
		border-radius: var(--r-md);
		color: var(--wn-pomidor);
		font-size: 0.88rem;
	}

	footer {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px dashed var(--line);
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.ghost {
		font-size: 1.75rem;
		opacity: 0.35;
	}

	.foot {
		font-size: 0.78rem;
		color: var(--mute);
		margin: 0;
		line-height: 1.5;
	}
</style>
