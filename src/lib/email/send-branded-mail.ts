import type { CreateEmailOptions, CreateEmailRequestOptions, Resend } from "resend";

import {
  inlineLogoAttachmentsForHtml,
  rewriteMailLogoUrlsToCid,
} from "@/lib/email/mail-logo-inline";

function toBase64(content: Buffer | Uint8Array | string): string {
  if (typeof content === "string") return content;
  return Buffer.from(content).toString("base64");
}

function htmlFromPayload(payload: CreateEmailOptions): string {
  if (!("html" in payload)) return "";
  const value = payload.html;
  return typeof value === "string" ? value : "";
}

/**
 * Sendet HTML-Mails mit eingebettetem Logo (CID), damit der Header
 * nicht von Website-URL / Image-Proxy abhängt.
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
  return resend.emails.send(sendPayload, options);
}
