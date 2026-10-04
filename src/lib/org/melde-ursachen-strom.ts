/**
 * Strom / Garagentor — mögliche Ursachen (eine Auswahl), priorisiert.
 * Keine Prüf-Checkliste, keine Sofortmaßnahmen/Priorität.
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";
import { normalizeMeldeStromProblem } from "@/lib/funnel/melde-dynamic-questions";

export type StromUrsacheId =
  | "fi_automat"
  | "steckdose"
  | "licht_schalter"
  | "leuchtmittel"
  | "klingel"
  | "tor_strom"
  | "lichtschranke"
  | "verklemmt"
  | "fb_batterie"
  | "notentriegelung"
  | "sonstiges";

export type MeldeUrsachenStromState = {
  bereich: "strom";
  selectedUrsacheId: StromUrsacheId | null;
  sonstigesText?: string | null;
  entscheidung: "hm_geloest" | "fachfirma" | null;
  material?: string[];
  updatedAt?: string | null;
};

function ans(a: MeldeAnswers, id: string): string {
  const v = a[id];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

function normalizeProblem(raw: string): string {
  return normalizeMeldeStromProblem(raw);
}

export function stromSchadenKurz(answers: MeldeAnswers | undefined): string {
  const a = answers ?? {};
  const problem = normalizeProblem(ans(a, "melde_problem"));
  const problemLabel =
    {
      kein_strom: "Kein Strom",
      fi_sicherung: "Sicherung / FI fliegt raus",
      einzelner_punkt: "Steckdose, Licht oder Schalter defekt",
      klingel: "Klingel / Türsprecher",
      garagentor: "Garagentor öffnet oder schließt nicht",
      steckdose: "Steckdose funktioniert nicht",
      licht: "Licht funktioniert nicht",
      schalter: "Schalter defekt",
      sonstiges: "Strom / Elektrik",
    }[problem] ?? "Strom / Elektrik";
  return problemLabel;
}

const STROM_PROBLEM_IDS = new Set([
  "kein_strom",
  "fi_sicherung",
  "einzelner_punkt",
  "klingel",
  "garagentor",
  "steckdose",
  "licht",
  "schalter",
]);

export function isStromMeldeContext(opts: {
  answers?: MeldeAnswers | null;
  bereichLabel?: string | null;
  bereiche?: string[] | null;
  ursachenBereich?: string | null;
}): boolean {
  if (opts.ursachenBereich === "strom") return true;
  const raw = ans(opts.answers ?? {}, "melde_problem");
  const problem = normalizeProblem(raw);
  if (problem && problem !== "sonstiges" && STROM_PROBLEM_IDS.has(problem)) {
    return true;
  }
  if (raw && STROM_PROBLEM_IDS.has(raw)) return true;
  const hay = [
    ...(opts.bereiche ?? []),
    opts.bereichLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return (
    hay.includes("strom") ||
    hay.includes("elektro") ||
    hay.includes("garage") ||
    hay.includes("sicherung")
  );
}
