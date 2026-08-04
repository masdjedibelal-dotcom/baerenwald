/**
 * Portal 2.0 B9 — Mock `modalEinladen` Texte.
 */

export const PORTAL_EINLADEN_TITLE = "Mieter einladen";

export const PORTAL_EINLADEN_SUBTITLE =
  "Teilen Sie diesen Link mit dem Mieter — Konto anlegen und Wohnung verknüpfen.";

export const PORTAL_EINLADEN_COPY = "Kopieren";
export const PORTAL_EINLADEN_MAIL = "Per E-Mail senden";
export const PORTAL_EINLADEN_QR = "QR-Code anzeigen";
export const PORTAL_EINLADEN_QR_HIDE = "QR-Code ausblenden";

/** Footnote-Template — `{objekt}` ersetzen. */
export const PORTAL_EINLADEN_FOOTNOTE =
  'Der Link ist objektgebunden ({objekt}). Nach Registrierung erscheint der Mieter im Portal (D10).';

export function formatPortalEinladenFootnote(objektLabel: string): string {
  const label = objektLabel.trim() || "Objekt";
  return PORTAL_EINLADEN_FOOTNOTE.replace("{objekt}", label);
}

/** @deprecated E4 nutzt buildPortalEinladungMailto — bleibt für Tests/B9. */
export function buildPortalEinladenMailto(link: string, objektLabel: string): string {
  const subj = encodeURIComponent(`Portal-Einladung — ${objektLabel.trim() || "Ihr Objekt"}`);
  const body = encodeURIComponent(
    `Guten Tag,\n\nüber diesen Link können Sie Ihr Mieter-Konto anlegen:\n\n${link}\n\nViele Grüße`
  );
  return `mailto:?subject=${subj}&body=${body}`;
}
