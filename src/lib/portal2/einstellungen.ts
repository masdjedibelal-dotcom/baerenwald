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

export const EINSTELLUNGEN_SCHWELLE_TITLE = "Freigabe-Regeln" as const;

export const EINSTELLUNGEN_SCHWELLE_INTRO = "" as const;

export const EINSTELLUNGEN_SCHWELLE_BETRAG_TITLE = "Freigabeschwelle" as const;

export const EINSTELLUNGEN_PROFIL_EDIT = "Profil bearbeiten" as const;

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
