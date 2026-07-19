import type { MeldeBereichId } from "@/lib/org/melde-bereiche";
import type { MeldeKategorie } from "@/lib/org/types";
import {
  fachfrageLabel,
  getFachfragenForBereich,
} from "@/lib/portal2/fachfragen";

export type MeldeFachfrageUi = {
  id: string;
  frage: string;
  optionen: Array<{ value: string; label: string }>;
};

/**
 * Portal 2.0 TEIL C — Melde-Fachfragen = Mock `FACHFRAGEN` (3× Ja/Nein).
 */
export function getMeldeFachdetailQuestions(input: {
  kategorie: MeldeKategorie;
  bereichId: MeldeBereichId;
  plz: string;
  fachdetailAnswers?: Record<string, string | string[]>;
  lang?: "de" | "en";
}): MeldeFachfrageUi[] {
  void input.kategorie;
  void input.plz;
  void input.fachdetailAnswers;
  const lang = input.lang ?? "de";
  return getFachfragenForBereich(input.bereichId).map((q) => ({
    id: q.id,
    frage: fachfrageLabel(q, lang),
    optionen: [
      { value: "ja", label: lang === "en" ? "Yes" : "Ja" },
      { value: "nein", label: lang === "en" ? "No" : "Nein" },
    ],
  }));
}
