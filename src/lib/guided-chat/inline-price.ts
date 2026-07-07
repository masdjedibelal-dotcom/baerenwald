import { BW_FUNNEL_INITIAL_STATE } from "@/hooks/funnel/useFunnelState";
import { calculatePrice, isBwZuKomplexErgebnis } from "@/lib/funnel/price-calc";
import { needsZeitraumSelection } from "@/lib/funnel/config";
import type { FunnelState } from "@/lib/funnel/types";

import { draftToHandoff } from "./draft";
import type { GuidedFunnelDraft, GuidedPriceOutcome } from "./types";

function buildCalcState(draft: GuidedFunnelDraft): FunnelState | null {
  const handoff = draftToHandoff(draft);
  if (!handoff) return null;

  const zeitraum =
    handoff.zeitraum ??
    (needsZeitraumSelection(handoff.situation) ? ("flexibel" as const) : null);

  return {
    ...BW_FUNNEL_INITIAL_STATE,
    situation: handoff.situation,
    bereiche: handoff.bereiche,
    groesse: handoff.groesse,
    groesseEinheit: handoff.groesseEinheit,
    plz: handoff.plz,
    zeitraum,
    kundentyp: handoff.kundentyp,
    badAusstattung: handoff.badAusstattung,
    zugaenglichkeit: handoff.zugaenglichkeit,
    zustand: handoff.zustand,
    fachdetails: handoff.fachdetails,
  };
}

export function tryGuidedInlinePrice(draft: GuidedFunnelDraft): GuidedPriceOutcome | null {
  const handoff = draftToHandoff(draft);
  if (!handoff) return null;

  if (!handoff.plz || handoff.plz.length < 5) {
    return { kind: "incomplete", nextField: "plz", draft };
  }

  if (needsZeitraumSelection(handoff.situation) && !draft.zeitraum && !handoff.zeitraum) {
    return { kind: "incomplete", nextField: "zeitraum", draft };
  }

  const calcState = buildCalcState(draft);
  if (!calcState) return null;

  const result = calculatePrice(calcState);

  if (isBwZuKomplexErgebnis(calcState, result.resultModus)) {
    return {
      kind: "beratung",
      reason:
        result.komplexReason ??
        "Für dein Vorhaben brauchen wir eine kurze persönliche Einschätzung — ich helfe dir gern bei der Anfrage.",
    };
  }

  if (result.min <= 0 && result.max <= 0) {
    return {
      kind: "beratung",
      reason: "Dafür können wir dir hier keinen verlässlichen Rahmen geben — lass uns dein Projekt direkt anfragen.",
    };
  }

  return { kind: "price", result, draft };
}
