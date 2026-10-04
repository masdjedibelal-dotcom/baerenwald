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

export type MeldeUrsachenBaumState = {
  bereich: "baum_notfall";
  selectedUrsacheId: BaumUrsacheId | null;
  sonstigesText?: string | null;
  entscheidung: "hm_geloest" | "fachfirma" | null;
  material?: string[];
  updatedAt?: string | null;
};

function ans(a: MeldeAnswers, id: string): string {
  const v = a[id];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
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
