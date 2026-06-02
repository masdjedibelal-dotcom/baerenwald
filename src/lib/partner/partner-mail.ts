import { Resend } from "resend";

import { SITE_CONFIG } from "@/lib/config";
import { partnerLoginUrl } from "@/lib/partner/partner-site-url";

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
  return `${base}/angebote/${encodeURIComponent(angebotId)}`;
}

function crmAuftragUrl(auftragId: string): string | undefined {
  const base = process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "");
  if (!base) return undefined;
  return `${base}/auftraege/${encodeURIComponent(auftragId)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html lang="de"><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:16px">
<h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(title)}</h2>
${bodyHtml}
<p style="margin-top:24px;font-size:12px;color:#666">Bärenwald Partner-Portal</p>
</body></html>`;
}

/** Handwerker: neue Anfrage (vom CRM auslösen via API). */
export async function sendHandwerkerNewAnfrageMail(opts: {
  to: string;
  handwerkerName: string;
  gewerkName: string;
  plz: string;
  zeitraum?: string;
  tokenLink?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = resendClient();
  if (!resend) {
    console.warn("[partner-mail] RESEND_API_KEY fehlt");
    return { ok: false, error: "E-Mail nicht konfiguriert." };
  }

  const login = partnerLoginUrl();
  const zeitraumBlock = opts.zeitraum?.trim()
    ? `<p><strong>Zeitraum:</strong> ${escapeHtml(opts.zeitraum.trim())}</p>`
    : "";
  const tokenBlock = opts.tokenLink?.trim()
    ? `<p style="font-size:13px;color:#444">Alternativ (Einmal-Link): <a href="${escapeHtml(opts.tokenLink.trim())}">Anfrage öffnen</a></p>`
    : "";

  const html = mailShell(
    "Neue Anfrage von Bärenwald",
    `<p>Hallo ${escapeHtml(opts.handwerkerName)},</p>
<p>du hast eine neue Anfrage für <strong>${escapeHtml(opts.gewerkName)}</strong> (PLZ ${escapeHtml(opts.plz)}).</p>
${zeitraumBlock}
<p><a href="${login}" style="display:inline-block;padding:10px 18px;background:#2E7D52;color:#fff;text-decoration:none;border-radius:999px;font-weight:600">Im Partner-Portal antworten</a></p>
${tokenBlock}`
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

/** Intern: Handwerker hat Angebot eingereicht. */
export async function sendPartnerInternalAngebotMail(opts: {
  handwerkerName: string;
  firma?: string | null;
  gewerkName: string;
  plz: string;
  preisNetto?: number | null;
  preisBrutto?: number | null;
  angebotId: string;
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

  const html = mailShell(
    "Handwerker-Angebot eingegangen",
    `<p><strong>${escapeHtml(hw)}</strong> hat ein Angebot eingereicht.</p>
<p>Gewerk: ${escapeHtml(opts.gewerkName)} · PLZ ${escapeHtml(opts.plz)}<br>Preis: ${escapeHtml(preis)}</p>
${crm ? `<p><a href="${crm}">Im CRM öffnen</a></p>` : ""}`
  );

  try {
    await resend.emails.send({
      from: systemFrom(),
      to,
      subject: `HW-Angebot: ${opts.gewerkName} — ${hw}`,
      html,
    });
  } catch (e) {
    console.error("[partner-mail] intern angebot:", e);
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
    "Neuer Bautagebuch-Eintrag (Partner)",
    `<p><strong>${escapeHtml(hw)}</strong> hat einen Bautagebuch-Eintrag erstellt.</p>
<p>Auftrag: ${escapeHtml(opts.auftragTitel)}<br>Eintrag: ${escapeHtml(opts.eintragTitel)} (${escapeHtml(opts.datum)})</p>
${crm ? `<p><a href="${crm}">Auftrag im CRM öffnen</a></p>` : ""}`
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
    : "";

  const html = mailShell(
    `Anfrage ${status}`,
    `<p><strong>${escapeHtml(opts.handwerkerName)}</strong> hat die Anfrage für <strong>${escapeHtml(opts.gewerkName)}</strong> <strong>${status}</strong>.</p>
${grund}
${notiz}
${hinweis}
${crm ? `<p style="margin-top:16px"><a href="${crm}">Angebot im CRM öffnen</a></p>` : ""}`
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
