import type { CreateEmailOptions, CreateEmailRequestOptions, Resend } from "resend";

import { rewriteMailLogoUrlsToHosted } from "@/lib/email/mail-logo-inline";
import { insertEmailLogRow } from "@/lib/kommunikation/insert-email-log";
import { isStagingDeploy } from "@/lib/staging";

function htmlFromPayload(payload: CreateEmailOptions): string {
  if (!("html" in payload)) return "";
  const value = payload.html;
  return typeof value === "string" ? value : "";
}

function isMailCatcherActive(): boolean {
  if (process.env.ALLOW_STAGING_REAL_MAIL === "1") return false;
  if (process.env.MAIL_CATCHER === "1") return true;
  return isStagingDeploy();
}

/**
 * Sendet HTML-Mails mit Logo als HTTPS-URL (baerenwaldmuenchen.de) —
 * kein CID-Anhang (sonst Büroklammer in Apple Mail).
 * Staging: nur loggen, kein Resend-Versand.
 */
export async function sendBrandedMail(
  resend: Resend,
  payload: CreateEmailOptions,
  options?: CreateEmailRequestOptions
) {
  const sourceHtml = htmlFromPayload(payload);
  if (!sourceHtml) {
    throw new Error("Email HTML content is required");
  }
  const html = rewriteMailLogoUrlsToHosted(sourceHtml);
  // Explizit keine Logo-Attachments — echte PDFs o. Ä. aus payload bleiben.
  const extra = payload.attachments ?? [];
  const sendPayload: CreateEmailOptions = {
    ...payload,
    html,
    ...(extra.length ? { attachments: extra } : { attachments: undefined }),
  };

  if (isMailCatcherActive()) {
    const catchId = `staging-catch:website-${crypto.randomUUID()}`;
    const toRaw = "to" in sendPayload ? sendPayload.to : undefined;
    const toList = Array.isArray(toRaw)
      ? toRaw.map(String)
      : toRaw
        ? [String(toRaw)]
        : [];
    const subject =
      "subject" in sendPayload && sendPayload.subject
        ? String(sendPayload.subject)
        : "(ohne Betreff)";
    console.info("[mail-catcher:website-sendBrandedMail]", {
      catchId,
      to: toList,
      subject,
      from: "from" in sendPayload ? sendPayload.from : undefined,
      attachmentCount: extra.length,
      at: new Date().toISOString(),
    });
    const { error: logErr } = await insertEmailLogRow({
      typ: "website",
      an_email: toList.join(", ") || "(unbekannt)",
      betreff: subject,
      inhalt_html: html,
      status: "gesendet",
      resend_id: catchId,
    });
    if (logErr) {
      console.warn("[mail-catcher:website-sendBrandedMail] email_log:", logErr);
    }
    return { data: { id: catchId }, error: null };
  }

  return resend.emails.send(sendPayload, options);
}
