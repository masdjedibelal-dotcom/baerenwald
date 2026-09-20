import { MAIL_COLORS } from "@/lib/tokens/mail-colors";
import { SITE_CONFIG } from "@/lib/config";
import {
  buildStandardMailHtml,
  mailPrimaryButtonHtml,
  mailTeamGrussHtml,
} from "@/lib/email/mail-shell";
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
import { buildSubject } from "@/lib/shared-domain/build-subject";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellHtml(value: string): string {
  return esc(value).replace(/\n/g, "<br/>");
}

/** Betreff für Kunden-Mail „Preis per E-Mail“ (Resend subject, nicht HTML). */
export const SAVE_PRICE_CUSTOMER_EMAIL_SUBJECT = buildSubject({
  ereignis: "Preisindikation",
  objektFallback: "Rechner",
});

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
 * Standard-Hülle: Logo + Footer; Body ohne dunklen Header.
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

  const kastenHtml = vorhaben
    ? `
    <div style="margin:0 0 28px;border:1px solid ${MAIL_COLORS.gray200};border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${MAIL_COLORS.gray400};">
        Ihre Anfrage${plzSuffix}
      </p>
      <p style="margin:0 0 4px;font-size:18px;font-weight:800;color:${MAIL_COLORS.c2};">
        ${esc(vorhaben)}
      </p>
      ${
        data.preis?.trim()
          ? `<p style="margin:4px 0 0;font-size:15px;font-weight:600;color:${MAIL_COLORS.primary};">${esc(data.preis.trim())}</p>`
          : ""
      }
    </div>`
    : "";

  return buildStandardMailHtml({
    preheader: "Danke für Ihre Anfrage.",
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${MAIL_COLORS.c2};line-height:1.3;">
        Danke für Ihre Anfrage.
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:${MAIL_COLORS.muted};line-height:1.7;">
        Guten Tag ${halloName},<br/><br/>
        Ihre Anfrage ist bei uns eingegangen. Wir schauen sie uns an und melden uns
        ${SITE_CONFIG.responseSlaWithin} für einen Vor-Ort-Termin.
      </p>
      ${kastenHtml}
      <p style="margin:0;font-size:15px;color:${MAIL_COLORS.gray700};line-height:1.7;">
        Bis bald.<br/><br/>
        ${mailTeamGrussHtml("sie")}
      </p>
    `,
    disclaimer:
      "Sie erhalten diese Mail, weil Sie eine Anfrage über unsere Webseite gestellt haben.",
  });
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
  <td colspan="2" style="padding:12px 16px 4px;font-size:10px;font-weight:600;color:${MAIL_COLORS.gray400};text-transform:uppercase;letter-spacing:0.1em;background:white;border-top:1px solid ${MAIL_COLORS.c19};">
    ${esc(title)}
  </td>
</tr>`;
}

function dataRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:8px 16px;font-size:13px;color:${MAIL_COLORS.muted};width:120px;vertical-align:top;white-space:nowrap;">
    ${esc(label)}
  </td>
  <td style="padding:8px 16px;font-size:13px;color:${MAIL_COLORS.c1};font-weight:500;vertical-align:top;">
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
    <div style="background:${MAIL_COLORS.c16};border-radius:6px;padding:10px 14px;font-size:14px;font-weight:600;color:${MAIL_COLORS.primaryDk};">
      💶 Preisrahmen: ${esc(text)}
    </div>
  </td>
</tr>`;
}

function freitextBox(text: string): string {
  return `<tr>
  <td colspan="2" style="padding:4px 0 12px;">
    <p style="margin:0 16px 6px;font-size:10px;font-weight:600;color:${MAIL_COLORS.gray400};text-transform:uppercase;letter-spacing:0.1em;">
      Nachricht vom Kunden
    </p>
    <div style="background:${MAIL_COLORS.c22};border-radius:6px;padding:12px 14px;font-size:13px;color:${MAIL_COLORS.gray700};line-height:1.6;border-left:3px solid ${MAIL_COLORS.gray200};margin:0 16px;">
      ${cellHtml(text)}
    </div>
  </td>
</tr>`;
}

/**
 * Interne Lead-Benachrichtigung — strukturierte Sektionen + optional ein CRM-CTA.
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

  const cta =
    data.dashboardUrl && data.dashboardUrl.trim().length > 0
      ? mailPrimaryButtonHtml("Im CRM öffnen →", data.dashboardUrl.trim())
      : "";

  return buildStandardMailHtml({
    preheader: "Bärenwald — Neue Anfrage",
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${MAIL_COLORS.c2};">
        Bärenwald — Neue Anfrage
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:${MAIL_COLORS.c4};">
        ${kontaktRows}
        ${projektRows}
        ${leistungenHtml}
        ${preisHtml}
        ${freitextHtml}
        ${quelleRows}
      </table>
      ${cta}
    `,
    footerNote: "Bärenwald München · Interne Benachrichtigung",
  });
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

  const kastenHtml = preis
    ? `
    <div style="margin:0 0 28px;border:1px solid ${MAIL_COLORS.gray200};border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${MAIL_COLORS.gray400};">
        ${esc(vorhaben)}${plzSuffix}
      </p>
      <p style="margin:0;font-size:22px;font-weight:800;color:${MAIL_COLORS.primary};">
        ${esc(preis)}
      </p>
    </div>`
    : "";

  return buildStandardMailHtml({
    preheader: "Ihre erste Einschätzung.",
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${MAIL_COLORS.c2};line-height:1.3;">
        Ihre erste Einschätzung.
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:${MAIL_COLORS.muted};line-height:1.7;">
        Auf Basis unserer Erfahrung aus Münchner Projekten haben wir eine erste
        Preisindikation für Sie zusammengestellt.
      </p>
      ${kastenHtml}
      <p style="margin:0 0 32px;font-size:15px;color:${MAIL_COLORS.muted};line-height:1.7;">
        Das ist eine unverbindliche Einschätzung — kein Angebot. Nach einem kurzen
        Vor-Ort-Termin nennen wir Ihnen einen konkreten Preis.
      </p>
      <p style="margin:0;font-size:15px;color:${MAIL_COLORS.gray700};line-height:1.7;">
        Wir melden uns bald.<br/><br/>
        ${mailTeamGrussHtml("sie")}
      </p>
    `,
  });
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
  return buildStandardMailHtml({
    preheader: "Rechner · Preis per E-Mail",
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:${MAIL_COLORS.c2};text-transform:uppercase;">
        Rechner · Preis per E-Mail
      </p>
      <table style="width:100%;font-size:14px;" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:${MAIL_COLORS.muted};width:38%;">E-Mail</td><td style="padding:6px 0;">${esc(input.email)}</td></tr>
        <tr><td style="padding:6px 0;color:${MAIL_COLORS.muted};">Vorhaben</td><td style="padding:6px 0;">${esc(vorhaben)}</td></tr>
        <tr><td style="padding:6px 0;color:${MAIL_COLORS.muted};">PLZ</td><td style="padding:6px 0;">${esc(input.plz)}</td></tr>
        <tr><td style="padding:6px 0;color:${MAIL_COLORS.muted};">Preisindikation</td><td style="padding:6px 0;font-weight:700;color:${MAIL_COLORS.primary};">${esc(preis)}</td></tr>
      </table>
    `,
    footerNote: "Bärenwald München · Interne Benachrichtigung",
  });
}
