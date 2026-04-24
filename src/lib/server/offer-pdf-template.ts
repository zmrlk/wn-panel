/**
 * HTML template dla PDF oferty (A4, brand-styled, inline CSS).
 * Renderuje się jako jeden file, Gotenberg konwertuje do PDF.
 *
 * Design tokeny:
 *   granat  #1a1d2e  — primary ink
 *   żarówka #f5d35c  — akcent żółty
 *   pomidor #d4644a  — akcent czerwony
 *   płótno  #f5f1e8  — tło kremowe
 *   zielony #3ab68d  — success/ok
 */

export type OfferPdfSnapshot = {
	offer: {
		number: string;
		eventName: string | null;
		eventStartDate: string | null;
		eventEndDate: string | null;
		venue: string | null;
		totalCents: number;
		validUntil: string | null;
		notes: string | null;
	};
	client: {
		name: string | null;
		company: string | null;
		phone: string | null;
		email: string | null;
		address: string | null;
	};
	items: Array<{
		description: string;
		quantity: number;
		unitPriceCents: number;
		lineTotalCents: number;
	}>;
	company: {
		tradeName?: string;
		legalName?: string;
		address?: string;
		email?: string;
		phone?: string;
		www?: string;
	};
	qrSvg?: string;
};

function fmtZl(cents: number): string {
	const zl = (cents / 100).toLocaleString('pl-PL', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	return `${zl} zł`;
}

function fmtDate(iso: string | null): string {
	if (!iso) return '';
	const d = new Date(iso);
	return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function dateRange(from: string | null, to: string | null): string {
	if (!from) return '';
	if (!to || from === to) return fmtDate(from);
	return `${fmtDate(from)} – ${fmtDate(to)}`;
}

function escapeHtml(s: string | null | undefined): string {
	if (!s) return '';
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export function renderOfferPdfHtml(snap: OfferPdfSnapshot): string {
	const { offer: o, client: c, items, company, qrSvg } = snap;
	const netto = o.totalCents / 1.23;
	const vat = o.totalCents - netto;

	const rows = items
		.map(
			(it) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e8e4d6;vertical-align:top;">${escapeHtml(it.description)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8e4d6;text-align:center;">${it.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8e4d6;text-align:right;">${fmtZl(it.unitPriceCents)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8e4d6;text-align:right;font-weight:600;">${fmtZl(it.lineTotalCents)}</td>
    </tr>`
		)
		.join('');

	const companyName = escapeHtml(company.tradeName ?? company.legalName ?? 'Wolny Namiot');
	const companyAddr = escapeHtml(company.address ?? '');
	const companyEmail = escapeHtml(company.email ?? 'biuro@wolnynamiot.pl');
	const companyPhone = escapeHtml(company.phone ?? '+48 796 886 222');
	const companyWww = escapeHtml(company.www ?? 'wolnynamiot.pl');

	return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>Oferta ${escapeHtml(o.number)}</title>
<style>
  @page { size: A4; margin: 14mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
    color: #1a1d2e;
    background: #f5f1e8;
    margin: 0;
    padding: 0;
    font-size: 11pt;
    line-height: 1.45;
  }
  .page { max-width: 210mm; margin: 0 auto; padding: 0; }

  header.cover {
    background: #1a1d2e;
    color: #f5f1e8;
    padding: 24px 28px;
    border-bottom: 4px solid #f5d35c;
  }
  .brand { font-family: 'Courier New', monospace; font-size: 10pt; letter-spacing: 3px; text-transform: uppercase; opacity: 0.7; }
  .brand-dot { color: #d4644a; }
  h1 { margin: 6px 0 4px; font-size: 30pt; font-weight: 400; font-style: italic; line-height: 1.1; }
  .eyebrow { font-size: 11pt; opacity: 0.85; }

  .hero-meta {
    display: flex;
    gap: 40px;
    padding: 20px 28px;
    background: #ffffff;
    border-bottom: 1px solid #e8e4d6;
  }
  .meta-item .label { font-size: 9pt; text-transform: uppercase; letter-spacing: 1.5px; color: #888; }
  .meta-item .value { font-size: 13pt; font-weight: 600; margin-top: 2px; }

  section.block { padding: 20px 28px; background: #ffffff; }
  section.block + section.block { border-top: 1px solid #e8e4d6; }

  h2 {
    margin: 0 0 12px;
    font-size: 13pt;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #888;
    font-weight: 600;
  }

  .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; }
  .field .lbl { font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; color: #888; }
  .field .val { font-size: 12pt; font-weight: 500; }

  table.items { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.items th {
    text-align: left;
    padding: 8px 12px;
    background: #f5f1e8;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #555;
    border-bottom: 2px solid #1a1d2e;
  }
  table.items th.num { text-align: center; }
  table.items th.money { text-align: right; }

  .totals {
    margin-top: 16px;
    margin-left: auto;
    max-width: 280px;
    background: #f5f1e8;
    padding: 14px 18px;
    border-left: 4px solid #f5d35c;
  }
  .totals-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11pt; }
  .totals-row.brutto {
    font-size: 20pt;
    font-weight: 900;
    font-family: 'Archivo Black', 'Arial Black', sans-serif;
    border-top: 1px solid #1a1d2e;
    padding-top: 10px;
    margin-top: 6px;
  }

  .validity {
    padding: 14px 20px;
    background: color-mix(in srgb, #f5d35c 25%, #ffffff);
    border: 1px dashed #1a1d2e;
    margin: 16px 28px;
    font-size: 11pt;
  }
  .validity strong { color: #d4644a; }

  .notes {
    padding: 14px 20px;
    background: #ffffff;
    margin: 4px 28px 20px;
    border-left: 3px solid #888;
    color: #555;
    font-size: 10pt;
    white-space: pre-wrap;
  }

  footer.foot {
    margin-top: 0;
    padding: 18px 28px;
    background: #1a1d2e;
    color: #f5f1e8;
    font-size: 9.5pt;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
  }
  .foot-brand { font-family: 'Courier New', monospace; font-size: 9pt; letter-spacing: 2px; opacity: 0.7; text-transform: uppercase; margin-bottom: 4px; }
  .foot-main { font-size: 11pt; font-weight: 600; color: #f5d35c; margin-bottom: 2px; }
  .foot-contact { line-height: 1.6; opacity: 0.95; }
  .foot-contact a { color: #f5d35c; text-decoration: none; }
  .qr { background: #ffffff; padding: 8px; border-radius: 2px; display: inline-block; }
  .qr svg { display: block; width: 70px; height: 70px; }

  .foot-note { text-align: center; font-size: 9pt; color: #666; padding: 8px; }
</style>
</head>
<body>
<div class="page">

  <header class="cover">
    <div class="brand">wolny namiot <span class="brand-dot">·</span> oferta</div>
    <h1>${escapeHtml(o.eventName ?? 'oferta')}.</h1>
    <div class="eyebrow">dla ${escapeHtml(c.name ?? 'klienta')} · numer <strong>${escapeHtml(o.number)}</strong></div>
  </header>

  <div class="hero-meta">
    <div class="meta-item">
      <div class="label">Termin</div>
      <div class="value">${dateRange(o.eventStartDate, o.eventEndDate)}</div>
    </div>
    ${
			o.venue
				? `<div class="meta-item">
      <div class="label">Miejsce</div>
      <div class="value">${escapeHtml(o.venue)}</div>
    </div>`
				: ''
		}
  </div>

  <section class="block">
    <h2>Klient</h2>
    <div class="client-grid">
      <div class="field"><div class="lbl">Imię / firma</div><div class="val">${escapeHtml(c.name ?? '—')}</div></div>
      ${c.company ? `<div class="field"><div class="lbl">Firma</div><div class="val">${escapeHtml(c.company)}</div></div>` : ''}
      ${c.email ? `<div class="field"><div class="lbl">Email</div><div class="val">${escapeHtml(c.email)}</div></div>` : ''}
      ${c.phone ? `<div class="field"><div class="lbl">Telefon</div><div class="val">${escapeHtml(c.phone)}</div></div>` : ''}
      ${c.address ? `<div class="field" style="grid-column:1/-1"><div class="lbl">Adres</div><div class="val">${escapeHtml(c.address)}</div></div>` : ''}
    </div>
  </section>

  <section class="block">
    <h2>Pozycje oferty</h2>
    <table class="items">
      <thead>
        <tr>
          <th>Pozycja</th>
          <th class="num">Ilość</th>
          <th class="money">Cena/szt</th>
          <th class="money">Razem</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="4" style="padding:14px;text-align:center;color:#888;">— brak pozycji —</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row"><span>Netto</span><span>${fmtZl(Math.round(netto))}</span></div>
      <div class="totals-row"><span>VAT 23%</span><span>${fmtZl(Math.round(vat))}</span></div>
      <div class="totals-row brutto"><span>Do zapłaty</span><span>${fmtZl(o.totalCents)}</span></div>
    </div>
  </section>

  ${
		o.validUntil
			? `<div class="validity">
    <strong>Oferta ważna do ${fmtDate(o.validUntil)}</strong> — po tej dacie ceny i dostępność mogą się zmienić.
  </div>`
			: ''
	}

  ${
		o.notes
			? `<div class="notes">${escapeHtml(o.notes)}</div>`
			: ''
	}

  <footer class="foot">
    <div>
      <div class="foot-brand">wolny namiot <span style="color:#d4644a;">·</span> panel</div>
      <div class="foot-main">${companyName}</div>
      <div class="foot-contact">
        ${companyAddr ? `${companyAddr}<br>` : ''}
        <a href="https://${companyWww}">${companyWww}</a> · <a href="mailto:${companyEmail}">${companyEmail}</a> · ${companyPhone}
      </div>
    </div>
    ${qrSvg ? `<div class="qr">${qrSvg}</div>` : ''}
  </footer>

  <div class="foot-note">Dokument wygenerowany elektronicznie — ważny bez podpisu.</div>

</div>
</body>
</html>`;
}
