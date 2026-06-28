import { buildMeldeFunnelState } from "@/lib/org/map-melde-to-price";
import {
  getActiveFachdetailQuestions,
  type FachdetailQuestion,
} from "@/lib/funnel/fachdetail-questions-flat";
import type { MeldeBereichId } from "@/lib/org/melde-bereiche";
import type { MeldeKategorie } from "@/lib/org/types";

const MAX_MELDE_FACHDETAIL = 2;

export function getMeldeFachdetailQuestions(input: {
  kategorie: MeldeKategorie;
  bereichId: MeldeBereichId;
  plz: string;
  fachdetailAnswers?: Record<string, string | string[]>;
}): FachdetailQuestion[] {
  if (input.bereichId === "sonstiges" || input.kategorie === "sonstiges") {
    return [];
  }

  const state = buildMeldeFunnelState({
    kategorie: input.kategorie,
    bereichId: input.bereichId,
    plz: input.plz,
    fachdetailAnswers: input.fachdetailAnswers,
  });

  return getActiveFachdetailQuestions(state).slice(0, MAX_MELDE_FACHDETAIL);
}
