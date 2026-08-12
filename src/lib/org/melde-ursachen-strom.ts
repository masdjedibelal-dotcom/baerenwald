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

export type StromUrsacheOption = {
  id: StromUrsacheId;
  label: string;
};

export type MeldeUrsachenStromState = {
  bereich: "strom";
  selectedUrsacheId: StromUrsacheId | null;
  sonstigesText?: string | null;
  entscheidung: "hm_geloest" | "fachfirma" | null;
  material?: string[];
  updatedAt?: string | null;
};

const ALL: Record<StromUrsacheId, string> = {
  fi_automat: "FI- oder Sicherungsautomat ausgelöst",
  steckdose: "Steckdose locker oder beschädigt",
  licht_schalter: "Licht / Schalter defekt",
  leuchtmittel: "Leuchtmittel defekt",
  klingel: "Klingel / Türsprecher",
  tor_strom: "Stromversorgung / Sicherung am Tor",
  lichtschranke: "Lichtschranke verschmutzt oder blockiert",
  verklemmt: "Tor / Schiene verklemmt",
  fb_batterie: "Fernbedienung Batterie leer",
  notentriegelung: "Notentriegelung / Tor mechanisch",
  sonstiges: "Sonstiges",
};

function ans(a: MeldeAnswers, id: string): string {
  const v = a[id];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

function normalizeProblem(raw: string): string {
  return normalizeMeldeStromProblem(raw);
}

function orderIds(ids: StromUrsacheId[]): StromUrsacheOption[] {
  const uniq = ids.filter((id, i) => ids.indexOf(id) === i);
  if (!uniq.includes("sonstiges")) uniq.push("sonstiges");
  return uniq.map((id) => ({ id, label: ALL[id] }));
}

/** Mögliche Ursachen — wahrscheinlichste zuerst. */
export function stromUrsachenForAnswers(
  answers: MeldeAnswers | undefined
): StromUrsacheOption[] {
  const a = answers ?? {};
  const problem = normalizeProblem(ans(a, "melde_problem"));
  const sicherung = ans(a, "melde_sicherung_raus");
  const wieder = ans(a, "melde_wieder_raus");

  switch (problem) {
    case "kein_strom":
    case "fi_sicherung":
      if (wieder === "ja" || wieder === "weiss_nicht") {
        return orderIds(["fi_automat", "sonstiges"]);
      }
      if (sicherung === "ja") {
        return orderIds(["fi_automat", "sonstiges"]);
      }
      return orderIds(["fi_automat", "sonstiges"]);

    case "einzelner_punkt":
      return orderIds([
        "leuchtmittel",
        "licht_schalter",
        "steckdose",
        "fi_automat",
        "sonstiges",
      ]);

    case "klingel":
      return orderIds(["klingel", "sonstiges"]);

    case "garagentor":
      return orderIds([
        "tor_strom",
        "lichtschranke",
        "verklemmt",
        "fb_batterie",
        "notentriegelung",
        "sonstiges",
      ]);

    default:
      return orderIds([
        "fi_automat",
        "steckdose",
        "leuchtmittel",
        "licht_schalter",
        "klingel",
        "sonstiges",
      ]);
  }
}

export function stromUrsacheLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return ALL[id as StromUrsacheId] ?? id;
}

export const STROM_MATERIAL_OPTIONS = [
  { value: "sicherung", label: "Sicherung" },
  { value: "leuchtmittel", label: "Leuchtmittel" },
  { value: "batterie", label: "Batterie" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

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
