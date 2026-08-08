/**
 * Ast / Hecke / Gehweg — mögliche Ursachen (eine Auswahl).
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";

export type BaumUrsacheId =
  | "ast_lose"
  | "ast_blockiert"
  | "hecke_sicht"
  | "platte_locker"
  | "wurzel_platten"
  | "absenkung"
  | "laub_schmutz"
  | "sonstiges";

export type BaumUrsacheOption = {
  id: BaumUrsacheId;
  label: string;
};

export type MeldeUrsachenBaumState = {
  bereich: "baum_notfall";
  selectedUrsacheId: BaumUrsacheId | null;
  sonstigesText?: string | null;
  entscheidung: "hm_geloest" | "fachfirma" | null;
  material?: string[];
  updatedAt?: string | null;
};

const ALL: Record<BaumUrsacheId, string> = {
  ast_lose: "Ast hängt lose",
  ast_blockiert: "Ast / Baum blockiert den Weg",
  hecke_sicht: "Hecke / Sträucher im Weg oder Sicht",
  platte_locker: "Gehwegplatte locker oder gebrochen",
  wurzel_platten: "Wurzel hebt Platten an",
  absenkung: "Absenkung / Stolperkante",
  laub_schmutz: "Laub / Schmutz auf dem Weg",
  sonstiges: "Sonstiges",
};

function ans(a: MeldeAnswers, id: string): string {
  const v = a[id];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

function normalizeProblem(raw: string): string {
  if (raw === "astbruch" || raw === "weg") return "ast_baum";
  return raw;
}

function orderIds(ids: BaumUrsacheId[]): BaumUrsacheOption[] {
  const uniq = ids.filter((id, i) => ids.indexOf(id) === i);
  if (!uniq.includes("sonstiges")) uniq.push("sonstiges");
  return uniq.map((id) => ({ id, label: ALL[id] }));
}

export function baumUrsachenForAnswers(
  answers: MeldeAnswers | undefined
): BaumUrsacheOption[] {
  const problem = normalizeProblem(ans(answers ?? {}, "melde_problem"));

  switch (problem) {
    case "ast_baum":
      return orderIds(["ast_lose", "ast_blockiert", "sonstiges"]);
    case "hecke":
      return orderIds(["hecke_sicht", "sonstiges"]);
    case "platten":
      return orderIds([
        "platte_locker",
        "wurzel_platten",
        "absenkung",
        "sonstiges",
      ]);
    case "laub":
      return orderIds(["laub_schmutz", "sonstiges"]);
    default:
      return orderIds([
        "ast_lose",
        "hecke_sicht",
        "platte_locker",
        "laub_schmutz",
        "sonstiges",
      ]);
  }
}

export function baumUrsacheLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return ALL[id as BaumUrsacheId] ?? id;
}

export const BAUM_MATERIAL_OPTIONS = [
  { value: "freigemacht", label: "Freigemacht" },
  { value: "markiert", label: "Bereich markiert / abgesichert" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

export function baumSchadenKurz(answers: MeldeAnswers | undefined): string {
  const a = answers ?? {};
  const problem = normalizeProblem(ans(a, "melde_problem"));
  const ort =
    ans(a, "melde_ort") ||
    ans(a, "melde_ort_hecke") ||
    ans(a, "melde_ort_platten") ||
    ans(a, "melde_ort_laub");

  const problemLabel =
    {
      ast_baum: "Ast / Baum hängt runter oder blockiert",
      hecke: "Hecke / Sträucher versperren den Weg",
      platten: "Gehwegplatten locker oder kaputt",
      laub: "Weg voller Laub oder Schmutz",
      sonstiges: "Außenanlage / Weg",
    }[problem] ?? "Außenanlage / Weg";

  const ortLabel =
    {
      gehweg: "Gehweg",
      hof: "Hof",
      garten: "Garten",
      parkplatz: "Parkplatz",
      zufahrt: "Zufahrt",
      spielplatz: "Spielplatz",
      sonstiges: null,
    }[ort] ?? null;

  if (ortLabel) return `${problemLabel} · ${ortLabel}`;
  return problemLabel;
}

const BAUM_PROBLEM_IDS = new Set([
  "ast_baum",
  "hecke",
  "platten",
  "laub",
  "astbruch",
  "weg",
]);

export function isBaumMeldeContext(opts: {
  answers?: MeldeAnswers | null;
  bereichLabel?: string | null;
  bereiche?: string[] | null;
  ursachenBereich?: string | null;
}): boolean {
  if (opts.ursachenBereich === "baum_notfall") return true;
  const raw = ans(opts.answers ?? {}, "melde_problem");
  if (raw && BAUM_PROBLEM_IDS.has(raw)) return true;
  const hay = [
    ...(opts.bereiche ?? []),
    opts.bereichLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return (
    hay.includes("baum") ||
    hay.includes("ast") ||
    hay.includes("gehweg") ||
    hay.includes("hecke") ||
    hay.includes("garten")
  );
}
