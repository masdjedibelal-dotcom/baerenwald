/**
 * Einheitliche Bärenwald-Mail-Hülle (wie Kunden-Bestätigung / CRM mailHtmlBase):
 * Logo + Markenname, Begrüßung im Body, Team-Gruß, Footer.
 */
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

function phoneDisplay(): string {
  const p = SITE_CONFIG.phone.replace(/\s/g, "");
  if (p.length === 11 && p.startsWith("0")) {
    return `${p.slice(0, 3)} ${p.slice(3, 7)} ${p.slice(7)}`;
  }
  return SITE_CONFIG.phone;
}

const LOGO_MARK_URL = `${SITE_CONFIG.url.replace(/\/$/, "")}/logo-mark-green.png`;
const FOOTER_DOMAIN = "baerenwaldmuenchen.de";

export type StandardMailAnrede = "du" | "sie";

export function mailTeamGrussHtml(anrede: StandardMailAnrede = "sie"): string {
  return anrede === "du"
    ? "Viele Grüße<br/><strong>Dein Bärenwald Team</strong>"
    : "Mit freundlichen Grüßen<br/><strong>Ihr Bärenwald Team</strong>";
}

export function mailBegruessungHtml(
  anrede: StandardMailAnrede,
  name?: string | null
): string {
  const n = (name ?? "").trim();
  if (anrede === "du") {
    const vorname = n ? n.split(/\s+/)[0]! : "";
    return vorname ? `Hallo ${esc(vorname)},` : "Hallo,";
  }
  return n ? `Guten Tag ${esc(n)},` : "Guten Tag,";
}

export function mailPrimaryButtonHtml(label: string, href: string): string {
  return `<p style="margin:20px 0 8px;"><a href="${escAttr(href)}" style="display:inline-block;background:#2E7D52;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">${esc(label)}</a></p>`;
}

export type BuildStandardMailOpts = {
  /** Unsichtbarer Preheader */
  preheader?: string;
  /** HTML-Inhalt (Begrüßung, Text, CTA — ohne äußere Hülle) */
  bodyHtml: string;
  /** Footer-Disclaimer unter Firma/Tel */
  disclaimer?: string | null;
  /** Footer-Zusatzzeile statt Standard „Bärenwald München · …“ */
  footerNote?: string | null;
};

/** Weiße Standard-Hülle: Logo · Inhalt · Footer (kein dunkler Header-Balken). */
export function buildStandardMailHtml(opts: BuildStandardMailOpts): string {
  const pre = opts.preheader?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;">${esc(opts.preheader.trim())}</div>`
    : "";
  const siteUrl = escAttr(SITE_CONFIG.url);
  const phoneTxt = esc(phoneDisplay());
  const disclaimer = opts.disclaimer?.trim()
    ? `<p style="margin:8px 0 0;font-size:11px;color:#D1D5DB;line-height:1.5;">${esc(opts.disclaimer.trim())}</p>`
    : "";
  const footerMain = opts.footerNote?.trim()
    ? `<p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">${esc(opts.footerNote.trim())}</p>`
    : `<p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
      Bärenwald München ·
      <a href="${siteUrl}" style="color:#9CA3AF;text-decoration:none;">${esc(FOOTER_DOMAIN)}</a>
      · ${phoneTxt}
    </p>`;

  return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;color-scheme:light;">
${pre}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;">
<tr><td align="center" style="padding:32px 16px;background:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;width:100%;background:#ffffff;">

<tr>
  <td style="padding:0 0 24px;border-bottom:1px solid #E5E7EB;">
    <table cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td style="padding-right:10px;vertical-align:middle;">
        <img src="${escAttr(LOGO_MARK_URL)}" width="36" height="36" alt="Bärenwald" style="display:block;width:36px;height:36px;border:0;"/>
      </td>
      <td style="vertical-align:middle;font-size:20px;font-weight:700;color:#1A3D2B;letter-spacing:-0.02em;line-height:1;">
        Bärenwald
      </td>
    </tr>
    </table>
  </td>
</tr>

<tr>
  <td style="padding:32px 0 24px;background:#ffffff;">
    ${opts.bodyHtml}
  </td>
</tr>

<tr>
  <td style="padding:20px 0 0;border-top:1px solid #E5E7EB;background:#ffffff;">
    ${footerMain}
    ${disclaimer}
  </td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
