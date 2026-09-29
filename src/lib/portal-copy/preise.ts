/**
 * Preis-/Stundensatz-Beschriftungen (Portal).
 * Seite nie erraten — Aufrufer übergibt ansicht.
 */
import type { PreisAnsicht } from "@/lib/portal/stundensatz-ansicht";

export const PREISE = {
  /** Kundenportal / HV / Eigentümer / Mieter */
  stundensatz: "Stundensatz",
  /** Handwerkerportal */
  stundensatzPartner: "Ihr Stundensatz",
} as const;

export function stundensatzBeschriftung(ansicht: PreisAnsicht): string {
  return ansicht === "partner" ? PREISE.stundensatzPartner : PREISE.stundensatz;
}
