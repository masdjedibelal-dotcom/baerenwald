/**
 * Portal 2.0 D6/D12 — `screenSettings` (gemeinsamer Screen, Rollen-Varianten).
 */

export type EinstellungenVariant = "hv" | "privat" | "mieter" | "handwerker";

export function einstellungenPageTitle(
  variant: EinstellungenVariant
): string {
  if (variant === "mieter") return "Konto";
  if (variant === "handwerker") return "Firmendaten";
  return "Einstellungen";
}

export const EINSTELLUNGEN_BRANDING_TITLE = "Branding & White-Label" as const;

export const EINSTELLUNGEN_BRANDING_INTRO =
  "Diese Angaben erscheinen für Ihre Mieter & Eigentümer im Login, im Portal, auf dem Aushang und in allen automatischen E-Mails – Bärenwald tritt dort nicht in Erscheinung." as const;

export const EINSTELLUNGEN_BRANDING_FOOTER =
  "Änderungen werden automatisch gespeichert und sofort in allen Mieter-Ansichten übernommen." as const;

export const EINSTELLUNGEN_LOGO_HINT =
  "PNG/SVG, quadratisch, min. 256 px. Ohne Upload nutzen wir Ihr Namenskürzel" as const;

export const EINSTELLUNGEN_SCHWELLE_TITLE =
  "Globaler Freigabe-Schwellenwert" as const;

export const EINSTELLUNGEN_SCHWELLE_INTRO =
  "Angebote unter diesem Betrag werden ohne manuelle Freigabe direkt beauftragt. Darüber muss die Verwaltung das Angebot annehmen." as const;

export const EINSTELLUNGEN_OBJEKT_SCHWELLE_TITLE =
  "Objekt-spezifische Schwellenwerte" as const;

export const EINSTELLUNGEN_PROFIL_EDIT = "Profil bearbeiten" as const;

export const EINSTELLUNGEN_LOGO_UPLOAD_OFFENER_PUNKT =
  "Logo-Datei-Upload: noch kein Storage-Flow — Anzeige über org_logo_url (Bärenwald) bzw. Namenskürzel (OFFENE-PUNKTE)." as const;

/** Format wie Mock `money(schwelle)`. */
export function formatEinstellungenSchwelle(
  value: number | null | undefined
): string {
  const n =
    value == null || !Number.isFinite(Number(value)) ? 500 : Number(value);
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}
