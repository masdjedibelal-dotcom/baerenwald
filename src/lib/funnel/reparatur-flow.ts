import type { Situation } from "@/lib/funnel/types";

/** Gemeinsamer Logikpfad für „Reparatur & Notfall“ (ein Situationstyp `kaputt`, ohne Wohnflächen-Rechner). */
export function isReparaturNotfallSituation(
  situation: Situation | null | undefined
): boolean {
  return situation === "kaputt";
}
