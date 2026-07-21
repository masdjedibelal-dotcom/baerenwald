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
  "PNG oder JPG, quadratisch, min. 256 px. Ohne Upload nutzen wir Ihr Namenskürzel" as const;

export const EINSTELLUNGEN_HERO_HINT =
  "Breites Foto für die Übersicht (ca. 1600×400 px). Ohne Upload bleibt das Standardbild." as const;

export const EINSTELLUNGEN_SCHWELLE_TITLE =
  "Standard-Regel & Ausnahmen" as const;

export const EINSTELLUNGEN_SCHWELLE_INTRO =
  "Gilt für alle Objekte ohne eigene Ausnahme. Angebote bis zu diesem Betrag werden automatisch beauftragt — darüber ist Ihre Freigabe nötig." as const;

export const EINSTELLUNGEN_KLEINREPARATUR_TITLE =
  "Grenzbetrag Kleinreparaturen" as const;

export const EINSTELLUNGEN_KLEINREPARATUR_INTRO =
  "Bis zu diesem Betrag darf Bärenwald ohne Angebot sofort reparieren — sofern beim Objekt aktiviert." as const;

export const EINSTELLUNGEN_OBJEKT_SCHWELLE_TITLE =
  "Ausnahmen je Objekt" as const;

export const EINSTELLUNGEN_OBJEKT_SCHWELLE_INTRO =
  "Überschreibt die Standard-Regel für einzelne Objekte." as const;

export const EINSTELLUNGEN_ANGEBOT_FREIGABE_TITLE =
  "Angebots-Freigabe" as const;

export const EINSTELLUNGEN_ANGEBOT_FREIGABE_INTRO =
  "Wie sollen Angebote oberhalb der Schwelle behandelt werden?" as const;

export const EINSTELLUNGEN_PROFIL_EDIT = "Profil bearbeiten" as const;

/** Schnellwahl-Beträge wie im Mock (250 / 500 / 1k / 2k). */
export const EINSTELLUNGEN_SCHWELLE_PRESETS = [250, 500, 1000, 2000] as const;

export function formatEinstellungenSchwellePreset(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return Number.isInteger(k) ? `${k}k €` : `${k}k €`;
  }
  return `${value} €`;
}

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

export function einstellungenSchwelleInfo(value: number): string {
  const label = formatEinstellungenSchwelle(value);
  return `Angebote bis ${label} werden automatisch beauftragt. Ab ${label} ist Ihre Freigabe nötig.`;
}
