/**
 * Melde-/Kaputt-Fragen: Mieter-Ich/Sie vs. neutrale Verwalter-Formulierung (HV ohne Mieter).
 */

import type { MeldeFachfrageUi } from "@/lib/org/melde-fachdetails";

export type MeldeFrageVoice = "mieter" | "verwaltung";

const FRAGE_VERWALTUNG: Record<string, string> = {
  "Können Sie das Wasser abstellen?": "Kann das Wasser abgestellt werden?",
  "Haben Sie es wieder eingeschaltet — und ist es danach wieder rausgeflogen?":
    "Wurde es wieder eingeschaltet — und ist es danach wieder rausgeflogen?",
  "Können Sie noch richtig schließen bzw. absperren?":
    "Lässt sich noch richtig schließen bzw. absperren?",
};

const LABEL_VERWALTUNG: Record<string, string> = {
  "Nur meine Wohnung": "Nur eine Wohnung",
  "Weiß nicht / schaue nicht nach": "Weiß nicht / nicht geprüft",
};

function remapText(raw: string, map: Record<string, string>): string {
  return map[raw] ?? raw;
}

/** Fachfragen an Stimme anpassen — Werte (IDs) bleiben gleich. */
export function applyMeldeFrageVoice(
  questions: MeldeFachfrageUi[],
  voice: MeldeFrageVoice
): MeldeFachfrageUi[] {
  if (voice === "mieter") return questions;
  return questions.map((q) => ({
    ...q,
    frage: remapText(q.frage, FRAGE_VERWALTUNG),
    optionen: q.optionen.map((o) => ({
      ...o,
      label: remapText(o.label, LABEL_VERWALTUNG),
      hint: o.hint ? remapText(o.hint, LABEL_VERWALTUNG) : o.hint,
    })),
  }));
}
