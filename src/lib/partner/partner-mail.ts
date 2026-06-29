import { Resend } from "resend";

import { SITE_CONFIG } from "@/lib/config";
import {
  partnerDashboardUrl,
  partnerLoginForAuftragAnfrageUrl,
} from "@/lib/partner/partner-site-url";

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

function crmAuftragUrl(auftragId: string): string | undefined {
  const base = process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "");
  if (!base) return undefined;
  return `${base}/auftraege/${encodeURIComponent(auftragId)}#auftrag-bautagebuch`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mailShell(title: string, bodyHtml: string, preheader?: string): string {
  const pre = preheader?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
    : "";
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
${pre}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;">
<tr><td align="center" style="padding:32px 16px;">
<table width="580" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;width:100%;">
<tr><td style="padding:0 0 20px;border-bottom:1px solid #E5E7EB;">
  <span style="font-size:20px;font-weight:700;color:#1A3D2B;letter-spacing:-0.02em;">Bärenwald</span>
</td></tr>
<tr><td style="padding:28px 0 20px;">
  <h2 style="color:#2E7D52;margin:0 0 16px;font-size:20px;line-height:1.3;">${escapeHtml(title)}</h2>
  ${bodyHtml}
</td></tr>
<tr><td style="padding:16px 0 0;border-top:1px solid #E5E7EB;">
  <p style="font-size:12px;color:#9CA3AF;margin:0;line-height:1.6;">Bärenwald München · Partner-Portal</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function mailBtn(text: string, url: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:#2E7D52;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:20px 0 8px;">${escapeHtml(text)}</a>`;
}

function mailGreenBox(innerHtml: string): string {
  return `<div style="background:#EAF3DE;border-radius:8px;padding:16px 20px;margin:16px 0;">${innerHtml}</div>`;
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
      `<a href="${escapeHtml(opts.pdfUrl.trim())}" style="display:inline-block;margin:4px 8px 4px 0;padding:10px 18px;background:#c62828;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">${escapeHtml(opts.pdfLabel ?? "PDF öffnen")}</a>`
    );
  }
  if (opts.crmUrl?.trim()) {
    parts.push(
      `<a href="${escapeHtml(opts.crmUrl.trim())}" style="display:inline-block;margin:4px 0;padding:10px 18px;background:#2E7D52;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">${escapeHtml(opts.crmLabel ?? "Im CRM öffnen")}</a>`
    );
  }
  if (!parts.length) return "";
  return `<p style="margin-top:16px">${parts.join("")}</p>`;
}

/** Handwerker: neue Anfrage (vom CRM auslösen via API). */
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
    ? `<p style="font-size:13px;color:#444">Alternativ (Einmal-Link): <a href="${escapeHtml(opts.tokenLink.trim())}">Anfrage öffnen</a></p>`
    : "";

  const html = mailShell(
    "Neue Anfrage von Bärenwald",
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hallo ${escapeHtml(opts.handwerkerName)},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">du hast eine neue Anfrage für <strong>${escapeHtml(opts.gewerkName)}</strong> (PLZ ${escapeHtml(opts.plz)}).</p>
${zeitraumBlock}
<p style="margin:0 0 12px;font-size:14px;color:#444;">Bitte unter <strong>Anfragen</strong> annehmen oder ablehnen (nicht unter Aufträge).</p>
${mailBtn("Zur Anfrage im Portal", portalHref)}
${tokenBlock}`,
    `Neue Anfrage: ${opts.gewerkName}`
  );

  try {
    const { error } = await resend.emails.send({
      from: systemFrom(),
      to: opts.to.trim(),
      subject: `Neue Anfrage: ${opts.gewerkName} — Bärenwald Partner`,
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

/** Handwerker: Leistung/Auftrag zugewiesen oder Änderungsanfrage (vom CRM). */
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

  const lis = opts.leistungen
    .map((l) => {
      const qty =
        l.einheit && l.einheit !== "pauschal" && l.menge != null
          ? ` (${l.menge} ${escapeHtml(l.einheit)})`
          : "";
      const desc = l.beschreibung?.trim()
        ? ` — ${escapeHtml(l.beschreibung.trim())}`
        : "";
      const preis =
        l.preis_netto != null && Number.isFinite(l.preis_netto)
          ? ` · ${escapeHtml(fmtEuro(l.preis_netto))} netto`
          : "";
      return `<li style="margin:6px 0;"><strong>${escapeHtml(l.leistung_name)}</strong>${desc}<span style="color:#6B7280;font-size:13px;"> · ${escapeHtml(l.gewerk_name)}${qty}${preis}</span></li>`;
    })
    .join("");

  const detailsBox = mailGreenBox(`
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;">
      <tr><td style="color:#2E7D52;padding:4px 0;width:38%;">Auftrag:</td><td style="font-weight:600;color:#1A3D2B;">${escapeHtml(opts.auftragTitel)}</td></tr>
      <tr><td style="color:#2E7D52;padding:4px 0;">Kunde:</td><td style="font-weight:600;color:#1A3D2B;">${escapeHtml(opts.kundeName)}</td></tr>
      <tr><td style="color:#2E7D52;padding:4px 0;">Einsatzort:</td><td style="font-weight:600;color:#1A3D2B;">${escapeHtml(opts.adresseZeile)}</td></tr>
      <tr><td style="color:#2E7D52;padding:4px 0;">Zeitraum:</td><td style="font-weight:600;color:#1A3D2B;">${escapeHtml(zeitraum)}</td></tr>
      <tr><td style="color:#2E7D52;padding:4px 0;">Gewerk:</td><td style="font-weight:600;color:#1A3D2B;">${escapeHtml(gewerkLabel)}</td></tr>
      ${
        hatPreise
          ? `<tr><td style="color:#2E7D52;padding:4px 0;">Vergütung:</td><td style="font-weight:600;color:#1A3D2B;">${escapeHtml(fmtEuro(gesamtNetto))} netto</td></tr>`
          : ""
      }
    </table>
  `);

  const isAenderung = opts.variant === "aenderung";
  const subject = isAenderung
    ? "Neue Änderungsanfrage"
    : "Neuer Auftrag wartet auf dich";
  const intro = isAenderung
    ? "Es gibt eine Änderungsanfrage zu deinem Auftrag. Kurz die Vorgangsdetails:"
    : "Ein neuer Auftrag wartet auf dich. Kurz die Vorgangsdetails:";
  const footer = isAenderung
    ? "Die Änderungen findest du im Partner-Portal unter Vorgänge."
    : "Vertrag und Leistungen findest du im Partner-Portal unter Vorgänge.";

  const html = mailShell(
    subject,
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hallo ${escapeHtml(opts.handwerkerName)},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${intro}</p>
${detailsBox}
<ul style="font-size:14px;line-height:1.7;padding-left:20px;margin:12px 0 16px;color:#1A3D2B;">${lis}</ul>
${mailBtn("Zum Partner-Portal →", portalLink)}
<p style="font-size:13px;color:#6B7280;line-height:1.6;margin:0 0 8px;">
  ${footer}
</p>`,
    opts.auftragTitel
  );

  try {
    const { error } = await resend.emails.send({
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

/** Handwerker: CRM hat das eingereichte Angebot übernommen. */
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
    <p style="margin:0 0 6px;font-size:14px;"><strong>${escapeHtml(opts.angebotTitel)}</strong> · ${escapeHtml(opts.gewerkName)}</p>
    <p style="margin:0;font-size:14px;">Netto: ${escapeHtml(fmtEuro(opts.preisNetto))} · Brutto: ${escapeHtml(fmtEuro(opts.preisBrutto))}</p>
  `);

  const bitteBestaetigen = Boolean(opts.bitteBestaetigen);
  const subject = bitteBestaetigen
    ? `Konditionen bestätigen: ${opts.gewerkName}`
    : `Angebot übernommen: ${opts.gewerkName}`;
  const headline = bitteBestaetigen ? "Konditionen bestätigen" : "Angebot übernommen";
  const body = bitteBestaetigen
    ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hallo ${escapeHtml(opts.handwerkerName)},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Bitte die Preise unter <strong>Anfragen</strong> bestätigen.</p>
${preisBlock}
${mailBtn("Zum Partner-Portal", portalHref)}`
    : `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hallo ${escapeHtml(opts.handwerkerName)},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Dein Angebot wurde übernommen. Status unter <strong>Angebote</strong>.</p>
${preisBlock}
${mailBtn("Zum Partner-Portal", portalHref)}`;

  const html = mailShell(headline, body, headline);

  try {
    const { error } = await resend.emails.send({
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

/** Handwerker: CRM-Rückfrage oder Ablehnung zur Einreichung. */
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
  const titel = istRueckfrage ? "Rückfrage zu deinem Angebot" : "Angebot nicht übernommen";
  const intro = istRueckfrage
    ? "Neue Nachricht zu deinen Konditionen — bitte im Partner-Portal prüfen."
    : "Dein Angebot konnte nicht übernommen werden. Du kannst im Portal ein neues einreichen.";
  const defaultBetreff = istRueckfrage
    ? `Rückfrage zu deinem Angebot: ${opts.gewerkName} — Bärenwald Partner`
    : `Angebot nicht übernommen: ${opts.gewerkName} — Bärenwald Partner`;

  const notizBlock = mailGreenBox(`
    <p style="margin:0 0 6px;font-size:13px;color:#374151;font-weight:600;">Nachricht von Bärenwald</p>
    <p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(opts.crmNotiz.trim())}</p>
  `);

  const html = mailShell(
    titel,
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hallo ${escapeHtml(opts.handwerkerName)},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${intro}</p>
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;"><strong>${escapeHtml(opts.angebotTitel)}</strong> · ${escapeHtml(opts.gewerkName)}</p>
${notizBlock}
${mailBtn("Zum Partner-Portal", portalHref)}
<p style="font-size:13px;color:#6B7280;line-height:1.6;margin:12px 0 0;">Bei Rückfragen melde dich bei uns.</p>`,
    `${opts.gewerkName} — ${opts.angebotTitel}`
  );

  try {
    const { error } = await resend.emails.send({
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

/** Intern: Handwerker hat Konditionen eingereicht. */
export async function sendPartnerInternalAngebotMail(opts: {
  handwerkerName: string;
  firma?: string | null;
  gewerkName: string;
  plz: string;
  preisNetto?: number | null;
  preisBrutto?: number | null;
  angebotId: string;
  angebotPdfUrl?: string | null;
  konditionenArt?: string | null;
  positionen?: Array<{
    leistung: string;
    ekNetto: number | null;
    hwNetto: number;
    geaendert: boolean;
    hwNotiz?: string;
  }>;
}): Promise<void> {
  const to = internTo();
  const resend = resendClient();
  if (!to || !resend) return;

  const hw = opts.firma?.trim() || opts.handwerkerName;
  const crm = crmAngebotUrl(opts.angebotId);
  const preis =
    opts.preisBrutto != null
      ? `Brutto ${opts.preisBrutto.toLocaleString("de-DE")} €`
      : opts.preisNetto != null
        ? `Netto ${opts.preisNetto.toLocaleString("de-DE")} €`
        : "—";

  const posRows =
    opts.positionen?.length
      ? `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">
  <tr style="border-bottom:1px solid #e5e7eb;">
    <th style="text-align:left;padding:6px 4px;">Leistung</th>
    <th style="text-align:right;padding:6px 4px;">Vorschlag</th>
    <th style="text-align:right;padding:6px 4px;">HW</th>
  </tr>
  ${opts.positionen
    .map(
      (p) => `<tr style="border-bottom:1px solid #f3f4f6;">
    <td style="padding:6px 4px;">${escapeHtml(p.leistung)}${p.geaendert ? " *" : ""}${
      p.hwNotiz?.trim()
        ? `<br><span style="font-size:12px;color:#6b7280;">${escapeHtml(p.hwNotiz.trim())}</span>`
        : ""
    }</td>
    <td style="text-align:right;padding:6px 4px;">${p.ekNetto != null ? `${p.ekNetto.toLocaleString("de-DE")} €` : "Preis folgt"}</td>
    <td style="text-align:right;padding:6px 4px;">${p.hwNetto.toLocaleString("de-DE")} €</td>
  </tr>`
    )
    .join("")}
</table>`
      : "";

  const art = opts.konditionenArt?.trim()
    ? `<p><strong>Art:</strong> ${escapeHtml(opts.konditionenArt.trim())}</p>`
    : "";

  const html = mailShell(
    "Handwerker-Konditionen eingegangen",
    `<p><strong>${escapeHtml(hw)}</strong> hat Konditionen eingereicht.</p>
<p>Gewerk: ${escapeHtml(opts.gewerkName)} · PLZ ${escapeHtml(opts.plz)}<br>Gesamt: ${escapeHtml(preis)}</p>
${art}
${posRows}
${mailActionButtons({
  pdfUrl: opts.angebotPdfUrl ?? undefined,
  pdfLabel: "Angebots-PDF öffnen",
  crmUrl: crm,
  crmLabel: "Konditionen im CRM prüfen",
})}`
  );

  try {
    await resend.emails.send({
      from: systemFrom(),
      to,
      subject: `HW-Konditionen: ${opts.gewerkName} — ${hw}`,
      html,
    });
  } catch (e) {
    console.error("[partner-mail] intern angebot:", e);
  }
}

/** Intern: Handwerker hat Rechnungs-PDF hochgeladen. */
export async function sendPartnerInternalRechnungMail(opts: {
  handwerkerName: string;
  firma?: string | null;
  gewerkName: string;
  plz: string;
  angebotId: string;
  rechnungPdfUrl?: string | null;
}): Promise<void> {
  const to = internTo();
  const resend = resendClient();
  if (!to || !resend) return;

  const hw = opts.firma?.trim() || opts.handwerkerName;
  const crm = crmAngebotUrl(opts.angebotId);

  const html = mailShell(
    "Handwerker-Rechnung eingegangen",
    `<p><strong>${escapeHtml(hw)}</strong> hat eine Rechnung hochgeladen.</p>
<p>Gewerk: ${escapeHtml(opts.gewerkName)} · PLZ ${escapeHtml(opts.plz)}</p>
${mailActionButtons({
  pdfUrl: opts.rechnungPdfUrl ?? undefined,
  pdfLabel: "Rechnungs-PDF öffnen",
  crmUrl: crm,
  crmLabel: "Im CRM (Handwerker-Bereich)",
})}`
  );

  try {
    await resend.emails.send({
      from: systemFrom(),
      to,
      subject: `HW-Rechnung: ${opts.gewerkName} — ${hw}`,
      html,
    });
  } catch (e) {
    console.error("[partner-mail] intern rechnung:", e);
  }
}

/** Intern: neuer Bautagebuch-Eintrag vom Handwerker. */
export async function sendPartnerInternalBautagebuchMail(opts: {
  handwerkerName: string;
  firma?: string | null;
  auftragTitel: string;
  eintragTitel: string;
  datum: string;
  auftragId: string;
}): Promise<void> {
  const to = internTo();
  const resend = resendClient();
  if (!to || !resend) return;

  const hw = opts.firma?.trim() || opts.handwerkerName;
  const crm = crmAuftragUrl(opts.auftragId);

  const html = mailShell(
    `Neuer Bautagebuch-Eintrag von ${hw}`,
    `<p><strong>${escapeHtml(hw)}</strong> hat einen Bautagebuch-Eintrag erstellt.</p>
<p>Auftrag: ${escapeHtml(opts.auftragTitel)}<br>Eintrag: ${escapeHtml(opts.eintragTitel)} (${escapeHtml(opts.datum)})</p>
${mailActionButtons({
  crmUrl: crm,
  crmLabel: "Bautagebuch im CRM öffnen",
})}`
  );

  try {
    await resend.emails.send({
      from: systemFrom(),
      to,
      subject: `Bautagebuch: ${opts.auftragTitel} — ${hw}`,
      html,
    });
  } catch (e) {
    console.error("[partner-mail] intern bautagebuch:", e);
  }
}

/** Intern: Handwerker hat Anfrage im Partner-Portal angenommen/abgelehnt. */
export async function sendPartnerInternalAnfrageAntwortMail(opts: {
  handwerkerName: string;
  gewerkName: string;
  angenommen: boolean;
  ablehnungGrundLabel?: string | null;
  notiz?: string | null;
  angebotId: string;
  /** Link für HW: Angebot im Partner-Portal einreichen (nur bei Annahme). */
  partnerAngebotPortalUrl?: string | null;
}): Promise<void> {
  const to = internTo();
  const resend = resendClient();
  if (!to || !resend) return;

  const crm = crmAngebotUrl(opts.angebotId);
  const status = opts.angenommen ? "angenommen" : "abgelehnt";
  const grund =
    !opts.angenommen && opts.ablehnungGrundLabel?.trim()
      ? `<p><strong>Grund:</strong> ${escapeHtml(opts.ablehnungGrundLabel.trim())}</p>`
      : "";
  const notiz = opts.notiz?.trim()
    ? `<p><strong>Notiz:</strong> ${escapeHtml(opts.notiz.trim())}</p>`
    : "";
  const hinweis = !opts.angenommen
    ? `<p style="margin-top:12px;padding:10px 12px;background:#FFF8E1;border-radius:8px;border:1px solid #F9A825;">
        <strong>Handlungsbedarf:</strong> Anderen Handwerker für <strong>${escapeHtml(opts.gewerkName)}</strong> anfragen.
      </p>`
    : `<p style="margin-top:12px;padding:10px 12px;background:#E8F5E9;border-radius:8px;border:1px solid #81C784;">
        Handwerker kann unter <strong>Anfragen</strong> Preise bestätigen oder anpassen.
      </p>`;

  const portalBtn =
    opts.angenommen && opts.partnerAngebotPortalUrl?.trim()
      ? mailActionButtons({
          crmUrl: opts.partnerAngebotPortalUrl.trim(),
          crmLabel: "Partner-Portal (Anfragen)",
        })
      : "";

  const html = mailShell(
    `Anfrage ${status}`,
    `<p><strong>${escapeHtml(opts.handwerkerName)}</strong> hat die Anfrage für <strong>${escapeHtml(opts.gewerkName)}</strong> <strong>${status}</strong>.</p>
${grund}
${notiz}
${hinweis}
${portalBtn}
${mailActionButtons({ crmUrl: crm, crmLabel: "Angebot im CRM öffnen" })}`
  );

  const subject = opts.angenommen
    ? `${opts.handwerkerName} hat angenommen — ${opts.gewerkName}`
    : `${opts.handwerkerName} hat abgelehnt — ${opts.gewerkName}`;

  try {
    await resend.emails.send({
      from: systemFrom(),
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error("[partner-mail] intern anfrage antwort:", e);
  }
}

export { MAIL_PDF_LINK_TTL_SEC };
