/**
 * Mapping Website-kaputt-Bereich → MeldeBereichId für Submit `/api/meldung`.
 */
import type { MeldeBereichId } from "@/lib/org/melde-bereiche";

export function kaputtBereichToMeldeId(bereich: string): MeldeBereichId {
  switch (bereich) {
    case "sanitaer":
      return "wasser";
    case "heizung":
      return "heizung";
    case "elektro":
      return "strom";
    case "fenster_tuer":
    case "fenster":
      return "fenster_tuer";
    case "dach":
      return "dach";
    case "baum_notfall":
    case "baum":
      return "baum_notfall";
    case "schimmel":
      return "schimmel";
    default:
      return "sonstiges";
  }
}
