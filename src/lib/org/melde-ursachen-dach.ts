/**
 * Dach / Regenrinne — mögliche Ursachen (eine Auswahl).
 * Fallrohr nur als HM-Ursache, nicht als Mieter-Begriff.
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";

export type DachUrsacheId =
  | "rinne_verstopft"
  | "rinne_halterung"
  | "fallrohr"
  | "ziegel_lose"
  | "sonstiges";

export type DachUrsacheOption = {
  id: DachUrsacheId;
  label: string;
};

export type MeldeUrsachenDachState = {
  bereich: "dach";
  selectedUrsacheId: DachUrsacheId | null;
  sonstigesText?: string | null;
  entscheidung: "hm_geloest" | "fachfirma" | null;
  material?: string[];
  updatedAt?: string | null;
};

const ALL: Record<DachUrsacheId, string> = {
  rinne_verstopft: "Dachrinne mit Laub / Schmutz verstopft",
  rinne_halterung: "Dachrinne beschädigt oder Halterung locker",
  fallrohr: "Fallrohr verstopft oder beschädigt",
  ziegel_lose: "Dachziegel lose oder verschoben",
  sonstiges: "Sonstiges",
};

function ans(a: MeldeAnswers, id: string): string {
  const v = a[id];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

function normalizeProblem(raw: string): string {
  if (raw === "rinne" || raw === "dachrinne") return "regenrinne_ueber";
  if (raw === "fallrohr") return "wasser_fassade";
  if (raw === "ziegel") return "ziegel_boden";
  if (raw === "dach_undicht") return "sonstiges";
  return raw;
}

function orderIds(ids: DachUrsacheId[]): DachUrsacheOption[] {
  const uniq = ids.filter((id, i) => ids.indexOf(id) === i);
  if (!uniq.includes("sonstiges")) uniq.push("sonstiges");
  return uniq.map((id) => ({ id, label: ALL[id] }));
}

export function dachUrsachenForAnswers(
  answers: MeldeAnswers | undefined
): DachUrsacheOption[] {
  const problem = normalizeProblem(ans(answers ?? {}, "melde_problem"));

  switch (problem) {
    case "regenrinne_ueber":
      return orderIds([
        "rinne_verstopft",
        "rinne_halterung",
        "fallrohr",
        "sonstiges",
      ]);
    case "wasser_fassade":
      return orderIds([
        "fallrohr",
        "rinne_verstopft",
        "rinne_halterung",
        "sonstiges",
      ]);
    case "ziegel_boden":
      return orderIds(["ziegel_lose", "sonstiges"]);
    default:
      return orderIds([
        "rinne_verstopft",
        "fallrohr",
        "ziegel_lose",
        "rinne_halterung",
        "sonstiges",
      ]);
  }
}

export function dachUrsacheLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return ALL[id as DachUrsacheId] ?? id;
}

export const DACH_MATERIAL_OPTIONS = [
  { value: "gereinigt", label: "Gereinigt" },
  { value: "freigemacht", label: "Freigemacht" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

export function dachSchadenKurz(answers: MeldeAnswers | undefined): string {
  const a = answers ?? {};
  const problem = normalizeProblem(ans(a, "melde_problem"));
  const ort = ans(a, "melde_ort") || ans(a, "melde_ort_ziegel");

  const problemLabel =
    {
      regenrinne_ueber: "Regenrinne läuft über",
      wasser_fassade: "Wasser kommt falsch an der Fassade runter",
      ziegel_boden: "Dachziegel liegen am Boden oder fehlen",
      sonstiges: "Dach / Regenrinne",
    }[problem] ?? "Dach / Regenrinne";

  const ortLabel =
    {
      fassade: "Fassade",
      eingang: "Eingangsbereich",
      balkon: "Balkon",
      garage: "Garage / Hof",
      gehweg: "Eingang / Gehweg",
      aussen: "Hof / Außenbereich",
      sonstiges: null,
    }[ort] ?? null;

  if (ortLabel) {
    if (ortLabel === "Fassade") return `${problemLabel} an der Fassade`;
    if (ortLabel === "Balkon") return `${problemLabel} am Balkon`;
    if (ortLabel === "Eingangsbereich" || ortLabel === "Eingang / Gehweg") {
      return `${problemLabel} am Eingang`;
    }
    return `${problemLabel} — ${ortLabel}`;
  }
  return problemLabel;
}

const DACH_PROBLEM_IDS = new Set([
  "regenrinne_ueber",
  "wasser_fassade",
  "ziegel_boden",
  "rinne",
  "fallrohr",
  "ziegel",
  "dach_undicht",
]);

export function isDachMeldeContext(opts: {
  answers?: MeldeAnswers | null;
  bereichLabel?: string | null;
  bereiche?: string[] | null;
  ursachenBereich?: string | null;
}): boolean {
  if (opts.ursachenBereich === "dach") return true;
  const raw = ans(opts.answers ?? {}, "melde_problem");
  if (raw && DACH_PROBLEM_IDS.has(raw)) return true;
  const hay = [
    ...(opts.bereiche ?? []),
    opts.bereichLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return (
    hay.includes("dach") ||
    hay.includes("rinne") ||
    hay.includes("fallrohr") ||
    hay.includes("ziegel")
  );
}
