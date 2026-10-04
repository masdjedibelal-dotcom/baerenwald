import { MAIL_COLORS } from "@/lib/tokens/mail-colors";
import { Resend } from "resend";

import { sendBrandedMail } from "@/lib/email/send-branded-mail";

import { SITE_CONFIG } from "@/lib/config";
import {
  buildStandardMailHtml,
  mailPrimaryButtonHtml,
  mailTeamGrussHtml,
} from "@/lib/email/mail-shell";
import {
  partnerDashboardUrl,
  partnerLoginForAuftragAnfrageUrl,
} from "@/lib/partner/partner-site-url";
import {
  buildInternSubject,
  buildPartnerSubject,
} from "@/lib/shared-domain/build-subject";

function fmtEuro(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** Gültigkeit direkter PDF-Links in internen Mails (7 Tage). */
const MAIL_PDF_LINK_TTL_SEC = 60 * 60 * 24 * 7;

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function systemFrom(): string {
  return (
    process.env.RESEND_FROM_SYSTEM?.trim() ??
    "Bärenwald System <system@baerenwaldmuenchen.de>"
  );
}

function internTo(): string | null {
  return (
    process.env.PARTNER_INTERN_EMAIL?.trim() ||
    process.env.INTERN_EMAIL?.trim() ||
    SITE_CONFIG.email?.trim() ||
    null
  );
}

function crmAngebotUrl(angebotId: string): string | undefined {
  const base = process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "");
  if (!base) return undefined;
  return `${base}/angebote/${encodeURIComponent(angebotId)}#handwerker-partner`;
}

function crmRechnungUrl(rechnungId: string): string | undefined {
  const base = process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "");
  if (!base) return undefined;
  return `${base}/rechnungen/${encodeURIComponent(rechnungId)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Partner-Mails: Standard-Hülle (Logo, Footer) + optionaler Titel im Body. */
function mailShell(title: string, bodyHtml: string, preheader?: string): string {
  const headline = title.trim()
    ? `<h2 style="color:${MAIL_COLORS.primary};margin:0 0 16px;font-size:20px;line-height:1.3;">${escapeHtml(title)}</h2>`
    : "";
  return buildStandardMailHtml({
    preheader: preheader ?? title,
    bodyHtml: `${headline}${bodyHtml}
      <p style="margin:24px 0 0;font-size:15px;color:${MAIL_COLORS.gray700};line-height:1.6;">${mailTeamGrussHtml("sie")}</p>`,
    disclaimer:
      "Sie erhalten diese Mail, weil Ihnen im Partner-Portal ein Vorgang zugewiesen wurde.",
    footerNote: "Bärenwald München · Partner-Portal",
  });
}

function mailBtn(text: string, url: string): string {
  return mailPrimaryButtonHtml(text, url);
}

function mailGreenBox(innerHtml: string): string {
  return `<div style="background:${MAIL_COLORS.c16};border-radius:8px;padding:16px 20px;margin:16px 0;">${innerHtml}</div>`;
}

function mailActionButtons(opts: {
  crmUrl?: string;
  crmLabel?: string;
  pdfUrl?: string;
  pdfLabel?: string;
}): string {
  const parts: string[] = [];
  if (opts.pdfUrl?.trim()) {
    parts.push(
      `<a href="${escapeHtml(opts.pdfUrl.trim())}" style="display:inline-block;margin:4px 8px 4px 0;padding:10px 18px;background:${MAIL_COLORS.c11};color:${MAIL_COLORS.whiteShort};text-decoration:none;border-radius:8px;font-weight:600">${escapeHtml(opts.pdfLabel ?? "PDF öffnen")}</a>`
    );
  }
  if (opts.crmUrl?.trim()) {
    parts.push(
      `<a href="${escapeHtml(opts.crmUrl.trim())}" style="display:inline-block;margin:4px 0;padding:10px 18px;background:${MAIL_COLORS.primary};color:${MAIL_COLORS.whiteShort};text-decoration:none;border-radius:8px;font-weight:600">${escapeHtml(opts.crmLabel ?? "Im CRM öffnen")}</a>`
    );
  }
  if (!parts.length) return "";
  return `<p style="margin-top:16px">${parts.join("")}</p>`;
}

/** Partner: neue Anfrage (vom CRM auslösen via API). */
export async function sendHandwerkerNewAnfrageMail(opts: {
  to: string;
  handwerkerName: string;
  gewerkName: string;
  plz: string;
  zeitraum?: string;
  tokenLink?: string;
  portalLink?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = resendClient();
  if (!resend) {
    console.warn("[partner-mail] RESEND_API_KEY fehlt");
    return { ok: false, error: "E-Mail nicht konfiguriert." };
  }

  const portalHref = opts.portalLink?.trim() || partnerDashboardUrl();
  const zeitraumBlock = opts.zeitraum?.trim()
    ? `<p><strong>Zeitraum:</strong> ${escapeHtml(opts.zeitraum.trim())}</p>`
    : "";
  const tokenBlock = opts.tokenLink?.trim()
    ? `<p style="font-size:15px;color:${MAIL_COLORS.c5}">Alternativ (Einmal-Link): <a href="${escapeHtml(opts.tokenLink.trim())}">Anfrage öffnen</a></p>`
    : "";

  const html = mailShell(
    "Neue Anfrage von Bärenwald",
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hallo ${escapeHtml(opts.handwerkerName)},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Sie haben eine neue Anfrage für <strong>${escapeHtml(opts.gewerkName)}</strong> (PLZ ${escapeHtml(opts.plz)}).</p>
${zeitraumBlock}
<p style="margin:0 0 12px;font-size:15px;color:${MAIL_COLORS.c5};">Bitte unter <strong>Vorgänge</strong> annehmen oder ablehnen.</p>
${mailBtn("Zur Anfrage im Portal", portalHref)}
${tokenBlock}`,
    `Neue Anfrage: ${opts.gewerkName}`
  );

  const subject = buildPartnerSubject({
    gewerk: opts.gewerkName,
    ort: opts.plz,
    ereignis: "Neue Anfrage",
  });

  try {
    const { error } = await sendBrandedMail(resend, {
      from: systemFrom(),
      to: opts.to.trim(),
      subject,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Versand fehlgeschlagen";
    return { ok: false, error: msg };
  }
}

export type LeistungZuweisungMailLeistung = {
  leistung_name: string;
  gewerk_name: string;
  beschreibung?: string | null;
  menge?: number | null;
  einheit?: string | null;
  preis_netto?: number | null;
};

export type PartnerAuftragMailVariant = "neu" | "aenderung";

/** Partner: Leistung/Auftrag zugewiesen oder Änderungsanfrage (vom CRM). */
export async function sendHandwerkerLeistungZuweisungMail(opts: {
  to: string;
  handwerkerName: string;
  auftragId: string;
  auftragTitel: string;
  kundeName: string;
  adresseZeile: string;
  zeitraum?: string | null;
  leistungen: LeistungZuweisungMailLeistung[];
  /** Phasenabhängiger Portal-Link (Anfragen / Angebote / Übersicht). */
  portalLink?: string;
  /** neu = Erstzuweisung, aenderung = geänderte Leistungen / Ergänzung */
  variant?: PartnerAuftragMailVariant;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = resendClient();
  if (!resend) {
    console.warn("[partner-mail] RESEND_API_KEY fehlt");
    return { ok: false, error: "E-Mail nicht konfiguriert." };
  }

  const portalLink =
    opts.portalLink?.trim() || partnerLoginForAuftragAnfrageUrl(opts.auftragId);
  const zeitraum = opts.zeitraum?.trim() || "Nach Absprache";
  const gewerkSet = new Set(opts.leistungen.map((l) => l.gewerk_name).filter(Boolean));
  const gewerkLabel =
    gewerkSet.size === 1
      ? Array.from(gewerkSet)[0]!
      : `${gewerkSet.size} Gewerke`;

  const gesamtNetto = opts.leistungen.reduce(
    (sum, l) => sum + (l.preis_netto != null && Number.isFinite(l.preis_netto) ? l.preis_netto : 0),
    0
  );
  const hatPreise = opts.leistungen.some(
    (l) => l.preis_netto != null && Number.isFinite(l.preis_netto)
  );

  const detailsBox = mailGreenBox(`
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.6;">
      <tr><td style="color:${MAIL_COLORS.primary};padding:4px 0;width:38%;">Auftrag:</td><td style="font-weight:600;color:${MAIL_COLORS.primaryDk};">${escapeHtml(opts.auftragTitel)}</td></tr>
      <tr><td style="color:${MAIL_COLORS.primary};padding:4px 0;">Kunde:</td><td style="font-weight:600;color:${MAIL_COLORS.primaryDk};">${escapeHtml(opts.kundeName)}</td></tr>
      <tr><td style="color:${MAIL_COLORS.primary};padding:4px 0;">Einsatzort:</td><td style="font-weight:600;color:${MAIL_COLORS.primaryDk};">${escapeHtml(opts.adresseZeile)}</td></tr>
      <tr><td style="color:${MAIL_COLORS.primary};padding:4px 0;">Zeitraum:</td><td style="font-weight:600;color:${MAIL_COLORS.primaryDk};">${escapeHtml(zeitraum)}</td></tr>
      <tr><td style="color:${MAIL_COLORS.primary};padding:4px 0;">Gewerk:</td><td style="font-weight:600;color:${MAIL_COLORS.primaryDk};">${escapeHtml(gewerkLabel)}</td></tr>
      ${
        hatPreise
          ? `<tr><td style="color:${MAIL_COLORS.primary};padding:4px 0;">Vergütung:</td><td style="font-weight:600;color:${MAIL_COLORS.primaryDk};">${escapeHtml(fmtEuro(gesamtNetto))} netto</td></tr>`
          : ""
      }
    </table>
  `);

  const isAenderung = opts.variant === "aenderung";
  const subject = buildPartnerSubject({
    gewerk: gewerkLabel,
    ereignis: isAenderung ? "Änderungsanfrage" : "Neuer Auftrag",
  });
  const intro = isAenderung
    ? "Es gibt eine Änderungsanfrage zu Ihrem Auftrag. Kurz die Vorgangsdetails:"
    : "Ein neuer Auftrag wartet auf Sie. Kurz die Vorgangsdetails:";
  const footer = isAenderung
    ? "Die Änderungen finden Sie im Partner-Portal unter Vorgänge."
    : "Vertrag und Leistungen finden Sie im Partner-Portal unter Vorgänge.";

  const html = mailShell(
    isAenderung ? "Änderungsanfrage" : "Neuer Auftrag",
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hallo ${escapeHtml(opts.handwerkerName)},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${intro}</p>
${detailsBox}
${mailBtn("Zum Partner-Portal →", portalLink)}
<p style="font-size:15px;color:${MAIL_COLORS.muted};line-height:1.6;margin:0 0 8px;">
  ${footer}
</p>`,
    opts.auftragTitel
  );

  try {
    const { error } = await sendBrandedMail(resend, {
      from: systemFrom(),
      to: opts.to.trim(),
      subject,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Versand fehlgeschlagen";
    return { ok: false, error: msg };
  }
}

/** Partner: CRM hat das eingereichte Angebot übernommen. */
export async function sendHandwerkerAngebotBestaetigtMail(opts: {
  to: string;
  handwerkerName: string;
  gewerkName: string;
  angebotTitel: string;
  preisNetto?: number | null;
  preisBrutto?: number | null;
  portalLink: string;
  /** true = CRM hat eingewilligt, HW muss noch unter Anfragen bestätigen */
  bitteBestaetigen?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = resendClient();
  if (!resend) {
    console.warn("[partner-mail] RESEND_API_KEY fehlt");
    return { ok: false, error: "E-Mail nicht konfiguriert." };
  }

  const portalHref = opts.portalLink.trim() || partnerDashboardUrl();
  const preisBlock = mailGreenBox(`
    <p style="margin:0 0 6px;font-size:15px;"><strong>${escapeHtml(opts.angebotTitel)}</strong> · ${escapeHtml(opts.gewerkName)}</p>
    <p style="margin:0;font-size:15px;">Netto: ${escapeHtml(fmtEuro(opts.preisNetto))} · Brutto: ${escapeHtml(fmtEuro(opts.preisBrutto))}</p>
  `);

  const bitteBestaetigen = Boolean(opts.bitteBestaetigen);
  const subject = buildPartnerSubject({
    gewerk: opts.gewerkName,
    ereignis: bitteBestaetigen
      ? "Konditionen bestätigen"
      : "Angebot übernommen",
  });
  const headline = bitteBestaetigen ? "Konditionen bestätigen" : "Angebot übernommen";
  const body = bitteBestaetigen
    ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hallo ${escapeHtml(opts.handwerkerName)},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Bitte die Preise unter <strong>Anfragen</strong> bestätigen.</p>
${preisBlock}
${mailBtn("Zum Partner-Portal", portalHref)}`
    : `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hallo ${escapeHtml(opts.handwerkerName)},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Ihr Angebot wurde übernommen. Den Stand sehen Sie unter <strong>Angebote</strong>.</p>
${preisBlock}
${mailBtn("Zum Partner-Portal", portalHref)}`;

  const html = mailShell(headline, body, headline);

  try {
    const { error } = await sendBrandedMail(resend, {
      from: systemFrom(),
      to: opts.to.trim(),
      subject,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Versand fehlgeschlagen";
    return { ok: false, error: msg };
  }
}

/** Partner: CRM-Rückfrage oder Ablehnung zur Einreichung. */
export async function sendHandwerkerAngebotAntwortMail(opts: {
  to: string;
  handwerkerName: string;
  gewerkName: string;
  angebotTitel: string;
  crmNotiz: string;
  portalLink: string;
  typ: "rueckfrage" | "abgelehnt";
  betreff?: string;
  cc?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const resend = resendClient();
  if (!resend) {
    console.warn("[partner-mail] RESEND_API_KEY fehlt");
    return { ok: false, error: "E-Mail nicht konfiguriert." };
  }

  const portalHref = opts.portalLink.trim() || partnerDashboardUrl();
  const istRueckfrage = opts.typ === "rueckfrage";
  const titel = istRueckfrage ? "Rückfrage zu Ihrem Angebot" : "Angebot nicht übernommen";
  const intro = istRueckfrage
    ? "Neue Nachricht zu Ihren Konditionen — bitte im Partner-Portal prüfen."
    : "Ihr Angebot konnte nicht übernommen werden. Sie können im Portal ein neues einreichen.";
  const defaultBetreff = buildPartnerSubject({
    gewerk: opts.gewerkName,
    ereignis: istRueckfrage ? "Rückfrage" : "Angebot nicht übernommen",
  });

  const notizBlock = mailGreenBox(`
    <p style="margin:0 0 6px;font-size:15px;color:${MAIL_COLORS.gray700};font-weight:600;">Nachricht von Bärenwald</p>
    <p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(opts.crmNotiz.trim())}</p>
  `);

  const html = mailShell(
    titel,
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hallo ${escapeHtml(opts.handwerkerName)},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${intro}</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;"><strong>${escapeHtml(opts.angebotTitel)}</strong> · ${escapeHtml(opts.gewerkName)}</p>
${notizBlock}
${mailBtn("Zum Partner-Portal", portalHref)}
<p style="font-size:15px;color:${MAIL_COLORS.muted};line-height:1.6;margin:12px 0 0;">Bei Rückfragen melden Sie sich bei uns.</p>`,
    `${opts.gewerkName} — ${opts.angebotTitel}`
  );

  try {
    const { error } = await sendBrandedMail(resend, {
      from: systemFrom(),
      to: opts.to.trim(),
      ...(opts.cc?.length ? { cc: opts.cc } : {}),
      subject: opts.betreff?.trim() || defaultBetreff,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Versand fehlgeschlagen";
    return { ok: false, error: msg };
  }
}

/** Intern: Partner hat Rechnungs-PDF hochgeladen. */
export async function sendPartnerInternalRechnungMail(opts: {
  handwerkerName: string;
  firma?: string | null;
  gewerkName: string;
  plz: string;
  angebotId: string;
  rechnungId?: string | null;
  rechnungPdfUrl?: string | null;
}): Promise<void> {
  const to = internTo();
  const resend = resendClient();
  if (!to || !resend) return;

  const hw = opts.firma?.trim() || opts.handwerkerName;
  const crm =
    (opts.rechnungId?.trim() && crmRechnungUrl(opts.rechnungId.trim())) ||
    crmAngebotUrl(opts.angebotId);

  const html = mailShell(
    "Eingehende Rechnung vom Partner",
    `<p>Die eingehende Rechnung von <strong>${escapeHtml(hw)}</strong> ist eingegangen.</p>
<p>Gewerk: ${escapeHtml(opts.gewerkName)} · PLZ ${escapeHtml(opts.plz)}</p>
<p>Bitte prüfen und im CRM als überwiesen markieren, sobald überwiesen.</p>
${mailActionButtons({
  pdfUrl: opts.rechnungPdfUrl ?? undefined,
  pdfLabel: "Rechnungs-PDF öffnen",
  crmUrl: crm,
  crmLabel: opts.rechnungId?.trim()
    ? "Eingangsrechnung im CRM öffnen"
    : "Im CRM öffnen",
})}`
  );

  try {
    await sendBrandedMail(resend, {
      from: systemFrom(),
      to,
      subject: buildInternSubject({
        objekt: opts.gewerkName,
        ereignis: "Eingehende Rechnung",
      }),
      html,
    });
  } catch (e) {
    console.error("[partner-mail] intern rechnung:", e);
  }
}

/** Intern: HV meldet Mängel — Hinweis für Bärenwald. */
export async function sendHvMaengelInternMail(opts: {
  hvName: string;
  leadId: string;
  auftragTitel?: string | null;
  freitext: string;
}): Promise<void> {
  const to = internTo();
  const resend = resendClient();
  if (!to || !resend) return;

  const base = process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "");
  const crmUrl = base
    ? `${base}/leads/${encodeURIComponent(opts.leadId)}`
    : undefined;

  const html = mailShell(
    `Mängelmeldung von ${opts.hvName}`,
    `<p style="margin-top:0;padding:10px 12px;background:${MAIL_COLORS.c24};border-radius:8px;border:1px solid ${MAIL_COLORS.c23};">
  <strong>Hinweis:</strong> Die Verwaltung <strong>${escapeHtml(opts.hvName)}</strong> meldet Mängel nach Partner-Abschluss.
</p>
${opts.auftragTitel ? `<p>Vorgang: ${escapeHtml(opts.auftragTitel)}</p>` : ""}
<p><strong>Meldung:</strong></p>
<p style="white-space:pre-wrap;">${escapeHtml(opts.freitext)}</p>
${mailActionButtons({ crmUrl, crmLabel: "Vorgang im CRM öffnen" })}`
  );

  try {
    await sendBrandedMail(resend, {
      from: systemFrom(),
      to,
      subject: buildInternSubject({
        objekt: opts.auftragTitel?.trim() || opts.hvName,
        ereignis: "Mängelmeldung",
      }),
      html,
    });
  } catch (e) {
    console.error("[partner-mail] intern hv maengel:", e);
  }
}

export { MAIL_PDF_LINK_TTL_SEC };
