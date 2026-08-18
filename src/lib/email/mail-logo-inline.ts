import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const MAIL_LOGO_CID_GREEN = "baerenwald-logo-green";
export const MAIL_LOGO_CID_WHITE = "baerenwald-logo-white";

export function rewriteMailLogoUrlsToCid(html: string): string {
  return html
    .replace(
      /src=(["'])([^"']*(?:logo-mark-green|mail-logo-green)\.png[^"']*|cid:baerenwald-logo-green)\1/gi,
      `src=$1cid:${MAIL_LOGO_CID_GREEN}$1`
    )
    .replace(
      /src=(["'])([^"']*(?:logo-mark-white|mail-logo-white)\.png[^"']*|cid:baerenwald-logo-white)\1/gi,
      `src=$1cid:${MAIL_LOGO_CID_WHITE}$1`
    );
}

function readLogo(fileNames: string[]): Buffer | null {
  const root = process.cwd();
  for (const name of fileNames) {
    const abs = join(root, "public", name);
    if (existsSync(abs)) return readFileSync(abs);
  }
  return null;
}

export type MailLogoAttachment = {
  filename: string;
  content: Buffer;
  contentId: string;
  contentType: "image/png";
  contentDisposition: "inline";
};

export function inlineLogoAttachmentsForHtml(html: string): MailLogoAttachment[] {
  const out: MailLogoAttachment[] = [];
  if (html.includes(MAIL_LOGO_CID_GREEN)) {
    const content =
      readLogo(["mail-logo-green.png", "logo-mark-green.png"]) ?? null;
    if (content) {
      out.push({
        filename: "logo-mark-green.png",
        content,
        contentId: MAIL_LOGO_CID_GREEN,
        contentType: "image/png",
        contentDisposition: "inline",
      });
    }
  }
  if (html.includes(MAIL_LOGO_CID_WHITE)) {
    const content =
      readLogo(["mail-logo-white.png", "logo-mark-white.png"]) ?? null;
    if (content) {
      out.push({
        filename: "logo-mark-white.png",
        content,
        contentId: MAIL_LOGO_CID_WHITE,
        contentType: "image/png",
        contentDisposition: "inline",
      });
    }
  }
  return out;
}
