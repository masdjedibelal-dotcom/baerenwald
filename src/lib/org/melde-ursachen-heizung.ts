/**
 * Heizung / Warmwasser — kurze HM-Ursachen (nur was vor Ort prüfbar ist).
 * Keine Fachfirma-Diagnose, keine Hebeanlage-Liste.
 * Entscheidung: hm_geloest | fachfirma.
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";
import { normalizeMeldeHeizungProblem } from "@/lib/funnel/melde-dynamic-questions";

export type HeizungUrsacheId =
  | "thermostat"
  | "entlueften"
  | "druck_niedrig"
  | "anlage_aus"
  | "stoerung_sichtbar"
  | "ww_aus"
  | "ww_trotz_heizung"
  | "hebeanlage"
  | "sonstiges";

export type MeldeUrsachenHeizungState = {
  bereich: "heizung";
  selectedUrsacheId: HeizungUrsacheId | null;
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
  return normalizeMeldeHeizungProblem(raw);
}

export function heizungSchadenKurz(answers: MeldeAnswers | undefined): string {
  const a = answers ?? {};
  const problem = normalizeProblem(ans(a, "melde_problem"));
  const kalt = ans(a, "melde_heizung_kalt");
  const problemLabel =
    {
      wohnung_kalt: "Wohnung / Heizung bleibt kalt",
      kein_warmwasser: "Kein Warmwasser",
      geraeusche: "Geräusche an der Heizung",
      wasser_am_hk: "Wasser am Heizkörper",
      kalt: "Heizung / Wohnung bleibt kalt",
      kein_ww: "Kein Warmwasser",
      tropft_hk: "Wasser am Heizkörper",
      sonstiges: "Heizung / Warmwasser",
    }[problem] ?? "Heizung / Warmwasser";
  if (problem === "wohnung_kalt" && kalt === "einzelne") {
    return "Nur einzelne Heizkörper kalt";
  }
  if (problem === "wohnung_kalt" && kalt === "ja") {
    return "Wohnung komplett kalt";
  }
  return problemLabel;
}

const HEIZUNG_PROBLEM_IDS = new Set([
  "wohnung_kalt",
  "kein_warmwasser",
  "wasser_am_hk",
  "geraeusche",
  "kalt",
  "nicht_warm",
  "kein_ww",
  "tropft_hk",
  "wasser_aus",
]);

export function isHeizungMeldeContext(opts: {
  answers?: MeldeAnswers | null;
  bereichLabel?: string | null;
  bereiche?: string[] | null;
  ursachenBereich?: string | null;
}): boolean {
  if (opts.ursachenBereich === "heizung") return true;
  const raw = ans(opts.answers ?? {}, "melde_problem");
  const problem = normalizeProblem(raw);
  if (problem && problem !== "sonstiges" && HEIZUNG_PROBLEM_IDS.has(problem)) {
    return true;
  }
  if (raw && HEIZUNG_PROBLEM_IDS.has(raw)) return true;
  const hay = [
    ...(opts.bereiche ?? []),
    opts.bereichLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes("heizung") || hay.includes("warmwasser");
}
