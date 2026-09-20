import type { CreateEmailOptions, CreateEmailRequestOptions, Resend } from "resend";

import { rewriteMailLogoUrlsToHosted } from "@/lib/email/mail-logo-inline";
import { htmlToPlainText } from "@/lib/shared-domain/html-to-plain-text";
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

function recipientsFromPayload(payload: CreateEmailOptions): string[] {
  const toRaw = "to" in payload ? payload.to : undefined;
  if (Array.isArray(toRaw)) return toRaw.map(String).filter(Boolean);
  if (toRaw) return [String(toRaw)];
  return [];
}

function subjectFromPayload(payload: CreateEmailOptions): string {
  return "subject" in payload && payload.subject
    ? String(payload.subject)
    : "(ohne Betreff)";
}

async function logWebsiteMailResult(input: {
  to: string[];
  subject: string;
  html: string;
  status: "gesendet" | "fehler";
  resendId?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  const { error: logErr } = await insertEmailLogRow({
    typ: "website",
    an_email: input.to.join(", ") || "(unbekannt)",
    betreff: input.subject,
    inhalt_html: input.html,
    status: input.status,
    resend_id: input.resendId ?? null,
    fehler_nachricht: input.status === "fehler" ? (input.errorMessage ?? "unbekannt") : null,
  });
  if (logErr) {
    console.warn("[sendBrandedMail] email_log:", logErr);
  }
}

/**
 * Sendet HTML-Mails mit Logo als HTTPS-URL (baerenwaldmuenchen.de) —
 * kein CID-Anhang (sonst Büroklammer in Apple Mail).
 * Staging: nur loggen, kein Resend-Versand.
 * P4-3: Erfolg und Fehler landen in email_log (sichtbar im CRM-E-Mail-Log).
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
  const existingText =
    "text" in payload && typeof payload.text === "string" ? payload.text.trim() : "";
  const text = existingText || htmlToPlainText(html) || undefined;
  // Explizit keine Logo-Attachments — echte PDFs o. Ä. aus payload bleiben.
  const extra = payload.attachments ?? [];
  const sendPayload: CreateEmailOptions = {
    ...payload,
    html,
    ...(text ? { text } : {}),
    ...(extra.length ? { attachments: extra } : { attachments: undefined }),
  };

  const toList = recipientsFromPayload(sendPayload);
  const subject = subjectFromPayload(sendPayload);

  if (isMailCatcherActive()) {
    const catchId = `staging-catch:website-${crypto.randomUUID()}`;
    console.info("[mail-catcher:website-sendBrandedMail]", {
      catchId,
      to: toList,
      subject,
      from: "from" in sendPayload ? sendPayload.from : undefined,
      attachmentCount: extra.length,
      at: new Date().toISOString(),
    });
    await logWebsiteMailResult({
      to: toList,
      subject,
      html,
      status: "gesendet",
      resendId: catchId,
    });
    return { data: { id: catchId }, error: null };
  }

  try {
    const result = await resend.emails.send(sendPayload, options);
    if (result.error) {
      await logWebsiteMailResult({
        to: toList,
        subject,
        html,
        status: "fehler",
        errorMessage: result.error.message,
      });
      return result;
    }
    await logWebsiteMailResult({
      to: toList,
      subject,
      html,
      status: "gesendet",
      resendId: result.data?.id ?? null,
    });
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await logWebsiteMailResult({
      to: toList,
      subject,
      html,
      status: "fehler",
      errorMessage: msg,
    });
    throw e;
  }
}
