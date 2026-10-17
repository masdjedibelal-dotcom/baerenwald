/**
 * Mail-Logos: öffentlich gehostete HTTPS-URLs (kein CID-Anhang).
 * CID zeigt in Apple Mail oft als Büroklammer + kaputtes Bild.
 */

/** Stabile Produktions-URL — unabhängig von Staging/Preview-Hosts. */
import { istTeo, MARKE } from "@/lib/marke";
export const MAIL_LOGO_HOST = MARKE.portalUrl;

/** Servus TEO: eigene Logos unter /brand/teo/ */
const MAIL_LOGO_DIR = istTeo ? "/brand/teo" : "";
export const MAIL_LOGO_URL_GREEN = `${MAIL_LOGO_HOST}${MAIL_LOGO_DIR}/mail-logo-green.png`;
export const MAIL_LOGO_URL_WHITE = `${MAIL_LOGO_HOST}${MAIL_LOGO_DIR}/mail-logo-white.png`;

/**
 * Alle Logo-src (http, relativ, cid) → stabile HTTPS-URLs auf der Website.
 * Keine Anhänge — Client lädt das Bild vom Provider/Netz.
 */
export function rewriteMailLogoUrlsToHosted(html: string): string {
  return html
    .replace(
      /src=(["'])([^"']*(?:logo-mark-green|mail-logo-green)\.png[^"']*|cid:baerenwald-logo-green)\1/gi,
      `src=$1${MAIL_LOGO_URL_GREEN}$1`
    )
    .replace(
      /src=(["'])([^"']*(?:logo-mark-white|mail-logo-white)\.png[^"']*|cid:baerenwald-logo-white)\1/gi,
      `src=$1${MAIL_LOGO_URL_WHITE}$1`
    );
}
