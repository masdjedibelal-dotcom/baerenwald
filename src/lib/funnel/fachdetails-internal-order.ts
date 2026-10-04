/**
 * Lineare Sub-Step-Reihenfolge für Fachdetails (ein Screen pro Gewerk, mehrere Fragen).
 * Genutzt für interne Zurück/Weiter-Navigation entkoppelt vom globalen stepSequence.
 */

import type { FachdetailsState,Situation } from "@/lib/funnel/types";

/** Kurzschluss ohne Sanitär-Wasser-Frage — z. B. nur Fliesen oder Komplett ohne Leck-Follow-up. */
export function sanitaerShortDone(
  bereiche: string[],
  situation: Situation | null,
  s: NonNullable<FachdetailsState["sanitaer"]>
): boolean {
  const needBadExtra = bereiche.includes("bad");
  if (
    needBadExtra &&
    situation === "erneuern" &&
    s.badWas === "wanne_dusche"
  ) {
    return true;
  }
  if (
    needBadExtra &&
    situation === "erneuern" &&
    s.badWas &&
    s.badWas !== "wanne_dusche" &&
    s.badWas !== "objekte" &&
    s.badWas !== "sanitaer"
  ) {
    return true;
  }
  return false;
}
