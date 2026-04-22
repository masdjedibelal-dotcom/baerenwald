import {
  fachdetailAnswer,
  getActiveFachdetailQuestions,
  type FachdetailFilterState,
} from "@/lib/funnel/fachdetail-questions-flat";
import type { FachdetailGewerkKey } from "@/lib/funnel/fachdetails-notfall";
import type { FachdetailsState, Situation } from "@/lib/funnel/types";

/** Ob für ein Gewerk alle aktiven Fachdetail-Screens beantwortet sind. */
export function isFachdetailGewerkChainComplete(
  bereiche: string[],
  situationNotfall: boolean,
  fd: FachdetailsState,
  g: FachdetailGewerkKey,
  situation: Situation | null = null
): boolean {
  const st: FachdetailFilterState = {
    bereiche,
    situation: situationNotfall ? "notfall" : situation,
    fachdetails: fd,
  };
  const qs = getActiveFachdetailQuestions(st).filter((q) => q.gewerk === g);
  for (const q of qs) {
    const v = fachdetailAnswer(st, q.id);
    if (q.inputType === "multi") {
      const n = Array.isArray(v)
        ? v.length
        : typeof v === "string" && v
          ? v.split(",").filter(Boolean).length
          : 0;
      if (n === 0) return false;
    } else if (v === undefined || v === "") {
      return false;
    }
  }
  return true;
}
