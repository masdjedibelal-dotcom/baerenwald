import { SITE_CONFIG } from "@/lib/config";
import { meldeBereichLabel } from "@/lib/org/melde-bereiche";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import {
  buildStandardMailHtml,
  mailBegruessungHtml,
  mailPrimaryButtonHtml,
  mailTeamGrussHtml,
} from "@/lib/email/mail-shell";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  <td style="padding:8px 0;font-size:13px;color:#6B7280;vertical-align:top;width:36%;">${esc(label)}</td>
  <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1F2937;vertical-align:top;">${esc(v).replace(/\n/g, "<br/>")}</td>
</tr>`;
}

function mailSummaryTable(rows: string): string {
  if (!rows.trim()) return "";
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
<tr><td style="padding:16px 20px;background:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size:14px;">
${rows}
</table>
</td></tr>
</table>`;
}

/** Org-/HV-Mails: Standard-Hülle + Sie-Anrede + Team-Gruß + optional CTA. */
function wrapOrgMail(opts: {
  preheader: string;
  bodyInnerHtml: string;
  ctaHref?: string;
  ctaLabel?: string;
  disclaimer?: string;
}): string {
  const cta =
    opts.ctaHref && opts.ctaLabel
      ? mailPrimaryButtonHtml(opts.ctaLabel, opts.ctaHref)
      : "";
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${mailBegruessungHtml("sie")}</p>
    ${opts.bodyInnerHtml}
    ${cta}
    <p style="margin:24px 0 0;font-size:15px;color:#374151;line-height:1.6;">${mailTeamGrussHtml("sie")}</p>
  `;
  return buildStandardMailHtml({
    preheader: opts.preheader,
    bodyHtml,
    disclaimer:
      opts.disclaimer ??
      "Sie erhalten diese Mail, weil für Ihr Objekt ein Vorgang im Auftraggeber-Portal angelegt wurde.",
  });
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

  return wrapOrgMail({
    preheader: `Neuer Vorgang — ${input.objektTitel}`,
    bodyInnerHtml: `
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">${einleitung}</p>
      ${mailSummaryTable(rows)}
      <p style="margin:8px 0 0;font-size:14px;color:#374151;line-height:1.55;">Bitte prüfen Sie den Vorgang im Auftraggeber-Portal und wählen Sie den nächsten Schritt (z.&nbsp;B. Angebot einfordern oder Sofort beauftragen bei Kleinreparatur).</p>
    `,
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
    ? mailPrimaryButtonHtml("Status verfolgen", input.statusLink)
    : "";
  const intro =
    input.introNote?.trim() ||
    `${esc(input.orgName)} bearbeitet Ihre Meldung und meldet sich zum nächsten Schritt.`;
  const footer =
    input.footerNote?.trim() ||
    `Bei Rückfragen wenden Sie sich an ${esc(input.orgName)}.`;
  return buildStandardMailHtml({
    preheader: `Meldung eingegangen — ${kat}`,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${mailBegruessungHtml("du", input.melderName)}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">wir haben deine <strong>${esc(kat)}</strong>-Meldung für <strong>${esc(input.objektTitel)}</strong> erhalten.</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${intro}</p>
      ${statusBlock}
      ${input.referenz ? `<p style="margin:12px 0 0;font-size:13px;color:#6B7280;">Referenz: ${esc(input.referenz)}</p>` : ""}
      <p style="margin:16px 0 0;font-size:13px;color:#6B7280;">${footer}</p>
      <p style="margin:24px 0 0;font-size:15px;color:#374151;line-height:1.6;">${mailTeamGrussHtml("du")}</p>
    `,
  });
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
  return wrapOrgMail({
    preheader: `Angebot eingefordert — ${input.objektTitel}`,
    bodyInnerHtml: `
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Für <strong>${esc(input.objektTitel)}</strong>${input.melderName ? ` (${esc(input.melderName)})` : ""} erstellt Bärenwald ein Angebot. Sie sehen es im Portal, sobald es vorliegt.</p>
    `,
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
  return buildStandardMailHtml({
    preheader: `Meldung ergänzen — ${input.objektTitel}`,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${mailBegruessungHtml("du", input.melderName)}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${esc(input.orgName)} hat eine Meldung für <strong>${esc(input.objektTitel)}</strong> vorgemerkt. Bitte ergänze kurz Details und Fotos:</p>
      ${mailPrimaryButtonHtml("Meldung ergänzen", input.link)}
      <p style="margin:12px 0 0;font-size:13px;color:#6B7280;word-break:break-all;">Link: ${esc(input.link)}</p>
      <p style="margin:24px 0 0;font-size:15px;color:#374151;line-height:1.6;">${mailTeamGrussHtml("du")}</p>
    `,
  });
}

/** M6 — Mieter: Meldung abgelehnt */
export function buildMelderAbgelehntHtml(input: {
  melderName: string;
  orgName: string;
  objektTitel: string;
}): string {
  return buildStandardMailHtml({
    preheader: `Meldung abgeschlossen — ${input.objektTitel}`,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${mailBegruessungHtml("du", input.melderName)}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${esc(input.orgName)} hat deine Meldung für <strong>${esc(input.objektTitel)}</strong> ohne Beauftragung abgeschlossen.</p>
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Bei Rückfragen wende dich bitte direkt an deine Hausverwaltung.</p>
      <p style="margin:24px 0 0;font-size:15px;color:#374151;line-height:1.6;">${mailTeamGrussHtml("du")}</p>
    `,
  });
}

/** M7 — HV: Kleinreparatur freigegeben */
export function buildOrgKleinreparaturHtml(input: {
  objektTitel: string;
  melderName?: string;
  portalPath?: string;
}): string {
  const link = orgPortalDeepLink(input.portalPath);
  return wrapOrgMail({
    preheader: `Sofort beauftragt — ${input.objektTitel}`,
    bodyInnerHtml: `
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;"><strong>${esc(input.objektTitel)}</strong>${input.melderName ? ` · ${esc(input.melderName)}` : ""} — Kleinreparatur: Der Handwerker rückt ohne formales Angebot aus und kann direkt starten.</p>
    `,
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
  return wrapOrgMail({
    preheader: `Freigabe erforderlich — ${input.objektTitel}`,
    bodyInnerHtml: `
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Für <strong>${esc(input.objektTitel)}</strong>${input.betrag ? ` (${esc(input.betrag)})` : ""} liegt ein Angebot vor. Bitte im Portal freigeben oder ablehnen.</p>
    `,
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
  return wrapOrgMail({
    preheader: `Angebot unter Freigabeschwelle — ${input.objektTitel}`,
    bodyInnerHtml: `
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Für <strong>${esc(input.objektTitel)}</strong>${input.betrag ? ` liegt ein Angebot (${esc(input.betrag)})` : " liegt ein Angebot"} unter Ihrer Freigabeschwelle${schwelle}.</p>
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;"><strong>Direkt Durchführung:</strong> Der Handwerker kann ohne Ihre Freigabe starten. Im Portal sehen Sie den Hinweis — einen Freigabe-Button gibt es nicht.</p>
    `,
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
  return wrapOrgMail({
    preheader: `${input.eventTitel} — ${input.objektTitel}`,
    bodyInnerHtml: `
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;"><strong>${esc(input.eventTitel)}</strong> — <strong>${esc(input.objektTitel)}</strong>${melder}</p>
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">${esc(input.eventBody)}</p>
    `,
    ctaHref: link,
    ctaLabel: "Zum Auftraggeber-Portal →",
  });
}
