/**
 * Müll / Treppenhaus / Wespen / Weg außen — mögliche Ursachen (eine Auswahl).
 * Melde-Bereich: sonstiges (inkl. ehem. Baum/Sturm).
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";

export type SonstigesUrsacheId =
  | "tonnen_voll"
  | "muell_daneben"
  | "bereich_schmutzig"
  | "treppenhaus_schmutzig"
  | "fluessigkeit"
  | "wespennest"
  | "ast_blockiert"
  | "hecke_sicht"
  | "platte_locker"
  | "laub_schmutz"
  | "sonstiges";

export type MeldeUrsachenSonstigesState = {
  bereich: "sonstiges";
  selectedUrsacheId: SonstigesUrsacheId | null;
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
  if (raw === "ungeziefer") return "wespen";
  if (raw === "gemeinschaft") return "treppenhaus_schmutz";
  if (
    raw === "ast_baum" ||
    raw === "astbruch" ||
    raw === "weg" ||
    raw === "hecke" ||
    raw === "platten" ||
    raw === "laub"
  ) {
    return "weg_aussen";
  }
  return raw;
}

export function sonstigesSchadenKurz(
  answers: MeldeAnswers | undefined
): string {
  const a = answers ?? {};
  const problem = normalizeProblem(ans(a, "melde_problem"));
  const ort = ans(a, "melde_ort");

  const problemLabel =
    {
      muell: "Mülltonnen voll oder Müll daneben",
      treppenhaus_schmutz: "Treppenhaus / Gemeinschaft schmutzig",
      wespen: "Wespennest / Insektennest",
      weg_aussen: "Ast, Baum oder Weg außen blockiert",
      klingel: "Klingel / Gegensprechanlage",
      sonstiges: "Sonstiges",
    }[problem] ?? "Sonstiges";

  const ortLabel =
    {
      muellplatz: "Müllplatz / Müllraum",
      muellraum: "Müllraum",
      treppenhaus: "Treppenhaus / Eingang",
      aussen: "Hof / Gehweg / Außenanlage",
      keller: "Keller",
      eingang: "Eingangsbereich",
      sonstiges: null,
    }[ort] ?? null;

  if (ortLabel) {
    const im = ["Müllraum", "Keller"].includes(ortLabel) || ortLabel.startsWith("Müllplatz");
    if (im || ortLabel.startsWith("Müll")) return `${problemLabel} — ${ortLabel}`;
    return `${problemLabel} — ${ortLabel}`;
  }
  return problemLabel;
}

/** Spezifische IDs — nicht generisches „sonstiges“ (Konflikt mit anderen Bereichen). */
const SONSTIGES_PROBLEM_IDS = new Set([
  "muell",
  "treppenhaus_schmutz",
  "wespen",
  "weg_aussen",
  "klingel",
  "gemeinschaft",
  "ungeziefer",
  "ast_baum",
  "astbruch",
  "hecke",
  "platten",
  "laub",
  "weg",
]);

export function isSonstigesMeldeContext(opts: {
  answers?: MeldeAnswers | null;
  bereichLabel?: string | null;
  bereiche?: string[] | null;
  ursachenBereich?: string | null;
}): boolean {
  if (opts.ursachenBereich === "sonstiges") return true;
  if (opts.ursachenBereich === "baum_notfall") return true;
  const raw = ans(opts.answers ?? {}, "melde_problem");
  if (raw && SONSTIGES_PROBLEM_IDS.has(raw)) return true;
  const hay = [
    ...(opts.bereiche ?? []),
    opts.bereichLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return (
    hay.includes("sonstig") ||
    hay.includes("müll") ||
    hay.includes("muell") ||
    hay.includes("treppenhaus") ||
    hay.includes("wespe") ||
    hay.includes("baum") ||
    hay.includes("gehweg")
  );
}
