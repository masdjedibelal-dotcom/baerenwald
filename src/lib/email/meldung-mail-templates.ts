import { SITE_CONFIG } from "@/lib/config";
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
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${mailBegruessungHtml("sie", input.melderName)}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">wir haben Ihre <strong>${esc(kat)}</strong>-Meldung für <strong>${esc(input.objektTitel)}</strong> erhalten.</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${intro}</p>
      ${statusBlock}
      ${input.referenz ? `<p style="margin:12px 0 0;font-size:13px;color:#6B7280;">Referenz: ${esc(input.referenz)}</p>` : ""}
      <p style="margin:16px 0 0;font-size:13px;color:#6B7280;">${footer}</p>
      <p style="margin:24px 0 0;font-size:15px;color:#374151;line-height:1.6;">${mailTeamGrussHtml("sie")}</p>
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
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${mailBegruessungHtml("sie", input.melderName)}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${esc(input.orgName)} hat eine Meldung für <strong>${esc(input.objektTitel)}</strong> vorgemerkt. Bitte ergänzen Sie kurz Details und Fotos:</p>
      ${mailPrimaryButtonHtml("Meldung ergänzen", input.link)}
      <p style="margin:12px 0 0;font-size:13px;color:#6B7280;word-break:break-all;">Link: ${esc(input.link)}</p>
      <p style="margin:24px 0 0;font-size:15px;color:#374151;line-height:1.6;">${mailTeamGrussHtml("sie")}</p>
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
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${mailBegruessungHtml("sie", input.melderName)}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${esc(input.orgName)} hat Ihre Meldung für <strong>${esc(input.objektTitel)}</strong> ohne Beauftragung abgeschlossen.</p>
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Bei Rückfragen wenden Sie sich bitte direkt an Ihre Verwaltung.</p>
      <p style="margin:24px 0 0;font-size:15px;color:#374151;line-height:1.6;">${mailTeamGrussHtml("sie")}</p>
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

/** M8 — HV/Endkunde: Angebot annehmen oder ablehnen (kein Freigabe-Flow) */
export function buildOrgAngebotFreigabeHtml(input: {
  objektTitel: string;
  betrag?: string;
  portalPath?: string;
}): string {
  const link = orgPortalDeepLink(input.portalPath);
  return wrapOrgMail({
    preheader: `Angebot entscheiden — ${input.objektTitel}`,
    bodyInnerHtml: `
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Für <strong>${esc(input.objektTitel)}</strong>${input.betrag ? ` (${esc(input.betrag)})` : ""} liegt ein Angebot vor. Bitte im Portal annehmen oder ablehnen.</p>
    `,
    ctaHref: link,
    ctaLabel: "Zum Auftraggeber-Portal →",
  });
}

/** HV: Angebot unter Freigabeschwelle — Info, Direktauftrag; kein Annehmen/Ablehnen. */
export function buildOrgAngebotUnterSchwelleHtml(input: {
  objektTitel: string;
  betrag?: string;
  schwelleLabel?: string;
  portalPath?: string;
}): string {
  const link = orgPortalDeepLink(input.portalPath);
  const schwelle =
    input.schwelleLabel?.trim() != null && input.schwelleLabel.trim() !== ""
      ? ` (${esc(input.schwelleLabel.trim())})`
      : "";
  return wrapOrgMail({
    preheader: `Angebot unter Freigabeschwelle — ${input.objektTitel}`,
    bodyInnerHtml: `
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Für <strong>${esc(input.objektTitel)}</strong>${input.betrag ? ` liegt ein Angebot (${esc(input.betrag)})` : " liegt ein Angebot"} unter Ihrer Freigabeschwelle${schwelle}.</p>
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Aufgrund Ihrer erteilten Freigabeschwelle ist eine Annahme oder Ablehnung <strong>nicht nötig</strong> — wir kümmern uns direkt um den Auftrag. Den Stand sehen Sie jederzeit im Auftraggeber-Portal.</p>
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

/** HV nach Klick „Direkt Bärenwald“ / „Hausmeister“ — nicht die informative Direktauftrag-Mail. */
export function buildOrgWirKuemmernUnsHtml(input: {
  objektTitel: string;
  portalPath?: string;
}): string {
  const link = orgPortalDeepLink(input.portalPath);
  return wrapOrgMail({
    preheader: `Wir kümmern uns um Ihren Vorgang — ${input.objektTitel}`,
    bodyInnerHtml: `
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;"><strong>Wir kümmern uns um Ihren Vorgang</strong> — <strong>${esc(input.objektTitel)}</strong>.</p>
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Den aktuellen Stand sehen Sie jederzeit im Auftraggeber-Portal.</p>
    `,
    ctaHref: link,
    ctaLabel: "Zum Auftraggeber-Portal →",
  });
}
