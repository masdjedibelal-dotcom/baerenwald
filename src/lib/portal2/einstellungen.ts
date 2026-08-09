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

export const EINSTELLUNGEN_BRANDING_INTRO = "" as const;

export const EINSTELLUNGEN_BRANDING_FOOTER = "" as const;

export const EINSTELLUNGEN_LOGO_HINT =
  "PNG oder JPG, quadratisch, min. 256 px. Ohne Upload nutzen wir Ihr Namenskürzel" as const;

export const EINSTELLUNGEN_HERO_HINT =
  "Breites Foto für die Übersicht (ca. 1600×400 px). Ohne Upload bleibt das Standardbild." as const;

export const EINSTELLUNGEN_SCHWELLE_TITLE = "Freigabebetrag" as const;

export const EINSTELLUNGEN_SCHWELLE_INTRO = "" as const;

/** @deprecated kein Kleinreparatur-Pfad mehr */
export const EINSTELLUNGEN_KLEINREPARATUR_TITLE =
  "Kleinreparaturen ohne Angebot" as const;

/** @deprecated */
export const EINSTELLUNGEN_KLEINREPARATUR_INTRO =
  "Entfernt — unter der Schwelle läuft der Auto-Pfad über Angebot + Auftrag." as const;

export const EINSTELLUNGEN_AKUT_TITLE =
  "Direktbeauftragung bei Sofortmaßnahmen" as const;

export const EINSTELLUNGEN_AKUT_INTRO =
  "Beispiel: Wasser läuft, kein Strom in der Wohnung, Heizung komplett ausgefallen, Dach undicht mit Wassereintritt. Keine Freigabe nötig — nur Info an Sie." as const;

export const EINSTELLUNGEN_OBJEKT_SCHWELLE_TITLE =
  "Ausnahmen je Objekt" as const;

export const EINSTELLUNGEN_OBJEKT_SCHWELLE_INTRO = "" as const;

export const EINSTELLUNGEN_PROFIL_EDIT = "Profil bearbeiten" as const;

/** @deprecated Pills entfernt — nutzen Sie den Slider (0–5000 / 500er). */
export const EINSTELLUNGEN_SCHWELLE_PRESETS = [500, 1000, 1500, 2000, 2500, 5000] as const;

/** Regler: 0–5000 € in 500er-Schritten. */
export const EINSTELLUNGEN_SCHWELLE_SLIDER_MIN = 0;
export const EINSTELLUNGEN_SCHWELLE_SLIDER_MAX = 5000;
export const EINSTELLUNGEN_SCHWELLE_SLIDER_STEP = 500;

export function snapEinstellungenSchwelle(value: number): number {
  const n = Number.isFinite(value) ? value : 500;
  const stepped =
    Math.round(n / EINSTELLUNGEN_SCHWELLE_SLIDER_STEP) *
    EINSTELLUNGEN_SCHWELLE_SLIDER_STEP;
  return Math.min(
    EINSTELLUNGEN_SCHWELLE_SLIDER_MAX,
    Math.max(EINSTELLUNGEN_SCHWELLE_SLIDER_MIN, stepped)
  );
}

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
  return "";
}
