import type { Situation } from "@/lib/funnel/types";

/** Gemeinsamer Logikpfad für „Kaputt / Defekt“ und „Notfall“ (ohne Wohnflächen-Rechner). */
export function isReparaturNotfallSituation(
  situation: Situation | null | undefined
): boolean {
  return situation === "kaputt" || situation === "notfall";
}
