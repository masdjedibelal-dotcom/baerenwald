import type { CreateEmailOptions, CreateEmailRequestOptions, Resend } from "resend";

import {
  inlineLogoAttachmentsForHtml,
  rewriteMailLogoUrlsToCid,
} from "@/lib/email/mail-logo-inline";
import { isStagingDeploy } from "@/lib/staging";

function toBase64(content: Buffer | Uint8Array | string): string {
  if (typeof content === "string") return content;
  return Buffer.from(content).toString("base64");
}

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
 * Sendet HTML-Mails mit eingebettetem Logo (CID), damit der Header
 * nicht von Website-URL / Image-Proxy abhängt.
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
  const html: string = rewriteMailLogoUrlsToCid(sourceHtml);
  const logos = inlineLogoAttachmentsForHtml(html);
  const extra = payload.attachments ?? [];
  const attachments = [
    ...logos.map((logo) => ({
      filename: logo.filename,
      content: toBase64(logo.content),
      contentId: logo.contentId,
      contentType: logo.contentType,
      contentDisposition: logo.contentDisposition,
    })),
    ...extra,
  ];
  const sendPayload: CreateEmailOptions = {
    ...payload,
    html,
    ...(attachments.length ? { attachments } : {}),
  };

  if (isMailCatcherActive()) {
    const catchId = `staging-catch:${crypto.randomUUID()}`;
    const to = "to" in sendPayload ? sendPayload.to : undefined;
    console.info("[mail-catcher:website-sendBrandedMail]", {
      catchId,
      to,
      subject: "subject" in sendPayload ? sendPayload.subject : undefined,
      from: "from" in sendPayload ? sendPayload.from : undefined,
      attachmentCount: attachments.length,
      at: new Date().toISOString(),
    });
    return { data: { id: catchId }, error: null };
  }

  return resend.emails.send(sendPayload, options);
}
