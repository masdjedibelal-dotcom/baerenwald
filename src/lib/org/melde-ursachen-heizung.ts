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

export type HeizungUrsacheOption = {
  id: HeizungUrsacheId;
  label: string;
};

export type MeldeUrsachenHeizungState = {
  bereich: "heizung";
  selectedUrsacheId: HeizungUrsacheId | null;
  sonstigesText?: string | null;
  entscheidung: "hm_geloest" | "fachfirma" | null;
  material?: string[];
  updatedAt?: string | null;
};

const ALL: Record<HeizungUrsacheId, string> = {
  thermostat: "Thermostat zu oder aus",
  entlueften: "Heizkörper muss entlüftet werden",
  druck_niedrig: "Druck zu niedrig (nachfüllen möglich)",
  anlage_aus: "Heizung / Anlage ausgeschaltet",
  stoerung_sichtbar: "Störungsanzeige sichtbar (ohne Diagnose)",
  ww_aus: "Warmwasser ausgeschaltet / Bereiter aus",
  ww_trotz_heizung: "Kein Warmwasser trotz laufender Heizung",
  hebeanlage: "Hebeanlage (Alarm / Überlauf / Pumpe)",
  sonstiges: "Sonstiges",
};

function ans(a: MeldeAnswers, id: string): string {
  const v = a[id];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

function normalizeProblem(raw: string): string {
  return normalizeMeldeHeizungProblem(raw);
}

function orderIds(ids: HeizungUrsacheId[]): HeizungUrsacheOption[] {
  const uniq = ids.filter((id, i) => ids.indexOf(id) === i);
  if (!uniq.includes("sonstiges")) uniq.push("sonstiges");
  return uniq.map((id) => ({ id, label: ALL[id] }));
}

/**
 * Kurze Liste — wahrscheinlichste HM-Checks zuerst.
 */
export function heizungUrsachenForAnswers(
  answers: MeldeAnswers | undefined
): HeizungUrsacheOption[] {
  const a = answers ?? {};
  const problem = normalizeProblem(ans(a, "melde_problem"));
  const kalt = ans(a, "melde_heizung_kalt");

  switch (problem) {
    case "wohnung_kalt":
      if (kalt === "einzelne" || kalt === "teilweise") {
        return orderIds(["thermostat", "entlueften"]);
      }
      return orderIds([
        "entlueften",
        "druck_niedrig",
        "anlage_aus",
        "stoerung_sichtbar",
        "thermostat",
        "hebeanlage",
      ]);

    case "kein_warmwasser":
      return orderIds([
        "ww_aus",
        "anlage_aus",
        "stoerung_sichtbar",
        "ww_trotz_heizung",
        "hebeanlage",
      ]);

    case "geraeusche":
      return orderIds([
        "entlueften",
        "druck_niedrig",
        "stoerung_sichtbar",
        "anlage_aus",
        "hebeanlage",
      ]);

    case "wasser_am_hk":
      return orderIds([
        "druck_niedrig",
        "stoerung_sichtbar",
        "anlage_aus",
        "hebeanlage",
        "sonstiges",
      ]);

    default:
      return orderIds([
        "entlueften",
        "druck_niedrig",
        "anlage_aus",
        "ww_aus",
        "stoerung_sichtbar",
        "thermostat",
        "ww_trotz_heizung",
        "hebeanlage",
      ]);
  }
}

export function heizungUrsacheLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return ALL[id as HeizungUrsacheId] ?? id;
}

export const HEIZUNG_MATERIAL_OPTIONS = [
  { value: "thermostat", label: "Thermostat" },
  { value: "entlueftet", label: "Entlüftet" },
  { value: "nachgefuellt", label: "Nachgefüllt" },
  { value: "eingeschaltet", label: "Eingeschaltet" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

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
