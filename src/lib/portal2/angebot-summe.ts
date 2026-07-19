/**
 * Portal 2.0 TEIL G2 — Summenlogik kanonisch (`angebotSumme`).
 * Netto = Σ einzel×menge, MwSt 19 %, Brutto = Netto×1.19.
 * Re-Export aus hv-detail (D3) — eine Quelle für alle Screens.
 */

export {
  angebotSumme,
  angebotSummeFromBruttoTotal,
  angebotSummeFromPositionen,
  moneyEur,
  type AngebotSumme,
  type HvDetailPosition,
} from "@/lib/portal2/hv-detail";

export const ANGEBOT_MWST_RATE = 0.19 as const;
