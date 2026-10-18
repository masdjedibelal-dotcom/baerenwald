import { MARKE } from "@/lib/marke";

/** Preisspanne einer Meldung/Anfrage für die Anzeige im Portal. */
export function formatPreisspanneDisplay(
  preisMin: number | null | undefined,
  preisMax: number | null | undefined,
  preisUnsicher?: boolean | null
): string {
  if (preisUnsicher || preisMin == null || preisMax == null) {
    return `Preis nach Prüfung durch ${MARKE.name}`;
  }
  if (preisMin <= 0 && preisMax <= 0) {
    return `Preis nach Prüfung durch ${MARKE.name}`;
  }
  if (Math.abs(preisMin - preisMax) < 1) {
    return `ca. ${preisMin.toLocaleString("de-DE")} € netto`;
  }
  return `ca. ${preisMin.toLocaleString("de-DE")} – ${preisMax.toLocaleString("de-DE")} € netto`;
}
