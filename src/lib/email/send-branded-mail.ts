import type { CreateEmailOptions, CreateEmailRequestOptions, Resend } from "resend";

import {
  inlineLogoAttachmentsForHtml,
  rewriteMailLogoUrlsToCid,
} from "@/lib/email/mail-logo-inline";

function toBase64(content: Buffer | Uint8Array | string): string {
  if (typeof content === "string") return content;
  return Buffer.from(content).toString("base64");
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
  const html =
    typeof payload.html === "string"
      ? rewriteMailLogoUrlsToCid(payload.html)
      : payload.html;
  const logos =
    typeof html === "string" ? inlineLogoAttachmentsForHtml(html) : [];
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
  return resend.emails.send(
    {
      ...payload,
      html,
      ...(attachments.length ? { attachments } : {}),
    },
    options
  );
}
