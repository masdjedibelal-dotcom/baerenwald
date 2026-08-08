/**
 * Müll / Treppenhaus / Wespen — mögliche Ursachen (eine Auswahl).
 * Melde-Bereich: sonstiges.
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";

export type SonstigesUrsacheId =
  | "tonnen_voll"
  | "muell_daneben"
  | "bereich_schmutzig"
  | "treppenhaus_schmutzig"
  | "fluessigkeit"
  | "wespennest"
  | "sonstiges";

export type SonstigesUrsacheOption = {
  id: SonstigesUrsacheId;
  label: string;
};

export type MeldeUrsachenSonstigesState = {
  bereich: "sonstiges";
  selectedUrsacheId: SonstigesUrsacheId | null;
  sonstigesText?: string | null;
  entscheidung: "hm_geloest" | "fachfirma" | null;
  material?: string[];
  updatedAt?: string | null;
};

const ALL: Record<SonstigesUrsacheId, string> = {
  tonnen_voll: "Mülltonnen überfüllt",
  muell_daneben: "Müll / Sperrmüll daneben",
  bereich_schmutzig: "Müllbereich verschmutzt",
  treppenhaus_schmutzig: "Boden / Bereich verschmutzt",
  fluessigkeit: "Flüssigkeit auf dem Boden",
  wespennest: "Wespennest / Insektennest",
  sonstiges: "Sonstiges",
};

function ans(a: MeldeAnswers, id: string): string {
  const v = a[id];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

function normalizeProblem(raw: string): string {
  if (raw === "ungeziefer") return "wespen";
  if (raw === "gemeinschaft") return "treppenhaus_schmutz";
  return raw;
}

function orderIds(ids: SonstigesUrsacheId[]): SonstigesUrsacheOption[] {
  const uniq = ids.filter((id, i) => ids.indexOf(id) === i);
  if (!uniq.includes("sonstiges")) uniq.push("sonstiges");
  return uniq.map((id) => ({ id, label: ALL[id] }));
}

export function sonstigesUrsachenForAnswers(
  answers: MeldeAnswers | undefined
): SonstigesUrsacheOption[] {
  const problem = normalizeProblem(ans(answers ?? {}, "melde_problem"));

  switch (problem) {
    case "muell":
      return orderIds([
        "tonnen_voll",
        "muell_daneben",
        "bereich_schmutzig",
        "sonstiges",
      ]);
    case "treppenhaus_schmutz":
      return orderIds([
        "treppenhaus_schmutzig",
        "fluessigkeit",
        "sonstiges",
      ]);
    case "wespen":
      return orderIds(["wespennest", "sonstiges"]);
    default:
      return orderIds([
        "tonnen_voll",
        "treppenhaus_schmutzig",
        "wespennest",
        "sonstiges",
      ]);
  }
}

export function sonstigesUrsacheLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return ALL[id as SonstigesUrsacheId] ?? id;
}

export const SONSTIGES_MATERIAL_OPTIONS = [
  { value: "gereinigt", label: "Gereinigt" },
  { value: "entsorgt", label: "Entsorgt" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

export function sonstigesSchadenKurz(
  answers: MeldeAnswers | undefined
): string {
  const a = answers ?? {};
  const problem = normalizeProblem(ans(a, "melde_problem"));
  const ort =
    ans(a, "melde_ort") ||
    ans(a, "melde_ort_treppe") ||
    ans(a, "melde_ort_wespen");
  const staerke = ans(a, "melde_staerke");

  const problemLabel =
    {
      muell: "Mülltonnen voll oder Müll daneben",
      treppenhaus_schmutz: "Treppenhaus / Gemeinschaft schmutzig",
      wespen: "Wespennest / Insektennest",
      klingel: "Klingel / Gegensprechanlage",
      sonstiges: "Sonstiges",
    }[problem] ?? "Sonstiges";

  const ortLabel =
    {
      muellraum: "Müllraum",
      muellplatz: "Müllplatz",
      aussen: "Außenanlage",
      treppenhaus: "Treppenhaus",
      eingang: "Eingangsbereich",
      keller: "Keller",
      sonstiges: null,
    }[ort] ?? null;

  const staerkeLabel =
    {
      leicht: "leicht",
      mittel: "mittel",
      stark: "stark",
    }[staerke] ?? null;

  let core = problemLabel;
  if (ortLabel) {
    const im = ["Müllraum", "Müllplatz", "Treppenhaus", "Keller"].includes(ortLabel);
    const am = ortLabel === "Eingangsbereich";
    if (im) core = `${problemLabel} im ${ortLabel}`;
    else if (am) core = `${problemLabel} am Eingang`;
    else core = `${problemLabel} — ${ortLabel}`;
  }
  if (staerkeLabel) core = `${core} (${staerkeLabel})`;
  return core;
}

/** Nur spezifische IDs — nicht generisches „sonstiges“ (Konflikt mit anderen Bereichen). */
const SONSTIGES_PROBLEM_IDS = new Set([
  "muell",
  "treppenhaus_schmutz",
  "wespen",
  "klingel",
  "gemeinschaft",
  "ungeziefer",
]);

export function isSonstigesMeldeContext(opts: {
  answers?: MeldeAnswers | null;
  bereichLabel?: string | null;
  bereiche?: string[] | null;
  ursachenBereich?: string | null;
}): boolean {
  if (opts.ursachenBereich === "sonstiges") return true;
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
    hay.includes("wespe")
  );
}
