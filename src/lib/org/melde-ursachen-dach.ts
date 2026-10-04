/**
 * Dach / Regenrinne — mögliche Ursachen (eine Auswahl).
 * Fallrohr nur als HM-Ursache, nicht als Mieter-Begriff.
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";
import { normalizeMeldeDachProblem } from "@/lib/funnel/melde-dynamic-questions";

export type DachUrsacheId =
  | "rinne_verstopft"
  | "rinne_halterung"
  | "fallrohr"
  | "ziegel_lose"
  | "sonstiges";

export type MeldeUrsachenDachState = {
  bereich: "dach";
  selectedUrsacheId: DachUrsacheId | null;
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
  return normalizeMeldeDachProblem(raw);
}

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
