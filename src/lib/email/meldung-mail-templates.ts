import { MAIL_COLORS } from "@/lib/tokens/mail-colors";
import { SITE_CONFIG } from "@/lib/config";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import {
  buildStandardMailHtml,
  mailBegruessungHtml,
  mailPrimaryButtonHtml,
  mailTeamGrussHtml,
} from "@/lib/email/mail-shell";
import { buildSubject } from "@/lib/shared-domain/build-subject";

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
    <p style="margin:0 0 12px;font-size:15px;color:${MAIL_COLORS.gray700};line-height:1.6;">${mailBegruessungHtml("sie")}</p>
    ${opts.bodyInnerHtml}
    ${cta}
    <p style="margin:24px 0 0;font-size:15px;color:${MAIL_COLORS.gray700};line-height:1.6;">${mailTeamGrussHtml("sie")}</p>
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
      <p style="margin:0 0 12px;font-size:15px;color:${MAIL_COLORS.gray700};line-height:1.6;">${mailBegruessungHtml("sie", input.melderName)}</p>
      <p style="margin:0 0 12px;font-size:15px;color:${MAIL_COLORS.gray700};line-height:1.6;">wir haben Ihre <strong>${esc(kat)}</strong>-Meldung für <strong>${esc(input.objektTitel)}</strong> erhalten.</p>
      <p style="margin:0 0 12px;font-size:15px;color:${MAIL_COLORS.gray700};line-height:1.6;">${intro}</p>
      ${statusBlock}
      ${input.referenz ? `<p style="margin:12px 0 0;font-size:15px;color:${MAIL_COLORS.muted};">Referenz: ${esc(input.referenz)}</p>` : ""}
      <p style="margin:16px 0 0;font-size:15px;color:${MAIL_COLORS.muted};">${footer}</p>
      <p style="margin:24px 0 0;font-size:15px;color:${MAIL_COLORS.gray700};line-height:1.6;">${mailTeamGrussHtml("sie")}</p>
    `,
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
    preheader: buildSubject({
      objekt: input.objektTitel,
      ereignis: input.eventTitel,
    }),
    bodyInnerHtml: `
      <p style="margin:0 0 12px;font-size:15px;color:${MAIL_COLORS.gray700};line-height:1.6;"><strong>${esc(input.eventTitel)}</strong> — <strong>${esc(input.objektTitel)}</strong>${melder}</p>
      <p style="margin:0;font-size:15px;color:${MAIL_COLORS.gray700};line-height:1.6;">${esc(input.eventBody)}</p>
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
    preheader: buildSubject({
      objekt: input.objektTitel,
      ereignis: "Wir kümmern uns",
    }),
    bodyInnerHtml: `
      <p style="margin:0 0 12px;font-size:15px;color:${MAIL_COLORS.gray700};line-height:1.6;"><strong>Wir kümmern uns um Ihren Vorgang</strong> — <strong>${esc(input.objektTitel)}</strong>.</p>
      <p style="margin:0;font-size:15px;color:${MAIL_COLORS.gray700};line-height:1.6;">Den aktuellen Stand sehen Sie jederzeit im Auftraggeber-Portal.</p>
    `,
    ctaHref: link,
    ctaLabel: "Zum Auftraggeber-Portal →",
  });
}
