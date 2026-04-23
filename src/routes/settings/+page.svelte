<script lang="ts">
	import SidebarRail from '$lib/components/SidebarRail.svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	let { data, form } = $props();

	type SettingsTab = 'company' | 'contacts' | 'offers' | 'templates' | 'users';
	const TABS = [
		{ id: 'company' as SettingsTab, label: 'Firma' },
		{ id: 'contacts' as SettingsTab, label: 'Kontakty' },
		{ id: 'offers' as SettingsTab, label: 'Numeracja' },
		{ id: 'templates' as SettingsTab, label: 'Szablony email' },
		{ id: 'users' as SettingsTab, label: 'Użytkownicy' }
	] as const;
	const VALID_TABS: SettingsTab[] = ['company', 'contacts', 'offers', 'templates', 'users'];
	const initialTab = (page.url.searchParams.get('tab') as SettingsTab) || 'company';
	let activeTab = $state<SettingsTab>(VALID_TABS.includes(initialTab) ? initialTab : 'company');
	let editingUserId = $state<string | null>(null);

	function setTab(t: SettingsTab) {
		activeTab = t;
		const url = new URL(page.url);
		if (t === 'company') url.searchParams.delete('tab');
		else url.searchParams.set('tab', t);
		replaceState(url.pathname + url.search, {});
	}

	const TEMPLATE_KEYS = ['thank_you', 'offer_sent', 'booking_confirmed', 'event_reminder'] as const;
	const TEMPLATE_LABELS: Record<string, string> = {
		thank_you: '🙏 Dziękujemy za kontakt (po leadzie)',
		offer_sent: '📤 Wysłanie oferty (z linkiem do PDF)',
		booking_confirmed: '✅ Potwierdzenie rezerwacji',
		event_reminder: '⏰ Przypomnienie przed eventem'
	};
	const AVAILABLE_PLACEHOLDERS = [
		'{{clientName}}',
		'{{eventName}}',
		'{{eventDateRange}}',
		'{{venue}}',
		'{{offerNumber}}',
		'{{totalValue}}',
		'{{offerLink}}',
		'{{validUntil}}',
		'{{paymentInfo}}',
		'{{driverName}}',
		'{{driverPhone}}'
	];

	// Przykładowe dane do preview
	const SAMPLE_CONTEXT: Record<string, string> = {
		clientName: 'Anna Kowalska',
		eventName: 'Wesele 50-osobowe',
		eventDateRange: '25 czerwca — 27 czerwca 2026',
		venue: 'Stodoła u Babci, Chmielnik',
		offerNumber: 'OFF-2026-0042',
		totalValue: '3 200 zł',
		offerLink: 'https://wolnynamiot.pl/offers/abc-123',
		validUntil: '2026-05-10',
		paymentInfo: '\n\nKaucja 500 zł wpłacona 12.04. Pozostało: 2 700 zł',
		driverName: 'Pepe',
		driverPhone: '+48 690 000 000'
	};

	function renderPreview(body: string): string {
		return body.replace(/\{\{(\w+)\}\}/g, (_, k) => SAMPLE_CONTEXT[k] ?? `{{${k}}}`);
	}

	let previewOpen = $state<Record<string, boolean>>({});

	const ICONS: Record<string, string> = {
		dashboard: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9ZM9 22V12h6v10',
		zlecenia: 'M22 12h-4l-3 9L9 3l-3 9H2',
		tents: 'M3 20 L12 4 L21 20 Z M8 20 L12 13 L16 20',
		team: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
		settings: 'M20 7h-9 M14 17H5 M17 14a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z M7 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z'
	};

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Ustawienia · Wolny Namiot panel</title>
</svelte:head>

<div class="app">
	<SidebarRail activeId="settings" isAdmin={data.isAdmin} userName={data.user.name} userEmail={data.user.email} />

	<main class="main">
		<header class="topbar">
			<div class="top-left">
				<h1>Ustawienia</h1>
				<span class="top-meta">profil firmy · kontakty · numeracja · użytkownicy</span>
			</div>
			<div class="top-right">
				<a href="/dashboard" class="back-link">← Home</a>
			</div>
		</header>

		<div class="tabs-wrap">
			<div class="tabs">
				{#each TABS as t}
					<button
						class="tab"
						class:active={activeTab === t.id}
						onclick={() => setTab(t.id)}
					>
						{t.label}
					</button>
				{/each}
			</div>
			{#if form?.success}
				<span class="saved">✓ Zapisano</span>
			{/if}
		</div>

		<div class="content">
			{#if activeTab === 'company'}
				<section class="card">
					<h2>Profil firmy</h2>
					<p class="hint">Używane w stopce oferty PDF + umowach.</p>
					<form method="POST" action="?/updateCompany" class="form-grid">
						<label class="field">
							<span>Nazwa handlowa</span>
							<input name="name" type="text" value={data.company.name ?? ''} required />
						</label>
						<label class="field">
							<span>Nazwa prawna</span>
							<input name="legalName" type="text" value={data.company.legalName ?? ''} />
						</label>
						<label class="field">
							<span>NIP</span>
							<input name="nip" type="text" value={data.company.nip ?? ''} placeholder="0000000000" />
						</label>
						<label class="field">
							<span>REGON</span>
							<input name="regon" type="text" value={data.company.regon ?? ''} />
						</label>
						<label class="field wide">
							<span>Adres</span>
							<input name="address" type="text" value={data.company.address ?? ''} />
						</label>
						<label class="field">
							<span>Email kontaktowy</span>
							<input name="email" type="email" value={data.company.email ?? ''} />
						</label>
						<label class="field">
							<span>Telefon</span>
							<input name="phone" type="tel" value={data.company.phone ?? ''} />
						</label>
						<label class="field">
							<span>Strona www</span>
							<input name="website" type="text" value={data.company.website ?? ''} />
						</label>
						<div class="form-actions">
							<button type="submit" class="btn-primary">Zapisz</button>
						</div>
					</form>
				</section>
			{/if}

			{#if activeTab === 'contacts'}
				<section class="card">
					<h2>Integracja Resend</h2>
					<p class="hint">
						Resend to serwis do wysyłki emaili. Klucz API przechowujemy w zmiennej środowiskowej <code>RESEND_API_KEY</code> (bezpieczniej niż w DB).
					</p>

					<div class="resend-status" class:ok={data.resendConfigured} class:miss={!data.resendConfigured}>
						{#if data.resendConfigured}
							<div>
								<strong>✓ Skonfigurowane</strong>
								<span>Nadawca: <code>{data.resendFrom}</code></span>
							</div>
							<form method="POST" action="?/sendTestEmail" style="display:inline;">
								<button type="submit" class="btn-primary">📬 Wyślij test do {data.user.email}</button>
							</form>
						{:else}
							<div>
								<strong>⚠️ Brak konfiguracji</strong>
								<span>W dev mode emaile są tylko logowane do console (nie wysyłają się realnie).</span>
							</div>
							<details class="resend-setup">
								<summary>Jak skonfigurować</summary>
								<ol>
									<li>Załóż konto na <a href="https://resend.com" target="_blank" rel="noopener">resend.com</a> (free tier = 3000 maili/miesiąc)</li>
									<li>Zweryfikuj domenę <code>wolnynamiot.pl</code> (SPF + DKIM records)</li>
									<li>Utwórz API key w panelu Resend</li>
									<li>Dodaj do <code>.env</code> na serwerze:
										<pre>RESEND_API_KEY=re_xxxxx
RESEND_FROM=biuro@wolnynamiot.pl</pre>
									</li>
									<li>Restart panelu</li>
								</ol>
							</details>
						{/if}
					</div>

					{#if form?.testEmailResult}
						<p class="test-result">→ {form.testEmailResult}</p>
					{/if}
				</section>

				<section class="card">
					<h2>Kontakty / szablon email</h2>
					<p class="hint">Nadawca, podpis — używane w wysyłce.</p>
					<form method="POST" action="?/updateContacts" class="form-grid">
						<label class="field">
							<span>Email nadawcy (Reply-To)</span>
							<input name="replyTo" type="email" value={data.contacts.replyTo ?? ''} required />
						</label>
						<label class="field">
							<span>Nazwa nadawcy</span>
							<input name="fromName" type="text" value={data.contacts.fromName ?? ''} required />
						</label>
						<label class="field wide">
							<span>Podpis email (stopka)</span>
							<textarea name="emailSignature" rows="4">{data.contacts.emailSignature ?? ''}</textarea>
						</label>
						<div class="form-actions">
							<button type="submit" class="btn-primary">Zapisz</button>
						</div>
					</form>
				</section>
			{/if}

			{#if activeTab === 'offers'}
				<section class="card">
					<h2>Numeracja ofert</h2>
					<p class="hint">Format: <code>PREFIX-ROK-NUMER</code> (np. OFF-2026-0008). Numer auto-inkrementuje się po utworzeniu oferty.</p>
					<form method="POST" action="?/updateOffers" class="form-grid">
						<label class="field">
							<span>Prefix</span>
							<input name="prefix" type="text" value={data.offers.prefix ?? 'OFF'} maxlength="8" required />
						</label>
						<label class="field">
							<span>Rok</span>
							<input name="year" type="number" value={data.offers.year ?? new Date().getFullYear()} required />
						</label>
						<label class="field">
							<span>Następny numer</span>
							<input name="nextNumber" type="number" min="1" value={data.offers.nextNumber ?? 1} required />
						</label>
						<label class="field">
							<span>Ważność oferty (dni)</span>
							<input name="validDays" type="number" min="1" value={data.offers.validDays ?? 14} required />
						</label>
						<div class="preview">
							Następna oferta dostanie numer:
							<strong>{data.offers.prefix ?? 'OFF'}-{data.offers.year ?? new Date().getFullYear()}-{String(data.offers.nextNumber ?? 1).padStart(4, '0')}</strong>
						</div>
						<div class="form-actions">
							<button type="submit" class="btn-primary">Zapisz</button>
						</div>
					</form>
				</section>
			{/if}

			{#if activeTab === 'templates'}
				<section class="card">
					<h2>Szablony email</h2>
					<p class="hint">
						4 automatyczne wiadomości. Użyj placeholderów: <code>{AVAILABLE_PLACEHOLDERS.join(' · ')}</code> — zostaną podmienione na realne dane przy wysyłce.
					</p>

					<form method="POST" action="?/updateTemplates" class="templates-form">
						{#each TEMPLATE_KEYS as key}
							{@const tpl = data.emailTemplates?.[key] ?? { name: '', subject: '', body: '' }}
							<div class="template-block">
								<div class="tpl-head">
									<h3>{TEMPLATE_LABELS[key]}</h3>
									<button
										type="button"
										class="btn-inline"
										onclick={() => (previewOpen[key] = !previewOpen[key])}
									>
										{previewOpen[key] ? '✕ zamknij podgląd' : '👁️ podgląd'}
									</button>
								</div>
								<div class="tpl-grid">
									<label class="field">
										<span>Nazwa wewnętrzna</span>
										<input name={`${key}_name`} type="text" value={tpl.name} />
									</label>
									<label class="field wide">
										<span>Temat email</span>
										<input name={`${key}_subject`} type="text" value={tpl.subject} />
									</label>
									<label class="field wide">
										<span>Treść</span>
										<textarea name={`${key}_body`} rows="8">{tpl.body}</textarea>
									</label>
								</div>
								{#if previewOpen[key]}
									<div class="tpl-preview">
										<div class="tpl-preview-label">📬 Podgląd z przykładowymi danymi:</div>
										<div class="tpl-preview-subject"><strong>Temat:</strong> {renderPreview(tpl.subject)}</div>
										<div class="tpl-preview-body">{renderPreview(tpl.body)}</div>
									</div>
								{/if}
							</div>
						{/each}

						<div class="form-actions">
							<button type="submit" class="btn-primary">Zapisz wszystkie szablony</button>
						</div>
					</form>
				</section>
			{/if}

			{#if activeTab === 'users'}
				<section class="card">
					<h2>Użytkownicy ({data.users.length})</h2>
					<p class="hint">Role: <strong>admin</strong> (pełny dostęp), <strong>employee</strong> (bez ustawień + user management).</p>

					<table class="users-table">
						<thead>
							<tr>
								<th>Imię</th>
								<th>Email</th>
								<th>Rola</th>
								<th>Umiejętności</th>
								<th>Dodany</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each data.users as u}
								{#if editingUserId === u.id}
									<tr class="edit-row">
										<td colspan="6">
											<form method="POST" action="?/updateUser" class="inline-form stacked">
												<input type="hidden" name="id" value={u.id} />
												<div class="inline-row">
													<input name="name" type="text" value={u.name} placeholder="Imię" required />
													<input type="text" value={u.email} disabled class="mute-input" />
													<select name="role">
														<option value="admin" selected={u.role === 'admin'}>admin</option>
														<option value="employee" selected={u.role === 'employee'}>employee</option>
													</select>
												</div>
												<div class="skill-checks">
													<span class="skill-lbl">Umiejętności:</span>
													<label class="skill-box"><input type="checkbox" name="skills" value="driver" checked={u.skills?.includes('driver')} /> 🚚 Kierowca</label>
													<label class="skill-box"><input type="checkbox" name="skills" value="installer" checked={u.skills?.includes('installer')} /> 🔨 Montażysta</label>
													<label class="skill-box"><input type="checkbox" name="skills" value="lead" checked={u.skills?.includes('lead')} /> 👑 Lider ekipy</label>
												</div>
												<div class="inline-row">
													<button type="submit" class="btn-save">Zapisz</button>
													<button type="button" class="btn-cancel" onclick={() => (editingUserId = null)}>Anuluj</button>
												</div>
											</form>
										</td>
									</tr>
								{:else}
									<tr>
										<td class="name">{u.name}</td>
										<td class="mute">{u.email}</td>
										<td>
											<span class="role-tag role-{u.role}">{u.role}</span>
										</td>
										<td class="skill-cell">
											{#if u.skills && u.skills.length > 0}
												{#each u.skills as sk}
													<span class="skill-chip">
														{#if sk === 'driver'}🚚 kierowca{:else if sk === 'installer'}🔨 montaż{:else if sk === 'lead'}👑 lider{:else}{sk}{/if}
													</span>
												{/each}
											{:else}
												<span class="mute">—</span>
											{/if}
										</td>
										<td class="mute">{fmtDate(u.createdAt)}</td>
										<td class="actions">
											<button class="btn-inline" onclick={() => (editingUserId = u.id)}>Edytuj</button>
											{#if u.id !== data.user.id}
												<form method="POST" action="?/deleteUser" style="display:inline;">
													<input type="hidden" name="id" value={u.id} />
													<button type="submit" class="btn-danger" onclick={(e) => { if (!confirm(`Usunąć ${u.name}?`)) e.preventDefault(); }}>Usuń</button>
												</form>
											{/if}
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>

					<form method="POST" action="?/addUser" class="add-user">
						<h3>+ Dodaj użytkownika</h3>
						<div class="add-row">
							<label class="field grow">
								<span>Imię</span>
								<input name="name" type="text" placeholder="np. Pepe" required />
							</label>
							<label class="field grow">
								<span>Email</span>
								<input name="email" type="email" placeholder="pepe@wolnynamiot.pl" required />
							</label>
							<label class="field">
								<span>Rola</span>
								<select name="role">
									<option value="employee">employee</option>
									<option value="admin">admin</option>
								</select>
							</label>
						</div>
						<div class="skill-checks add-skills">
							<span class="skill-lbl">Umiejętności:</span>
							<label class="skill-box"><input type="checkbox" name="skills" value="driver" /> 🚚 Kierowca</label>
							<label class="skill-box"><input type="checkbox" name="skills" value="installer" /> 🔨 Montażysta</label>
							<label class="skill-box"><input type="checkbox" name="skills" value="lead" /> 👑 Lider</label>
						</div>
						<div class="add-row-actions">
							<button type="submit" class="btn-primary">Dodaj</button>
						</div>
						<p class="hint mini">Login/hasło zostanie dodane przy integracji Keycloak (później).</p>
					</form>
				</section>
			{/if}
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
		font-size: 0.85rem;
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
		align-items: center;
		justify-content: space-between;
		padding: 1rem max(1.5rem, calc((100% - 1200px) / 2));
		border-bottom: 1px solid var(--line);
		background: var(--paper);
	}
	.top-left { display: flex; align-items: baseline; gap: 1rem; }
	h1 { margin: 0; font-family: var(--font-display, var(--font-sans)); font-size: 1.5rem; }
	.top-meta { color: var(--mute); font-size: 0.8rem; }
	.back-link { color: var(--mute); text-decoration: none; font-size: 0.85rem; }
	.back-link:hover { color: var(--wn-zielony); }

	.tabs-wrap {
		padding: 0.75rem max(1.5rem, calc((100% - 1200px) / 2)) 0;
		border-bottom: 1px solid var(--line);
		background: var(--paper);
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		justify-content: space-between;
	}
	.tabs { display: flex; gap: 0.15rem; }
	.tab {
		padding: 0.55rem 0.95rem;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		font-size: 0.88rem;
		color: var(--mute);
		cursor: pointer;
		margin-bottom: -1px;
		font-family: inherit;
		font-weight: 500;
	}
	.tab:hover { color: var(--ink); }
	.tab.active { color: var(--ink); border-bottom-color: var(--wn-zielony); }
	.saved {
		margin-bottom: 0.5rem;
		color: var(--wn-zielony, #4ea072);
		font-size: 0.82rem;
		font-weight: 600;
	}

	.content {
		padding: 1.25rem max(1.5rem, calc((100% - 1200px) / 2)) 3rem;
	}
	.card {
		background: var(--paper);
		border: 1px solid var(--line);
		padding: 1.5rem 1.75rem;
	}
	.card h2 { margin: 0 0 0.35rem; font-size: 1.15rem; }
	.card h3 { margin: 0 0 0.5rem; font-size: 0.95rem; }
	.hint { color: var(--mute); font-size: 0.82rem; margin: 0 0 1.25rem; }
	.hint.mini { font-size: 0.75rem; margin-top: 0.5rem; }
	.hint code {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		background: var(--paper-2);
		padding: 0.05rem 0.3rem;
	}

	.templates-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.template-block {
		padding: 1rem 1.15rem;
		background: var(--paper-2);
		border-left: 3px solid var(--wn-zielony);
	}
	.tpl-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.template-block h3 {
		margin: 0;
		font-size: 0.95rem;
	}
	.tpl-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	.tpl-grid .field.wide {
		grid-column: 1 / -1;
	}
	.tpl-grid textarea {
		font-family: var(--font-mono);
		font-size: 0.82rem;
		resize: vertical;
	}
	.tpl-preview {
		margin-top: 0.9rem;
		padding: 0.85rem 1rem;
		background: var(--paper);
		border: 1px solid var(--line);
		border-left: 3px solid var(--wn-zarowka);
		font-size: 0.88rem;
	}
	.tpl-preview-label {
		font-size: 0.72rem;
		color: var(--mute);
		margin-bottom: 0.5rem;
	}
	.tpl-preview-subject {
		margin-bottom: 0.6rem;
		font-size: 0.95rem;
	}
	.tpl-preview-body {
		white-space: pre-wrap;
		line-height: 1.5;
		color: var(--ink);
	}

	.resend-status {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
		padding: 0.85rem 1rem;
		margin-bottom: 1rem;
	}
	.resend-status.ok {
		background: color-mix(in srgb, var(--wn-zielony) 12%, var(--paper));
		border-left: 3px solid var(--wn-zielony);
	}
	.resend-status.miss {
		background: color-mix(in srgb, var(--wn-zarowka) 18%, var(--paper));
		border-left: 3px solid var(--wn-zarowka);
	}
	.resend-status div {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.resend-status strong { font-size: 0.95rem; }
	.resend-status code { font-family: var(--font-mono); font-size: 0.82rem; }
	.resend-setup {
		margin-top: 0.75rem;
		width: 100%;
	}
	.resend-setup summary {
		cursor: pointer;
		font-size: 0.88rem;
		color: var(--wn-granat);
		font-weight: 600;
	}
	.resend-setup ol {
		margin-top: 0.5rem;
		padding-left: 1.3rem;
		font-size: 0.88rem;
		line-height: 1.6;
	}
	.resend-setup pre {
		margin: 0.3rem 0;
		padding: 0.55rem 0.75rem;
		background: var(--wn-atrament);
		color: var(--wn-plotno);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		overflow-x: auto;
	}
	.test-result {
		padding: 0.65rem 0.9rem;
		background: var(--paper-2);
		border-left: 3px solid var(--wn-zielony);
		font-size: 0.85rem;
		font-family: var(--font-mono);
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.85rem 1rem;
	}
	.field { display: flex; flex-direction: column; gap: 0.25rem; }
	.field > span { font-size: 0.75rem; color: var(--mute); font-weight: 500; }
	.field.wide { grid-column: 1 / -1; }
	.field.grow { flex: 1; }
	.field input, .field textarea, .field select {
		border: 1px solid var(--line);
		padding: 0.5rem 0.65rem;
		background: var(--paper);
		font-family: inherit;
		font-size: 0.9rem;
		border-radius: 0;
	}
	.field input:focus, .field textarea:focus, .field select:focus {
		outline: none;
		border-color: var(--wn-zielony);
	}
	.mute-input { opacity: 0.6; }
	.preview {
		grid-column: 1 / -1;
		padding: 0.85rem 1rem;
		background: var(--paper-2);
		border-left: 3px solid var(--wn-zielony);
		font-size: 0.88rem;
	}
	.preview strong { font-family: var(--font-mono); }
	.form-actions {
		grid-column: 1 / -1;
		display: flex;
		justify-content: flex-end;
	}
	.btn-primary {
		padding: 0.5rem 1.3rem;
		background: var(--wn-zielony);
		color: var(--wn-atrament);
		border: 2px solid var(--wn-atrament);
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		box-shadow: 3px 3px 0 var(--wn-atrament);
	}
	.btn-primary:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--wn-atrament); }

	.users-table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1.5rem; font-size: 0.9rem; }
	.users-table th, .users-table td {
		text-align: left;
		padding: 0.55rem 0.6rem;
		border-bottom: 1px solid var(--line);
	}
	.users-table th { font-weight: 600; color: var(--mute); font-size: 0.75rem; text-transform: uppercase; }
	.users-table td.name { font-weight: 500; }
	.users-table .mute { color: var(--mute); }
	.role-tag {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		padding: 0.15rem 0.5rem;
		background: var(--paper-2);
		border: 1px solid var(--line);
		text-transform: uppercase;
	}
	.role-tag.role-admin { background: var(--wn-zarowka, #ffd54a); color: var(--wn-atrament); border-color: var(--wn-atrament); }
	.actions { text-align: right; white-space: nowrap; }
	.btn-inline {
		padding: 0.3rem 0.7rem;
		border: 1px solid var(--line);
		background: var(--paper);
		font-size: 0.78rem;
		cursor: pointer;
		font-family: inherit;
		margin-right: 0.35rem;
	}
	.btn-inline:hover { border-color: var(--wn-zielony); color: var(--wn-zielony); }
	.btn-danger {
		padding: 0.3rem 0.7rem;
		border: 1px solid transparent;
		background: transparent;
		color: var(--wn-pomidor);
		cursor: pointer;
		font-size: 0.78rem;
		font-family: inherit;
	}
	.btn-danger:hover { border-color: var(--wn-pomidor); }
	.btn-save, .btn-cancel {
		padding: 0.35rem 0.75rem;
		border: 1px solid var(--line);
		background: var(--paper);
		cursor: pointer;
		font-family: inherit;
		font-size: 0.82rem;
	}
	.btn-save { border-color: var(--wn-zielony); color: var(--wn-zielony); }

	.inline-form {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding: 0.4rem;
		flex-wrap: wrap;
	}
	.inline-form.stacked {
		flex-direction: column;
		align-items: stretch;
	}
	.inline-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}
	.skill-checks {
		display: flex;
		gap: 1rem;
		align-items: center;
		padding: 0.55rem 0;
		flex-wrap: wrap;
		border-top: 1px dashed var(--line);
		border-bottom: 1px dashed var(--line);
	}
	.skill-checks.add-skills {
		margin-top: 0.75rem;
		border-bottom: none;
	}
	.skill-lbl {
		font-size: 0.78rem;
		color: var(--mute);
		font-weight: 500;
	}
	.skill-box {
		display: inline-flex;
		gap: 0.3rem;
		align-items: center;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.skill-cell {
		font-size: 0.82rem;
	}
	.skill-chip {
		display: inline-block;
		padding: 0.1rem 0.45rem;
		background: var(--paper-2);
		border: 1px solid var(--line);
		margin-right: 0.25rem;
		font-size: 0.75rem;
	}
	.add-row-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.75rem;
	}
	.inline-form input, .inline-form select {
		border: 1px solid var(--line);
		padding: 0.4rem 0.55rem;
		font-family: inherit;
		font-size: 0.85rem;
	}

	.add-user {
		border-top: 2px solid var(--line);
		padding-top: 1rem;
		margin-top: 1rem;
	}
	.add-row {
		display: flex;
		gap: 0.85rem;
		align-items: flex-end;
		flex-wrap: wrap;
	}

	@media (max-width: 720px) {
		.form-grid { grid-template-columns: 1fr; }
		.users-table { font-size: 0.82rem; }
		.users-table th { font-size: 0.7rem; }
	}
</style>
