import { SANITAER_BAD_Q } from "@/lib/funnel/fachdetails-questions";
import type { GuidedDecisionOption, GuidedFunnelDraft } from "./types";

export type GuidedFachdetailKey = "bad_was";

export function getMissingFachdetailKey(
  draft: GuidedFunnelDraft
): GuidedFachdetailKey | null {
  if (draft.situation !== "erneuern") return null;
  if (!draft.bereiche.some((b) => b === "bad" || b === "sanitaer")) return null;

  const sanitaer = draft.fachdetails?.sanitaer;
  const badWas =
    (typeof sanitaer === "object" ? sanitaer?.badWas : undefined) ??
    draft.fachdetails?.bad;
  if (badWas) return null;

  return "bad_was";
}

export function fachdetailOptionsForKey(key: GuidedFachdetailKey): GuidedDecisionOption[] {
  if (key === "bad_was") {
    return SANITAER_BAD_Q.options.map((o) => ({
      value: o.value,
      label: o.label,
      hint: o.hint,
    }));
  }
  return [];
}

export function fachdetailQuestionForKey(key: GuidedFachdetailKey): string {
  if (key === "bad_was") return SANITAER_BAD_Q.title;
  return "Noch eine kurze Frage:";
}

export function applyFachdetailValue(
  draft: GuidedFunnelDraft,
  key: GuidedFachdetailKey,
  value: string
): GuidedFunnelDraft {
  if (key === "bad_was") {
    return {
      ...draft,
      fachdetails: {
        ...draft.fachdetails,
        bad: value,
        sanitaer: { ...draft.fachdetails?.sanitaer, badWas: value },
      },
    };
  }
  return draft;
}
