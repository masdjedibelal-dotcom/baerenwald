import { SITE_CONFIG } from "@/lib/config";
import {
  buildBreakdownRows,
  buildGroessenRows,
  buildInternNotificationSubject,
  buildLeistungenRows,
  effectivePreisRange,
  extractKundenFreitext,
  formatPreisrahmenDe,
  labelBereich,
  labelDringlichkeit,
  labelKundentyp,
  labelSituation,
  labelZeitraum,
  labelZugaenglichkeit,
  normalizeFunnelDaten,
} from "@/lib/lead-funnel-daten";

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

/** Anzeige im Footer (ohne Bindestriche) — Link bleibt SITE_CONFIG.url */
const FOOTER_DOMAIN_LABEL = "baerenwaldmuenchen.de";

/** Betreff für Kunden-Mail „Preis per E-Mail“ (Resend subject, nicht HTML). */
export const SAVE_PRICE_CUSTOMER_EMAIL_SUBJECT =
  "Deine Preisindikation — Bärenwald München";

function phoneDisplayMunichLandline(): string {
  const p = SITE_CONFIG.phone.replace(/\s/g, "");
  if (p.length === 11 && p.startsWith("0")) {
    return `${p.slice(0, 3)} ${p.slice(3, 7)} ${p.slice(7)}`;
  }
  return SITE_CONFIG.phone;
}

const LOGO_MARK_URL = `${SITE_CONFIG.url}/logo-mark-green.png`;

/**
 * Vorhaben für Kunden-Mails (z. B. „Bad erneuern“).
 */
export function formatVorhaben(
  situation?: string,
  bereiche?: string[]
): string {
  const bereichMap: Record<string, string> = {
    bad: "Bad",
    boden: "Boden",
    malerarbeiten: "Streichen",
    elektro: "Elektro",
    heizung: "Heizung",
    fenster: "Fenster & Türen",
    trockenbau: "Wände & Decken",
    dach: "Dach",
    garten: "Garten",
    reinigung: "Reinigung",
    winterdienst: "Winterdienst",
    hausmeister: "Hausmeister",
  };
  const situationMap: Record<string, string> = {
    erneuern: "erneuern",
    kaputt: "reparieren",
    notfall: "Notfall",
    betreuung: "Betreuung",
  };
  const b = bereiche?.[0]?.trim() ?? "";
  const sRaw = (situation ?? "").trim();
  const s = sRaw === "—" ? "" : sRaw;

  const bereichLabel = b ? bereichMap[b] ?? b.replace(/_/g, " ") : "";
  const situationLabel = s ? situationMap[s] ?? s : "";

  return bereichLabel && situationLabel
    ? `${bereichLabel} ${situationLabel}`
    : bereichLabel || situationLabel || "Anfrage";
}

export type KundeBestaetigungMailData = {
  name?: string;
  situation?: string;
  bereiche?: string[];
  plz?: string;
  preis?: string;
};

/**
 * Bestätigungsmail an Kund:innen (Lead / Website).
 * Allianz-artig: weiß, minimal, Logo oben links, kein Dark Mode.
 */
export function buildKundeBestaetigung(
  data: KundeBestaetigungMailData
): string {
  const vorhaben = formatVorhaben(data.situation, data.bereiche);
  const nameRaw = (data.name ?? "").trim();
  const vorname = nameRaw.includes(" ")
    ? nameRaw.split(/\s+/)[0]
    : nameRaw;
  const halloName = esc(vorname || nameRaw);
  const plzLine = data.plz?.trim();
  const plzSuffix = plzLine ? ` · ${esc(plzLine)}` : "";
  const siteUrl = escAttr(SITE_CONFIG.url);
  const siteLabel = esc(FOOTER_DOMAIN_LABEL);
  const phoneTxt = esc(phoneDisplayMunichLandline());

  const kastenHtml = vorhaben
    ? `
<tr>
  <td style="padding:0 0 28px 0;">
    <table width="100%"
      cellpadding="0" cellspacing="0"
      style="border:1px solid #E5E7EB;
      border-radius:8px;">
    <tr>
      <td style="padding:20px 24px;">
        <p style="margin:0 0 6px;
          font-size:12px;
          font-weight:700;
          text-transform:uppercase;
          letter-spacing:1px;
          color:#9CA3AF;">
          Deine Anfrage${plzSuffix}
        </p>
        <p style="margin:0 0 4px;
          font-size:18px;
          font-weight:800;
          color:#111827;">
          ${esc(vorhaben)}
        </p>
        ${
          data.preis?.trim()
            ? `<p style="margin:4px 0 0;
          font-size:15px;
          font-weight:600;
          color:#2E7D52;">
          ${esc(data.preis.trim())}
        </p>`
            : ""
        }
      </td>
    </tr>
    </table>
  </td>
</tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="de"
  xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8"/>
<meta name="viewport"
  content="width=device-width,
  initial-scale=1.0"/>
<meta name="color-scheme"
  content="light"/>
<meta name="supported-color-schemes"
  content="light"/>
</head>
<body style="margin:0;padding:0;
  background:#ffffff;
  font-family:Arial,Helvetica,
  sans-serif;
  -webkit-text-size-adjust:100%;
  color-scheme:light;">

<table width="100%"
  cellpadding="0" cellspacing="0"
  style="background:#ffffff;">
<tr><td align="center"
  style="padding:32px 16px;">

<table width="100%"
  style="max-width:560px;
  background:#ffffff;"
  cellpadding="0" cellspacing="0">

<tr>
  <td style="padding:0 0 24px 0;">
    <table cellpadding="0"
      cellspacing="0">
    <tr>
      <td style="padding-right:10px;
        vertical-align:middle;">
        <img
          src="${escAttr(LOGO_MARK_URL)}"
          height="32"
          width="32"
          alt=""
          style="display:block;
          border:0;
          height:32px;
          width:32px;"/>
      </td>
      <td style="vertical-align:middle;">
        <span style="font-size:16px;
          font-weight:700;
          color:#1A3D2B;
          letter-spacing:-0.3px;">
          Bärenwald
        </span>
      </td>
    </tr>
    </table>
  </td>
</tr>

<tr>
  <td style="padding:0 0 32px 0;">
    <hr style="border:none;
      border-top:1px solid #E5E7EB;
      margin:0;"/>
  </td>
</tr>

<tr>
  <td style="padding:0 0 12px 0;">
    <h1 style="margin:0;
      font-size:24px;
      font-weight:800;
      color:#111827;
      line-height:1.3;">
      Danke für deine Anfrage.
    </h1>
  </td>
</tr>

<tr>
  <td style="padding:0 0 28px 0;">
    <p style="margin:0;
      font-size:15px;
      color:#6B7280;
      line-height:1.7;">
      Hallo ${halloName},<br/><br/>
      deine Anfrage ist bei uns
      eingegangen. Wir schauen sie
      uns an und melden uns
      ${SITE_CONFIG.responseSlaWithin}
      für einen
      Vor-Ort-Termin.
    </p>
  </td>
</tr>

${kastenHtml}

<tr>
  <td style="padding:0 0 40px 0;">
    <p style="margin:0;
      font-size:15px;
      color:#374151;
      line-height:1.7;">
      Bis bald.<br/><br/>
      Viele Grüße<br/>
      <strong>Dein Bärenwald Team</strong>
    </p>
  </td>
</tr>

<tr>
  <td style="padding:0 0 20px 0;">
    <hr style="border:none;
      border-top:1px solid #E5E7EB;
      margin:0;"/>
  </td>
</tr>

<tr>
  <td>
    <p style="margin:0;
      font-size:12px;
      color:#9CA3AF;
      line-height:1.6;">
      Bärenwald München ·
      <a href="${siteUrl}"
        style="color:#9CA3AF;
        text-decoration:none;">
        ${siteLabel}
      </a>
      · ${phoneTxt}
    </p>
    <p style="margin:8px 0 0;
      font-size:11px;
      color:#D1D5DB;">
      Du erhältst diese Mail weil
      du eine Anfrage über unsere
      Webseite gestellt hast.
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
  strasse?: string;
  hausnummer?: string;
  bereiche?: string[];
  preis_min?: number;
  preis_max?: number;
  nachricht?: string;
  funnel_daten?: unknown;
  kanal?: string;
  dashboardUrl?: string;
  quelle?: string;
  createdAt?: string;
  leadId?: string;
};

export { buildInternNotificationSubject };

function sectionHeader(title: string): string {
  return `<tr>
  <td colspan="2" style="padding:12px 16px 4px;font-size:10px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.1em;background:white;border-top:1px solid #F3F4F6;">
    ${esc(title)}
  </td>
</tr>`;
}

function dataRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:8px 16px;font-size:13px;color:#6B7280;width:120px;vertical-align:top;white-space:nowrap;">
    ${esc(label)}
  </td>
  <td style="padding:8px 16px;font-size:13px;color:#111;font-weight:500;vertical-align:top;">
    ${cellHtml(value)}
  </td>
</tr>`;
}

function optionalRow(label: string, value: string | undefined): string {
  const v = value?.trim();
  return v ? dataRow(label, v) : "";
}

function priceBox(min: number, max: number): string {
  const text = formatPreisrahmenDe(min, max);
  if (!text) return "";
  return `<tr>
  <td colspan="2" style="padding:8px 16px 12px;">
    <div style="background:#EAF3DE;border-radius:6px;padding:10px 14px;font-size:14px;font-weight:600;color:#1A3D2B;">
      💶 Preisrahmen: ${esc(text)}
    </div>
  </td>
</tr>`;
}

function freitextBox(text: string): string {
  return `<tr>
  <td colspan="2" style="padding:4px 0 12px;">
    <p style="margin:0 16px 6px;font-size:10px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.1em;">
      Nachricht vom Kunden
    </p>
    <div style="background:#F9FAFB;border-radius:6px;padding:12px 14px;font-size:13px;color:#374151;line-height:1.6;border-left:3px solid #E5E7EB;margin:0 16px;">
      ${cellHtml(text)}
    </div>
  </td>
</tr>`;
}

/**
 * Interne Lead-Benachrichtigung — strukturierte Sektionen + CRM-Link.
 */
export function buildInternNotification(data: InternLeadMailData): string {
  const norm = normalizeFunnelDaten(data.funnel_daten, data.bereiche);
  const bereiche = norm.bereiche.length > 0 ? norm.bereiche : data.bereiche ?? [];
  const bereicheLabels =
    bereiche.map((b) => labelBereich(b)).join(" · ") || "—";

  const dring =
    labelDringlichkeit(norm.dringlichkeit) ||
    labelZeitraum(norm.zeitraum);
  const zugang = labelZugaenglichkeit(norm.zugaenglichkeit);

  const leistungen = buildLeistungenRows(norm);
  const breakdownRows = buildBreakdownRows(norm);
  const groessen = buildGroessenRows(norm);
  const hasLeistungen =
    leistungen.length > 0 ||
    breakdownRows.length > 0 ||
    groessen.length > 0;

  const { min: effMin, max: effMax } = effectivePreisRange(
    data.preis_min,
    data.preis_max,
    norm
  );

  const freitext = extractKundenFreitext(norm, data.nachricht);

  const fdRaw =
    data.funnel_daten && typeof data.funnel_daten === "object"
      ? (data.funnel_daten as Record<string, unknown>)
      : {};
  const produktRaw =
    fdRaw.produkt && typeof fdRaw.produkt === "object"
      ? (fdRaw.produkt as Record<string, unknown>)
      : null;
  const produktTitel =
    typeof produktRaw?.produkt_titel === "string"
      ? produktRaw.produkt_titel
      : undefined;
  const leistungLabel =
    typeof fdRaw.leistung_label === "string" ? fdRaw.leistung_label : undefined;

  const kontaktRows = [
    optionalRow("Name", data.name),
    optionalRow("Telefon", data.telefon),
    optionalRow("E-Mail", data.email),
    optionalRow("PLZ", data.plz),
    optionalRow(
      "Anschrift",
      [data.strasse?.trim(), data.hausnummer?.trim()].filter(Boolean).join(" ") ||
        undefined
    ),
    optionalRow("Kanal", data.kanal ?? "Website"),
    optionalRow("Eingeg.", data.createdAt),
  ].join("");

  const projektRows = [
    sectionHeader("Projektdetails"),
    optionalRow("Leistung", leistungLabel),
    optionalRow("Paket", produktTitel),
    dataRow("Vorhaben", labelSituation(norm.situation)),
    dataRow("Bereiche", bereicheLabels),
    optionalRow("Kundentyp", labelKundentyp(norm.kundentyp)),
    optionalRow(
      "Zeitraum",
      labelZeitraum(norm.zeitraum) || undefined
    ),
    optionalRow("Dringlich.", dring || undefined),
    optionalRow("Zugang", zugang || undefined),
  ].join("");

  let leistungenHtml = "";
  if (hasLeistungen) {
    leistungenHtml = sectionHeader("Was soll gemacht werden");
    for (const row of leistungen) {
      leistungenHtml += dataRow(row.label, row.value);
    }
    for (const row of breakdownRows) {
      leistungenHtml += dataRow(row.label, row.value);
    }
    for (const row of groessen) {
      leistungenHtml += dataRow(row.label, row.value);
    }
  }

  const preisHtml = priceBox(effMin, effMax);
  const freitextHtml = freitext ? freitextBox(freitext) : "";

  const quelleRows = [
    sectionHeader("Quelle"),
    optionalRow("Quelle", data.quelle),
    optionalRow("Lead-ID", data.leadId),
  ].join("");

  const buttonBlock =
    data.dashboardUrl && data.dashboardUrl.trim().length > 0
      ? `
    <table cellpadding="0" cellspacing="0" style="margin:16px 16px 0;">
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
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
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
  <td style="padding:8px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1E1E1E;">
      ${kontaktRows}
      ${projektRows}
      ${leistungenHtml}
      ${preisHtml}
      ${freitextHtml}
      ${quelleRows}
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
  situation?: string;
  bereiche?: string[];
  plz?: string;
  preisMin?: number;
  preisMax?: number;
};

/** HTML-Mail: Preisindikation per E-Mail (Rechner / save-price). */
export function buildSavePriceCustomerHtml(
  data: SavePriceCustomerMailInput
): string {
  const vorhaben = formatVorhaben(data.situation, data.bereiche);
  const preis =
    typeof data.preisMin === "number" &&
    typeof data.preisMax === "number" &&
    data.preisMin > 0 &&
    data.preisMax > 0
      ? `${data.preisMin.toLocaleString("de-DE")} – ${data.preisMax.toLocaleString("de-DE")} €`
      : null;
  const plzLine = data.plz?.trim();
  const plzSuffix = plzLine ? ` · ${esc(plzLine)}` : "";
  const siteUrl = escAttr(SITE_CONFIG.url);
  const siteLabel = esc(FOOTER_DOMAIN_LABEL);
  const phoneTxt = esc(phoneDisplayMunichLandline());

  const kastenHtml = preis
    ? `
<tr>
  <td style="padding:0 0 28px 0;">
    <table width="100%"
      cellpadding="0" cellspacing="0"
      style="border:1px solid #E5E7EB;
      border-radius:8px;">
    <tr>
      <td style="padding:20px 24px;">
        <p style="margin:0 0 6px;
          font-size:12px;
          font-weight:700;
          text-transform:uppercase;
          letter-spacing:1px;
          color:#9CA3AF;">
          ${esc(vorhaben)}${plzSuffix}
        </p>
        <p style="margin:0;
          font-size:22px;
          font-weight:800;
          color:#2E7D52;">
          ${esc(preis)}
        </p>
      </td>
    </tr>
    </table>
  </td>
</tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="de"
  xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8"/>
<meta name="viewport"
  content="width=device-width,
  initial-scale=1.0"/>
<meta name="color-scheme"
  content="light"/>
<meta name="supported-color-schemes"
  content="light"/>
</head>
<body style="margin:0;padding:0;
  background:#ffffff;
  font-family:Arial,Helvetica,
  sans-serif;
  -webkit-text-size-adjust:100%;
  color-scheme:light;">

<table width="100%"
  cellpadding="0" cellspacing="0"
  style="background:#ffffff;">
<tr><td align="center"
  style="padding:32px 16px;">

<table width="100%"
  style="max-width:560px;
  background:#ffffff;"
  cellpadding="0" cellspacing="0">

<tr>
  <td style="padding:0 0 24px 0;">
    <table cellpadding="0"
      cellspacing="0">
    <tr>
      <td style="padding-right:10px;
        vertical-align:middle;">
        <img
          src="${escAttr(LOGO_MARK_URL)}"
          height="32"
          width="32"
          alt=""
          style="display:block;
          border:0;
          height:32px;
          width:32px;"/>
      </td>
      <td style="vertical-align:middle;">
        <span style="font-size:16px;
          font-weight:700;
          color:#1A3D2B;
          letter-spacing:-0.3px;">
          Bärenwald
        </span>
      </td>
    </tr>
    </table>
  </td>
</tr>

<tr>
  <td style="padding:0 0 32px 0;">
    <hr style="border:none;
      border-top:1px solid #E5E7EB;
      margin:0;"/>
  </td>
</tr>

<tr>
  <td style="padding:0 0 12px 0;">
    <h1 style="margin:0;
      font-size:24px;
      font-weight:800;
      color:#111827;
      line-height:1.3;">
      Deine erste Einschätzung.
    </h1>
  </td>
</tr>

<tr>
  <td style="padding:0 0 28px 0;">
    <p style="margin:0;
      font-size:15px;
      color:#6B7280;
      line-height:1.7;">
      Auf Basis unserer Erfahrung
      aus Münchner Projekten haben
      wir eine erste Preisindikation
      für dich zusammengestellt.
    </p>
  </td>
</tr>

${kastenHtml}

<tr>
  <td style="padding:0 0 32px 0;">
    <p style="margin:0;
      font-size:15px;
      color:#6B7280;
      line-height:1.7;">
      Das ist eine unverbindliche
      Einschätzung — kein Angebot.
      Nach einem kurzen Vor-Ort-Termin
      nennen wir dir einen
      konkreten Preis.
    </p>
  </td>
</tr>

<tr>
  <td style="padding:0 0 40px 0;">
    <p style="margin:0;
      font-size:15px;
      color:#374151;
      line-height:1.7;">
      Wir melden uns bald.<br/><br/>
      Viele Grüße<br/>
      <strong>Dein Bärenwald Team</strong>
    </p>
  </td>
</tr>

<tr>
  <td style="padding:0 0 20px 0;">
    <hr style="border:none;
      border-top:1px solid #E5E7EB;
      margin:0;"/>
  </td>
</tr>

<tr>
  <td>
    <p style="margin:0;
      font-size:12px;
      color:#9CA3AF;
      line-height:1.6;">
      Bärenwald München ·
      <a href="${siteUrl}"
        style="color:#9CA3AF;
        text-decoration:none;">
        ${siteLabel}
      </a>
      · ${phoneTxt}
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
  bereiche: string[];
  plz: string;
  priceMin: number;
  priceMax: number;
};

export function buildSavePriceInternalHtml(
  input: SavePriceInternalMailInput
): string {
  const preis = `${input.priceMin.toLocaleString("de-DE")} – ${input.priceMax.toLocaleString("de-DE")} €`;
  const vorhaben = formatVorhaben(input.situation, input.bereiche);
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;background:#f7f6f3;">
<table width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:20px;">
<tr><td>
  <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1A3D2B;text-transform:uppercase;">Rechner · Preis per E-Mail</p>
  <table style="width:100%;font-size:14px;">
    <tr><td style="padding:6px 0;color:#6B7280;width:38%;">E-Mail</td><td style="padding:6px 0;">${esc(input.email)}</td></tr>
    <tr><td style="padding:6px 0;color:#6B7280;">Vorhaben</td><td style="padding:6px 0;">${esc(vorhaben)}</td></tr>
    <tr><td style="padding:6px 0;color:#6B7280;">PLZ</td><td style="padding:6px 0;">${esc(input.plz)}</td></tr>
    <tr><td style="padding:6px 0;color:#6B7280;">Preisindikation</td><td style="padding:6px 0;font-weight:700;color:#2E7D52;">${esc(preis)}</td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}
