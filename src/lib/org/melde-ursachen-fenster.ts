/**
 * Fenster / Tür — mögliche Ursachen (eine Auswahl), priorisiert.
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";

export type FensterUrsacheId =
  | "beschlag_griff"
  | "fluegel_schleift"
  | "dichtung"
  | "glas"
  | "tuer_abgesackt"
  | "schliessblech"
  | "schloss"
  | "schluessel"
  | "schmierung"
  | "sonstiges";

export type FensterUrsacheOption = {
  id: FensterUrsacheId;
  label: string;
};

export type MeldeUrsachenFensterState = {
  bereich: "fenster_tuer";
  selectedUrsacheId: FensterUrsacheId | null;
  sonstigesText?: string | null;
  entscheidung: "hm_geloest" | "fachfirma" | null;
  material?: string[];
  updatedAt?: string | null;
};

const ALL: Record<FensterUrsacheId, string> = {
  beschlag_griff: "Beschlag oder Griff verstellt / locker",
  fluegel_schleift: "Fensterflügel schleift",
  dichtung: "Dichtung undicht oder verschlissen",
  glas: "Glas / Scheibe beschädigt",
  tuer_abgesackt: "Tür abgesackt / Band locker",
  schliessblech: "Schließblech verstellt",
  schloss: "Schloss defekt",
  schluessel: "Schlüssel defekt oder abgebrochen",
  schmierung: "Schmierung fehlt",
  sonstiges: "Sonstiges",
};

function ans(a: MeldeAnswers, id: string): string {
  const v = a[id];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

/** Normalisiert Problem + Tür-Detail zu einem Matching-Key. */
export function fensterMatchKey(answers: MeldeAnswers | undefined): string {
  const a = answers ?? {};
  const problem = ans(a, "melde_problem");
  const detail = ans(a, "melde_tuer_detail");

  if (problem === "fenster_klemmt" || problem === "fenster_undicht") {
    return "fenster_geht_nicht";
  }
  if (problem === "glas" || problem === "scheibe_kaputt") return "scheibe_kaputt";
  if (problem === "dichtung") return "fenster_geht_nicht";
  if (problem === "fenster_geht_nicht") return "fenster_geht_nicht";
  if (problem === "tuer_problem" || problem === "tuer_klemmt" || problem === "schloss") {
    if (detail === "schluessel" || problem === "schloss") return "schluessel";
    if (detail === "absperren") return "absperren";
    if (detail === "schließt" || problem === "tuer_klemmt") return "tuer_schließt";
    if (problem === "tuer_problem" && !detail) return "tuer_schließt";
    return detail || "tuer_schließt";
  }
  return problem || "sonstiges";
}

function orderIds(ids: FensterUrsacheId[]): FensterUrsacheOption[] {
  const uniq = ids.filter((id, i) => ids.indexOf(id) === i);
  if (!uniq.includes("sonstiges")) uniq.push("sonstiges");
  return uniq.map((id) => ({ id, label: ALL[id] }));
}

export function fensterUrsachenForAnswers(
  answers: MeldeAnswers | undefined
): FensterUrsacheOption[] {
  const key = fensterMatchKey(answers);

  switch (key) {
    case "fenster_geht_nicht":
      return orderIds([
        "beschlag_griff",
        "fluegel_schleift",
        "dichtung",
        "sonstiges",
      ]);
    case "scheibe_kaputt":
      return orderIds(["glas", "sonstiges"]);
    case "tuer_schließt":
      return orderIds([
        "tuer_abgesackt",
        "schliessblech",
        "schloss",
        "dichtung",
        "sonstiges",
      ]);
    case "absperren":
      return orderIds(["schloss", "schliessblech", "sonstiges"]);
    case "schluessel":
      return orderIds(["schloss", "schluessel", "schmierung", "sonstiges"]);
    default:
      return orderIds([
        "beschlag_griff",
        "tuer_abgesackt",
        "schloss",
        "glas",
        "sonstiges",
      ]);
  }
}

export function fensterUrsacheLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return ALL[id as FensterUrsacheId] ?? id;
}

export const FENSTER_MATERIAL_OPTIONS = [
  { value: "eingestellt", label: "Eingestellt" },
  { value: "geschmiert", label: "Geschmiert" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

export function fensterSchadenKurz(answers: MeldeAnswers | undefined): string {
  const a = answers ?? {};
  const key = fensterMatchKey(a);
  const ort =
    ans(a, "melde_ort") ||
    ans(a, "melde_ort_tuer") ||
    ans(a, "melde_ort_schluessel");

  const problemLabel =
    {
      fenster_geht_nicht: "Fenster geht nicht richtig",
      scheibe_kaputt: "Fensterscheibe kaputt",
      tuer_schließt: "Tür schließt nicht richtig",
      absperren: "Tür lässt sich nicht absperren",
      schluessel: "Schlüssel steckt fest oder abgebrochen",
      sonstiges: "Fenster / Tür",
    }[key] ?? "Fenster / Tür";

  const ortLabel =
    {
      zimmerfenster: "Fenster im Zimmer",
      balkontuer: "Balkontür",
      kellerfenster: "Kellerfenster",
      wohnungstuer: "Wohnungstür",
      haustuer: "Haustür",
      kellertuer: "Kellertür",
      sonstiges: null,
    }[ort] ?? null;

  if (ortLabel) return `${problemLabel} — ${ortLabel}`;
  return problemLabel;
}

const FENSTER_PROBLEM_IDS = new Set([
  "fenster_geht_nicht",
  "scheibe_kaputt",
  "tuer_problem",
  "fenster_klemmt",
  "fenster_undicht",
  "glas",
  "tuer_klemmt",
  "schloss",
  "dichtung",
]);

export function isFensterMeldeContext(opts: {
  answers?: MeldeAnswers | null;
  bereichLabel?: string | null;
  bereiche?: string[] | null;
  ursachenBereich?: string | null;
}): boolean {
  if (opts.ursachenBereich === "fenster_tuer") return true;
  const problem = ans(opts.answers ?? {}, "melde_problem");
  if (problem && FENSTER_PROBLEM_IDS.has(problem)) return true;
  const hay = [
    ...(opts.bereiche ?? []),
    opts.bereichLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return (
    hay.includes("fenster") ||
    hay.includes("tür") ||
    hay.includes("tuer") ||
    hay.includes("schloss")
  );
}
