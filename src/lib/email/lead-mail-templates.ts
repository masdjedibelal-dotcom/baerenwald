import { SITE_CONFIG } from "@/lib/config";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(s: string): string {
  return esc(s).replace(/'/g, "&#39;");
}

function cellHtml(value: string): string {
  return esc(value).replace(/\n/g, "<br/>");
}

/** Absolut: E-Mail-Clients laden /public nur per vollständiger URL */
function logoWhiteUrl(): string {
  return `${SITE_CONFIG.url}/logo-mark-white.png`;
}

export type KundeBestaetigungMailData = {
  name: string;
  leistung?: string;
  preis?: string;
  rechnerLink?: string;
};

/**
 * Bestätigungsmail an Kund:innen (Lead / Website).
 * Tabellen-Layout, Inline-CSS — gängige Mail-Clients.
 */
export function buildKundeBestaetigung(
  data: KundeBestaetigungMailData
): string {
  const name = esc(data.name);
  const leistungBlock =
    data.leistung && data.leistung.trim().length > 0
      ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#EAF3DE;border-radius:8px;margin-bottom:24px;">
    <tr>
      <td style="padding:20px 24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#2E7D52;">
          Deine Anfrage
        </p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#1A3D2B;">
          ${esc(data.leistung.trim())}
        </p>
        ${
          data.preis && data.preis.trim()
            ? `<p style="margin:6px 0 0;font-size:14px;color:#2E7D52;">Preisrahmen: ${esc(data.preis.trim())}</p>`
            : ""
        }
      </td>
    </tr>
    </table>`
      : "";

  const buttonBlock =
    data.rechnerLink && data.rechnerLink.trim().length > 0
      ? `
    <table cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#2E7D52;border-radius:8px;">
        <a href="${escAttr(data.rechnerLink.trim())}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
          Weitere Leistung anfragen →
        </a>
      </td>
    </tr>
    </table>`
      : "";

  const siteUrl = escAttr(SITE_CONFIG.url);
  const phoneDisplay = esc(SITE_CONFIG.phone);
  const phoneHref = escAttr(SITE_CONFIG.phoneHref);

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f7f6f3;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f3;">
<tr><td align="center" style="padding:32px 16px;">

<table width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">

<tr>
  <td style="background:#2E7D52;padding:24px 32px;">
    <table cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding-right:12px;vertical-align:middle;">
        <img src="${escAttr(logoWhiteUrl())}" height="36" alt="Bärenwald" style="display:block;border:0;height:36px;width:auto;"/>
      </td>
      <td style="vertical-align:middle;">
        <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Bärenwald München</span>
      </td>
    </tr>
    </table>
  </td>
</tr>

<tr>
  <td style="padding:40px 32px 32px;">
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1E1E1E;line-height:1.3;">
      Deine Anfrage ist eingegangen.
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B7280;line-height:1.5;">
      Hallo ${name} — wir haben deine Anfrage erhalten und melden uns innerhalb von 24 Stunden.
    </p>
    ${leistungBlock}
    <p style="margin:0 0 28px;font-size:15px;color:#4A5568;line-height:1.7;">
      Unser Team schaut sich deine Anfrage an und meldet sich für einen Vor-Ort-Termin. Danach erhältst du ein verbindliches Angebot — kein Nachtrag ohne deine Zustimmung.
    </p>
    ${buttonBlock}
  </td>
</tr>

<tr>
  <td style="padding:0 32px;">
    <hr style="border:none;border-top:1px solid #E8E6E0;margin:0;"/>
  </td>
</tr>

<tr>
  <td style="padding:20px 32px 28px;">
    <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
      Bärenwald München · München &amp; Umgebung<br/>
      <a href="${siteUrl}" style="color:#2E7D52;text-decoration:none;">baerenwald-muenchen.de</a>
      ·
      <a href="${phoneHref}" style="color:#2E7D52;text-decoration:none;">${phoneDisplay}</a>
    </p>
    <p style="margin:8px 0 0;font-size:11px;color:#D1D5DB;">
      Du erhältst diese Mail, weil du eine Anfrage über unsere Webseite gestellt hast.
    </p>
  </td>
</tr>

</table>

</td></tr>
</table>

</body>
</html>`;
}

export type InternLeadMailData = {
  name?: string;
  email?: string;
  telefon?: string;
  plz?: string;
  situation?: string;
  bereiche?: string[];
  preis?: string;
  notizen?: string;
  dashboardUrl?: string;
  quelle?: string;
  createdAt?: string;
  leadId?: string;
};

/**
 * Interne Lead-Benachrichtigung — kompakte Tabelle + CRM-Link.
 */
export function buildInternNotification(data: InternLeadMailData): string {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: string | undefined) => {
    const v = value?.trim();
    if (v) rows.push({ label, value: v });
  };

  push("Name", data.name);
  push("E-Mail", data.email);
  push("Telefon", data.telefon);
  push("PLZ", data.plz);
  push("Quelle", data.quelle);
  push("Situation", data.situation);
  if (data.bereiche && data.bereiche.length > 0) {
    push("Bereiche", data.bereiche.join(", "));
  }
  push("Preisrahmen", data.preis);
  push("Notizen", data.notizen);
  push("Zeitpunkt", data.createdAt);
  push("Lead-ID", data.leadId);

  const rowsHtml = rows
    .map(
      ({ label, value }) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #F3F4F6;color:#6B7280;width:35%;vertical-align:top;">${esc(label)}</td>
        <td style="padding:8px 0 8px 16px;border-bottom:1px solid #F3F4F6;font-weight:500;vertical-align:top;">${cellHtml(value)}</td>
      </tr>`
    )
    .join("");

  const title = data.name?.trim() ? esc(data.name.trim()) : "Neue Anfrage";

  const buttonBlock =
    data.dashboardUrl && data.dashboardUrl.trim().length > 0
      ? `
    <table cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td style="background:#2E7D52;border-radius:6px;">
        <a href="${escAttr(data.dashboardUrl.trim())}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
          Im CRM öffnen →
        </a>
      </td>
    </tr>
    </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f7f6f3;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f3;">
<tr><td align="center" style="padding:24px 16px;">

<table width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;" cellpadding="0" cellspacing="0">

<tr>
  <td style="background:#1A3D2B;padding:16px 24px;">
    <p style="margin:0;color:#ffffff;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
      Bärenwald — Neue Anfrage
    </p>
  </td>
</tr>

<tr>
  <td style="padding:24px;">
    <p style="margin:0 0 20px;font-size:20px;font-weight:800;color:#1E1E1E;">${title}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1E1E1E;">
      ${rowsHtml}
    </table>
    ${buttonBlock}
  </td>
</tr>

</table>
</td></tr>
</table>

</body>
</html>`;
}

export type SavePriceCustomerMailInput = {
  situation: string;
  bereiche: string;
  plz: string;
  priceMin: number;
  priceMax: number;
};

/** Kurze HTML-Mail: Preisrahmen per E-Mail (Rechner / save-price). */
export function buildSavePriceCustomerHtml(
  input: SavePriceCustomerMailInput
): string {
  const preis = `${input.priceMin.toLocaleString("de-DE")} – ${input.priceMax.toLocaleString("de-DE")} €`;
  const leistung = [input.situation, input.bereiche].filter(Boolean).join(" — ");
  const rechner = `${SITE_CONFIG.url}/rechner`;
  const siteUrl = escAttr(SITE_CONFIG.url);
  const phoneDisplay = esc(SITE_CONFIG.phone);
  const phoneHref = escAttr(SITE_CONFIG.phoneHref);

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f7f6f3;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f3;">
<tr><td align="center" style="padding:32px 16px;">

<table width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">

<tr>
  <td style="background:#2E7D52;padding:24px 32px;">
    <table cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding-right:12px;vertical-align:middle;">
        <img src="${escAttr(logoWhiteUrl())}" height="36" alt="Bärenwald" style="display:block;border:0;height:36px;width:auto;"/>
      </td>
      <td style="vertical-align:middle;">
        <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Bärenwald München</span>
      </td>
    </tr>
    </table>
  </td>
</tr>

<tr>
  <td style="padding:36px 32px 28px;">
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#1E1E1E;line-height:1.3;">Dein Preisrahmen</h1>
    <p style="margin:0 0 22px;font-size:15px;color:#6B7280;line-height:1.5;">
      Hier die Einschätzung zu deinem Vorhaben — unverbindlich, basierend auf aktuellen Münchner Marktpreisen.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#EAF3DE;border-radius:8px;margin-bottom:22px;">
    <tr>
      <td style="padding:18px 22px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#2E7D52;">Vorhaben</p>
        <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#1A3D2B;">${esc(leistung)}</p>
        <p style="margin:0;font-size:14px;color:#2E7D52;">Preisrahmen: <strong>${esc(preis)}</strong></p>
        <p style="margin:8px 0 0;font-size:13px;color:#4A5568;">PLZ: ${esc(input.plz || "—")}</p>
      </td>
    </tr>
    </table>
    <p style="margin:0 0 24px;font-size:14px;color:#4A5568;line-height:1.65;">
      Das verbindliche Festpreisangebot erhältst du nach dem Vor-Ort-Termin.
    </p>
    <table cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#2E7D52;border-radius:8px;">
        <a href="${escAttr(rechner)}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Rechner nochmal öffnen →</a>
      </td>
    </tr>
    </table>
  </td>
</tr>

<tr>
  <td style="padding:0 32px;">
    <hr style="border:none;border-top:1px solid #E8E6E0;margin:0;"/>
  </td>
</tr>

<tr>
  <td style="padding:18px 32px 26px;">
    <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
      Bärenwald München<br/>
      <a href="${siteUrl}" style="color:#2E7D52;text-decoration:none;">baerenwald-muenchen.de</a>
      ·
      <a href="${phoneHref}" style="color:#2E7D52;text-decoration:none;">${phoneDisplay}</a>
    </p>
  </td>
</tr>

</table>

</td></tr>
</table>

</body>
</html>`;
}

export type SavePriceInternalMailInput = {
  email: string;
  situation: string;
  bereiche: string;
  plz: string;
  priceMin: number;
  priceMax: number;
};

export function buildSavePriceInternalHtml(
  input: SavePriceInternalMailInput
): string {
  const preis = `${input.priceMin.toLocaleString("de-DE")} – ${input.priceMax.toLocaleString("de-DE")} €`;
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;background:#f7f6f3;">
<table width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:20px;">
<tr><td>
  <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1A3D2B;text-transform:uppercase;">Rechner · Preis per E-Mail</p>
  <table style="width:100%;font-size:14px;">
    <tr><td style="padding:6px 0;color:#6B7280;width:38%;">E-Mail</td><td style="padding:6px 0;">${esc(input.email)}</td></tr>
    <tr><td style="padding:6px 0;color:#6B7280;">Vorhaben</td><td style="padding:6px 0;">${esc([input.situation, input.bereiche].filter(Boolean).join(" — "))}</td></tr>
    <tr><td style="padding:6px 0;color:#6B7280;">PLZ</td><td style="padding:6px 0;">${esc(input.plz)}</td></tr>
    <tr><td style="padding:6px 0;color:#6B7280;">Preisrahmen</td><td style="padding:6px 0;font-weight:700;color:#2E7D52;">${esc(preis)}</td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}
