/** Positions-Lebenszyklus (Spec Bautagebuch neu). status = leistung_status. */

export const POSITION_TYPEN = ["lv", "regie", "material"] as const;
export type PositionTyp = (typeof POSITION_TYPEN)[number];

export const POSITION_VERGUETUNGEN = ["festpreis", "aufwand"] as const;
export type PositionVerguetung = (typeof POSITION_VERGUETUNGEN)[number];

/** Spec-status — DB-Spalte leistung_status */
export const POSITION_LEBENSZYKLUS = ["offen", "in_arbeit", "erledigt"] as const;
export type PositionLebenszyklus = (typeof POSITION_LEBENSZYKLUS)[number];

export const EINTRAG_TYPEN = [
  "start",
  "fortschritt",
  "ergebnis",
  "weitere_arbeit",
] as const;
export type EintragTyp = (typeof EINTRAG_TYPEN)[number];

export const EINTRAG_ERFASST_VON = [
  "partner_app",
  "eigenbetrieb_app",
  "crm_intern",
] as const;
export type EintragErfasstVon = (typeof EINTRAG_ERFASST_VON)[number];

export function isPositionLebenszyklus(
  v: string | null | undefined
): v is PositionLebenszyklus {
  return !!v && (POSITION_LEBENSZYKLUS as readonly string[]).includes(v);
}

export function lebenszyklusLabel(status: string | null | undefined): string {
  switch (status) {
    case "in_arbeit":
      return "In Arbeit";
    case "erledigt":
      return "Erledigt";
    default:
      return "Offen";
  }
}

export function zeitMinutenFromStdMin(
  std: number | null | undefined,
  min: number | null | undefined
): number | null {
  const h = Number(std ?? 0);
  const m = Number(min ?? 0);
  if (!Number.isFinite(h) && !Number.isFinite(m)) return null;
  const total = Math.max(0, Math.round(h) * 60 + Math.round(m));
  return total > 0 ? total : null;
}

export function formatZeitMinuten(minuten: number | null | undefined): string {
  const n = Math.max(0, Math.round(Number(minuten ?? 0)));
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h <= 0) return `${m} Min`;
  if (m <= 0) return `${h} Std`;
  return `${h} Std ${m} Min`;
}
