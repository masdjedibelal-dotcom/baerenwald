import { SITE_CONFIG } from "@/lib/config";
import { meldeBereichLabel } from "@/lib/org/melde-bereiche";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";

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

function orgPortalDeepLink(portalPath?: string): string {
  const base = SITE_CONFIG.url.replace(/\/$/, "");
  const path =
    portalPath?.startsWith("/") ? portalPath : "/portal?section=freigabe";
  return `${base}${path}`;
}

const ZEITRAUM_LABELS: Record<string, string> = {
  sofort: "So bald wie möglich",
  diese_woche: "Diese Woche",
  flexibel: "Flexibel",
};

function zeitraumLabel(raw: string | null | undefined): string | undefined {
  const v = (raw ?? "").trim();
  if (!v) return undefined;
  return ZEITRAUM_LABELS[v] ?? v.replace(/_/g, " ");
}

function mailDataRow(label: string, value: string | undefined | null): string {
  const v = value?.trim();
  if (!v) return "";
  return `<tr>
  <td style="padding:10px 16px;font-size:12px;color:#6b7f74;vertical-align:top;width:130px;border-top:1px solid #eef0ee">${esc(label)}</td>
  <td style="padding:10px 16px;font-size:14px;color:#1a2420;vertical-align:top;border-top:1px solid #eef0ee">${esc(v).replace(/\n/g, "<br/>")}</td>
</tr>`;
}

/** Bärenwald-Standard: dunkler Header, weiße Karte, CTA-Button. */
function wrapBaerenwaldMail(opts: {
  headerTitle: string;
  bodyHtml: string;
  ctaHref?: string;
  ctaLabel?: string;
}): string {
  const button =
    opts.ctaHref && opts.ctaLabel
      ? `
    <table cellpadding="0" cellspacing="0" style="margin:20px 16px 8px;">
    <tr>
      <td style="background:#2E7D52;border-radius:6px;">
        <a href="${escAttr(opts.ctaHref)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
          ${esc(opts.ctaLabel)}
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
      ${esc(opts.headerTitle)}
    </p>
  </td>
</tr>

<tr>
  <td style="padding:20px 8px 24px;">
    ${opts.bodyHtml}
    ${button}
  </td>
</tr>

</table>
</td></tr>
</table>

</body>
</html>`;
}

export type OrgNeueMeldungMailInput = {
  objektTitel: string;
  melderName: string;
  melderEinheit?: string;
  melderTelefon?: string;
  melderEmail?: string;
  kategorie: string;
  bereichId?: string;
  beschreibung?: string;
  fotoCount?: number;
  dringlichkeit?: string | null;
  /** mieter = Meldeformular · hausverwaltung = HV hat selbst erfasst */
  quelle?: "mieter" | "hausverwaltung";
  portalPath?: string;
};

export function buildOrgNeueMeldungSubject(objektTitel: string): string {
  const obj = objektTitel.trim() || "Objekt";
  return `Neuer Vorgang — ${obj}`;
}

/** M2 — HV: neuer Vorgang (Mieter-Meldung oder HV-Direkt) */
export function buildOrgNeueMeldungHtml(input: OrgNeueMeldungMailInput): string {
  const kat = meldeKategorieLabel(input.kategorie);
  const bereich = meldeBereichLabel(input.bereichId);
  const link = orgPortalDeepLink(input.portalPath);
  const quelle = input.quelle ?? "mieter";
  const einleitung =
    quelle === "hausverwaltung"
      ? `Für <strong>${esc(input.objektTitel)}</strong> wurde ein neuer Vorgang von Ihrer Hausverwaltung erfasst.`
      : `Für <strong>${esc(input.objektTitel)}</strong> wurde ein neuer Vorgang durch eine <strong>Mieter-Meldung</strong> erstellt.`;

  const kontakt = [input.melderEmail?.trim(), input.melderTelefon?.trim()]
    .filter(Boolean)
    .join(" · ");

  const rows = [
    mailDataRow("Art", kat),
    mailDataRow("Bereich", bereich),
    mailDataRow(
      "Melder",
      input.melderEinheit?.trim()
        ? `${input.melderName} (${input.melderEinheit.trim()})`
        : input.melderName
    ),
    mailDataRow("Kontakt", kontakt || undefined),
    mailDataRow("Dringlichkeit", zeitraumLabel(input.dringlichkeit)),
    mailDataRow(
      "Fotos",
      input.fotoCount != null && input.fotoCount > 0
        ? `${input.fotoCount} Bild${input.fotoCount === 1 ? "" : "er"}`
        : undefined
    ),
    mailDataRow("Beschreibung", input.beschreibung),
  ].join("");

  const table = rows.trim()
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 8px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fafbfa">
${rows}
</table>`
    : "";

  const bodyHtml = `
    <div style="padding:0 16px;">
      <p style="margin:0 0 12px;font-size:15px;color:#1a2420;line-height:1.55">Guten Tag,</p>
      <p style="margin:0 0 8px;font-size:15px;color:#1a2420;line-height:1.55">${einleitung}</p>
    </div>
    ${table}
    <p style="margin:8px 16px 0;font-size:14px;color:#374151;line-height:1.55">Bitte prüfen Sie den Vorgang im Auftraggeber-Portal und wählen Sie den nächsten Schritt (z.&nbsp;B. Angebot einfordern oder Sofort beauftragen bei Kleinreparatur).</p>
  `;

  return wrapBaerenwaldMail({
    headerTitle: "Bärenwald — Neuer Vorgang",
    bodyHtml,
    ctaHref: link,
    ctaLabel: "Zum Auftraggeber-Portal →",
  });
}

/** @deprecated Mieter-Mail-Versand deaktiviert — nur HV-Benachrichtigung. */
export function buildMelderBestaetigungHtml(input: {
  melderName: string;
  orgName: string;
  objektTitel: string;
  kategorie: string;
  referenz?: string;
  statusLink?: string;
  introNote?: string;
  footerNote?: string;
}): string {
  const kat = meldeKategorieLabel(input.kategorie);
  const statusBlock = input.statusLink
    ? `<p style="margin:20px 0"><a href="${esc(input.statusLink)}" style="display:inline-block;background:#1a5c3a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Status verfolgen</a></p>`
    : "";
  const intro =
    input.introNote?.trim() ||
    `${esc(input.orgName)} bearbeitet Ihre Meldung und meldet sich zum nächsten Schritt.`;
  const footer =
    input.footerNote?.trim() ||
    `Bei Rückfragen wenden Sie sich an ${esc(input.orgName)}.`;
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Hallo ${esc(input.melderName)},</p>
  <p>wir haben deine <strong>${esc(kat)}</strong>-Meldung für <strong>${esc(input.objektTitel)}</strong> erhalten.</p>
  <p>${intro}</p>
  ${statusBlock}
  ${input.referenz ? `<p style="color:#6b7f74;font-size:14px">Referenz: ${esc(input.referenz)}</p>` : ""}
  <p style="margin-top:24px;color:#6b7f74;font-size:13px">${footer}</p>
  <p style="margin-top:16px">Herzliche Grüße<br/>${esc(input.orgName)}</p>
</body>
</html>`;
}

export function buildMelderBestaetigungSubject(kategorie: string): string {
  return `Meldung eingegangen — ${meldeKategorieLabel(kategorie)}`;
}

/** M3 — HV: Angebot eingefordert (Bestätigung) */
export function buildOrgAngebotEingefordertHtml(input: {
  orgName: string;
  objektTitel: string;
  melderName?: string;
  portalPath?: string;
}): string {
  const link = orgPortalDeepLink(input.portalPath);
  return wrapBaerenwaldMail({
    headerTitle: "Bärenwald — Angebot eingefordert",
    bodyHtml: `
    <div style="padding:0 16px;">
      <p style="margin:0 0 12px;font-size:15px;color:#1a2420;line-height:1.55">Guten Tag,</p>
      <p style="margin:0;font-size:15px;color:#1a2420;line-height:1.55">Für <strong>${esc(input.objektTitel)}</strong>${input.melderName ? ` (${esc(input.melderName)})` : ""} erstellt Bärenwald ein Angebot. Sie sehen es im Portal, sobald es vorliegt.</p>
    </div>`,
    ctaHref: link,
    ctaLabel: "Zum Auftraggeber-Portal →",
  });
}

/** M5 — Mieter: Einladung zur Ergänzung */
export function buildMelderEinladungHtml(input: {
  melderName: string;
  orgName: string;
  objektTitel: string;
  link: string;
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Hallo ${esc(input.melderName)},</p>
  <p>${esc(input.orgName)} hat eine Meldung für <strong>${esc(input.objektTitel)}</strong> vorgemerkt. Bitte ergänze kurz Details und Fotos:</p>
  <p><a href="${esc(input.link)}" style="display:inline-block;background:#1a3d2b;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Meldung ergänzen</a></p>
  <p style="color:#6b7f74;font-size:14px">Link: ${esc(input.link)}</p>
</body>
</html>`;
}

/** M6 — Mieter: Meldung abgelehnt */
export function buildMelderAbgelehntHtml(input: {
  melderName: string;
  orgName: string;
  objektTitel: string;
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Hallo ${esc(input.melderName)},</p>
  <p>${esc(input.orgName)} hat deine Meldung für <strong>${esc(input.objektTitel)}</strong> ohne Beauftragung abgeschlossen.</p>
  <p>Bei Rückfragen wende dich bitte direkt an deine Hausverwaltung.</p>
</body>
</html>`;
}

/** M7 — HV: Kleinreparatur freigegeben */
export function buildOrgKleinreparaturHtml(input: {
  objektTitel: string;
  melderName?: string;
  portalPath?: string;
}): string {
  const link = orgPortalDeepLink(input.portalPath);
  return wrapBaerenwaldMail({
    headerTitle: "Bärenwald — Sofort beauftragt",
    bodyHtml: `
    <div style="padding:0 16px;">
      <p style="margin:0 0 12px;font-size:15px;color:#1a2420;line-height:1.55">Guten Tag,</p>
      <p style="margin:0;font-size:15px;color:#1a2420;line-height:1.55"><strong>${esc(input.objektTitel)}</strong>${input.melderName ? ` · ${esc(input.melderName)}` : ""} — Kleinreparatur: Der Handwerker rückt ohne formales Angebot aus und kann direkt starten.</p>
    </div>`,
    ctaHref: link,
    ctaLabel: "Zum Auftraggeber-Portal →",
  });
}

/** M8 — HV: Angebot zur Freigabe (über Schwelle) */
export function buildOrgAngebotFreigabeHtml(input: {
  objektTitel: string;
  betrag?: string;
  portalPath?: string;
}): string {
  const link = orgPortalDeepLink(input.portalPath);
  return wrapBaerenwaldMail({
    headerTitle: "Bärenwald — Freigabe erforderlich",
    bodyHtml: `
    <div style="padding:0 16px;">
      <p style="margin:0 0 12px;font-size:15px;color:#1a2420;line-height:1.55">Guten Tag,</p>
      <p style="margin:0;font-size:15px;color:#1a2420;line-height:1.55">Für <strong>${esc(input.objektTitel)}</strong>${input.betrag ? ` (${esc(input.betrag)})` : ""} liegt ein Angebot vor. Bitte im Portal freigeben oder ablehnen.</p>
    </div>`,
    ctaHref: link,
    ctaLabel: "Zum Auftraggeber-Portal →",
  });
}

/** HV: Angebot unter Freigabeschwelle — Direkt Durchführung, kein Freigabe-Button. */
export function buildOrgAngebotUnterSchwelleHtml(input: {
  objektTitel: string;
  betrag?: string;
  schwelleLabel?: string;
  portalPath?: string;
}): string {
  const link = orgPortalDeepLink(input.portalPath);
  const schwelle =
    input.schwelleLabel?.trim() != null && input.schwelleLabel.trim() !== ""
      ? ` (Freigabeschwelle ${esc(input.schwelleLabel.trim())})`
      : "";
  return wrapBaerenwaldMail({
    headerTitle: "Bärenwald — Angebot unter Freigabeschwelle",
    bodyHtml: `
    <div style="padding:0 16px;">
      <p style="margin:0 0 12px;font-size:15px;color:#1a2420;line-height:1.55">Guten Tag,</p>
      <p style="margin:0 0 12px;font-size:15px;color:#1a2420;line-height:1.55">Für <strong>${esc(input.objektTitel)}</strong>${input.betrag ? ` liegt ein Angebot (${esc(input.betrag)})` : " liegt ein Angebot"} unter Ihrer Freigabeschwelle${schwelle}.</p>
      <p style="margin:0;font-size:15px;color:#1a2420;line-height:1.55"><strong>Direkt Durchführung:</strong> Der Handwerker kann ohne Ihre Freigabe starten. Im Portal sehen Sie den Hinweis — einen Freigabe-Button gibt es nicht.</p>
    </div>`,
    ctaHref: link,
    ctaLabel: "Zum Auftraggeber-Portal →",
  });
}

/** HV: Ereignis-Hinweis (kein Mieter-Mail, kein Status-Link). */
export function buildOrgHvMieterEventHtml(input: {
  objektTitel: string;
  melderName?: string;
  eventTitel: string;
  eventBody: string;
  portalPath?: string;
}): string {
  const link = orgPortalDeepLink(input.portalPath);
  const melder = input.melderName?.trim()
    ? ` (${esc(input.melderName.trim())})`
    : "";
  return wrapBaerenwaldMail({
    headerTitle: `Bärenwald — ${input.eventTitel}`,
    bodyHtml: `
    <div style="padding:0 16px;">
      <p style="margin:0 0 12px;font-size:15px;color:#1a2420;line-height:1.55">Guten Tag,</p>
      <p style="margin:0 0 12px;font-size:15px;color:#1a2420;line-height:1.55"><strong>${esc(input.eventTitel)}</strong> — <strong>${esc(input.objektTitel)}</strong>${melder}</p>
      <p style="margin:0;font-size:15px;color:#1a2420;line-height:1.55">${esc(input.eventBody)}</p>
    </div>`,
    ctaHref: link,
    ctaLabel: "Zum Auftraggeber-Portal →",
  });
}
