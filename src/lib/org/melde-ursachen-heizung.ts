/**
 * Heizung / Warmwasser — kurze HM-Ursachen (nur was vor Ort prüfbar ist).
 * Keine Fachfirma-Diagnose, keine Hebeanlage-Liste.
 * Entscheidung: hm_geloest | fachfirma.
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";

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
  if (raw === "nicht_warm") return "kalt";
  if (raw === "wasser_aus" || raw === "tropft") return "tropft_hk";
  return raw;
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
  const ww = ans(a, "melde_warmwasser");

  switch (problem) {
    case "kalt":
      if (kalt === "einzelne") {
        return orderIds(["thermostat", "entlueften"]);
      }
      if (ww === "nein") {
        return orderIds([
          "ww_aus",
          "anlage_aus",
          "druck_niedrig",
          "entlueften",
          "stoerung_sichtbar",
          "ww_trotz_heizung",
          "hebeanlage",
        ]);
      }
      return orderIds([
        "entlueften",
        "druck_niedrig",
        "anlage_aus",
        "stoerung_sichtbar",
        "thermostat",
        "hebeanlage",
      ]);

    case "kein_ww":
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

    case "tropft_hk":
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
  const betrifft = ans(a, "melde_betrifft");
  const problemLabel =
    {
      kalt: "Heizung / Wohnung bleibt kalt",
      kein_ww: "Kein Warmwasser",
      geraeusche: "Heizkörper machen Geräusche",
      tropft_hk: "Wasser am Heizkörper",
      sonstiges: "Heizung / Warmwasser",
    }[problem] ?? "Heizung / Warmwasser";
  if (betrifft === "mehrere") return `${problemLabel} — mehrere Wohnungen`;
  return problemLabel;
}

const HEIZUNG_PROBLEM_IDS = new Set([
  "kalt",
  "nicht_warm",
  "kein_ww",
  "geraeusche",
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
  const problem = normalizeProblem(ans(opts.answers ?? {}, "melde_problem"));
  if (problem && HEIZUNG_PROBLEM_IDS.has(problem)) return true;
  const hay = [
    ...(opts.bereiche ?? []),
    opts.bereichLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes("heizung") || hay.includes("warmwasser");
}
