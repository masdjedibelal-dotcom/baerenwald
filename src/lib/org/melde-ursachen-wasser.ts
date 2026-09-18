/**
 * Wasser — priorisierte Ursachen für HV/Hausmeister (nach Mieter-Antworten).
 * Keine Sofortmaßnahmen, keine Prioritäts-Chips.
 * Entscheidung: hm_geloest | fachfirma.
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";
import { normalizeMeldeWasserProblem } from "@/lib/funnel/melde-dynamic-questions";

export type WasserUrsacheId =
  | "eckventil"
  | "siphon"
  | "flexschlauch"
  | "armatur"
  | "ablauf"
  | "wand_decke"
  | "waschmaschine"
  | "spuelmaschine"
  | "sonstiges";

export type WasserUrsacheOption = {
  id: WasserUrsacheId;
  label: string;
};

export type MeldeUrsachenEntscheidung = "hm_geloest" | "fachfirma";

export type MeldeUrsachenCheckState = {
  bereich: "wasser";
  selectedUrsacheId: WasserUrsacheId | null;
  sonstigesText?: string | null;
  entscheidung: MeldeUrsachenEntscheidung | null;
  material?: string[];
  updatedAt?: string | null;
};

const ALL: Record<WasserUrsacheId, string> = {
  eckventil: "Eckventil / Zulauf undicht",
  siphon: "Siphon undicht oder lose",
  flexschlauch: "Flexschlauch defekt",
  armatur: "Armatur tropft / defekt",
  ablauf: "Ablauf verstopft",
  wand_decke: "Wasser aus Wand oder Decke",
  waschmaschine: "Waschmaschine",
  spuelmaschine: "Spülmaschine",
  sonstiges: "Sonstiges",
};

function ans(a: MeldeAnswers, id: string): string {
  const v = a[id];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

function normalizeProblem(raw: string): string {
  return normalizeMeldeWasserProblem(raw);
}

function orderIds(ids: WasserUrsacheId[]): WasserUrsacheOption[] {
  return ids.map((id) => ({ id, label: ALL[id] }));
}

/**
 * Dynamische Ursachen-Liste — wahrscheinlichste zuerst.
 */
export function wasserUrsachenForAnswers(
  answers: MeldeAnswers | undefined
): WasserUrsacheOption[] {
  const a = answers ?? {};
  const problem = normalizeProblem(ans(a, "melde_problem"));
  const ort = ans(a, "melde_ort");
  const laeuft = ans(a, "melde_laeuft_noch");

  const withKueche = (base: WasserUrsacheId[]): WasserUrsacheId[] => {
    if (ort !== "kueche") return [...base, "sonstiges"];
    const out = [...base];
    if (!out.includes("waschmaschine")) out.push("waschmaschine");
    if (!out.includes("spuelmaschine")) out.push("spuelmaschine");
    out.push("sonstiges");
    return out;
  };

  switch (problem) {
    case "wasser_austritt":
      if (ort === "bad") {
        return orderIds(["eckventil", "siphon", "armatur", "flexschlauch", "sonstiges"]);
      }
      if (ort === "wc") {
        return orderIds(["eckventil", "ablauf", "sonstiges"]);
      }
      if (ort === "keller") {
        return orderIds(["wand_decke", "eckventil", "sonstiges"]);
      }
      if (laeuft === "ja" || laeuft === "weiss_nicht") {
        return orderIds(
          withKueche(["eckventil", "flexschlauch", "siphon", "armatur", "wand_decke"])
        );
      }
      return orderIds(
        withKueche(["eckventil", "siphon", "flexschlauch", "armatur"])
      );

    case "verstopfung":
      if (ort === "kueche") {
        return orderIds([
          "ablauf",
          "siphon",
          "waschmaschine",
          "spuelmaschine",
          "sonstiges",
        ]);
      }
      if (ort === "wc") return orderIds(["ablauf", "eckventil", "sonstiges"]);
      return orderIds(["ablauf", "siphon", "sonstiges"]);

    case "von_decke_wand":
    case "feucht_ohne_lauf":
      return orderIds(["wand_decke", "sonstiges"]);

    default:
      if (ort === "kueche") {
        return orderIds(
          withKueche(["eckventil", "siphon", "flexschlauch", "armatur", "ablauf"])
        );
      }
      if (ort === "wc") return orderIds(["ablauf", "eckventil", "sonstiges"]);
      if (ort === "keller") return orderIds(["wand_decke", "sonstiges"]);
      return orderIds([
        "eckventil",
        "siphon",
        "flexschlauch",
        "armatur",
        "ablauf",
        "wand_decke",
        "sonstiges",
      ]);
  }
}

export function wasserUrsacheLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return ALL[id as WasserUrsacheId] ?? id;
}

export const WASSER_MATERIAL_OPTIONS = [
  { value: "siphon", label: "Siphon" },
  { value: "flexschlauch", label: "Flexschlauch" },
  { value: "dichtung", label: "Dichtung" },
  { value: "eckventil", label: "Eckventil" },
  { value: "silikon", label: "Silikon" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

/** Kurztext Schaden aus Mieter-Antworten. */
export function wasserSchadenKurz(answers: MeldeAnswers | undefined): string {
  const a = answers ?? {};
  const problem = normalizeProblem(ans(a, "melde_problem"));
  const ort = ans(a, "melde_ort");
  const problemLabel =
    {
      wasser_austritt: "Wasser tritt aus",
      von_decke_wand: "Wasser aus Decke oder Wand",
      verstopfung: "Abfluss verstopft",
      feucht_ohne_lauf: "Feuchtigkeit ohne laufendes Wasser",
      tropft: "Wasser tropft",
      laeuft: "Wasser läuft",
      wc_verstopft: "WC verstopft",
      waschbecken_verstopft: "Waschbecken verstopft",
      von_decke: "Wasser kommt von der Decke",
      feuchte_wand: "Feuchte Wand",
      ueberschwemmt: "Überschwemmter Bereich",
      sonstiges: "Wasserschaden",
    }[problem] ?? "Wasserschaden";
  const ortLabel =
    {
      kueche: "Küche",
      bad: "Bad",
      wc: "WC",
      keller: "Keller",
      balkon: "Balkon",
      garage: "Garage",
      flur: "Flur",
      sonstiges: null,
    }[ort] ?? null;
  if (ortLabel) {
    const im = ["Bad", "WC", "Keller", "Flur"].includes(ortLabel);
    const inDer = ortLabel === "Küche" || ortLabel === "Garage";
    const am = ortLabel === "Balkon";
    if (im) return `${problemLabel} im ${ortLabel}`;
    if (inDer) return `${problemLabel} in der ${ortLabel}`;
    if (am) return `${problemLabel} am ${ortLabel}`;
    return `${problemLabel} — ${ortLabel}`;
  }
  return problemLabel;
}

const WASSER_PROBLEM_IDS = new Set([
  "wasser_austritt",
  "von_decke_wand",
  "verstopfung",
  "feucht_ohne_lauf",
  "tropft",
  "laeuft",
  "laeuft_stark",
  "wc_verstopft",
  "waschbecken_verstopft",
  "von_decke",
  "von_oben",
  "feuchte_wand",
  "ueberschwemmt",
  "sonstiges",
]);

/** True wenn Wasser-Meldung (Antworten, Bereich oder gespeicherter Check). */
export function isWasserMeldeContext(opts: {
  answers?: MeldeAnswers | null;
  bereichLabel?: string | null;
  bereiche?: string[] | null;
  ursachen?: MeldeUrsachenCheckState | null;
}): boolean {
  if (opts.ursachen?.bereich === "wasser") return true;
  const problem = normalizeProblem(ans(opts.answers ?? {}, "melde_problem"));
  if (problem && WASSER_PROBLEM_IDS.has(problem)) return true;
  const hay = [
    ...(opts.bereiche ?? []),
    opts.bereichLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return (
    hay.includes("wasser") ||
    hay.includes("sanitär") ||
    hay.includes("sanitaer") ||
    hay.includes("rohr")
  );
}

export function parseMeldeUrsachenCheck(
  funnelDaten: unknown
): MeldeUrsachenCheckState | null {
  if (!funnelDaten || typeof funnelDaten !== "object") return null;
  const raw = (funnelDaten as Record<string, unknown>).ursachen_check;
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  if (u.bereich !== "wasser") return null;
  const entscheidung =
    u.entscheidung === "hm_geloest" || u.entscheidung === "fachfirma"
      ? u.entscheidung
      : null;
  return {
    bereich: "wasser",
    selectedUrsacheId: (u.selectedUrsacheId as WasserUrsacheId) ?? null,
    sonstigesText: (u.sonstigesText as string) ?? null,
    entscheidung,
    material: Array.isArray(u.material)
      ? u.material.map(String)
      : undefined,
    updatedAt: (u.updatedAt as string) ?? null,
  };
}
