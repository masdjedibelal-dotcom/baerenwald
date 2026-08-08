/**
 * Schimmel / Fassade / Graffiti — mögliche Ursachen (eine Auswahl).
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";

export type SchimmelUrsacheId =
  | "schimmel_sichtbar"
  | "fenster_kondens"
  | "undicht_moeglich"
  | "putz_locker"
  | "riss_putz"
  | "farbe_blaettert"
  | "graffiti"
  | "sonstiges";

export type SchimmelUrsacheOption = {
  id: SchimmelUrsacheId;
  label: string;
};

export type MeldeUrsachenSchimmelState = {
  bereich: "schimmel";
  selectedUrsacheId: SchimmelUrsacheId | null;
  sonstigesText?: string | null;
  entscheidung: "hm_geloest" | "fachfirma" | null;
  material?: string[];
  updatedAt?: string | null;
};

const ALL: Record<SchimmelUrsacheId, string> = {
  schimmel_sichtbar: "Feuchtigkeit / Schimmel sichtbar",
  fenster_kondens: "Fensteranschluss / Kondens",
  undicht_moeglich: "Undichtigkeit möglich (Leitung / Dach)",
  putz_locker: "Putz locker / Abplatzung",
  riss_putz: "Riss im Putz",
  farbe_blaettert: "Farbe blättert",
  graffiti: "Graffiti / Schmiererei",
  sonstiges: "Sonstiges",
};

function ans(a: MeldeAnswers, id: string): string {
  const v = a[id];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

function normalizeProblem(raw: string): string {
  if (
    raw === "wand_ecke" ||
    raw === "bad" ||
    raw === "grossflaechig" ||
    raw === "feuchte_wand"
  ) {
    return "schimmel_feucht";
  }
  return raw;
}

function orderIds(ids: SchimmelUrsacheId[]): SchimmelUrsacheOption[] {
  const uniq = ids.filter((id, i) => ids.indexOf(id) === i);
  if (!uniq.includes("sonstiges")) uniq.push("sonstiges");
  return uniq.map((id) => ({ id, label: ALL[id] }));
}

export function schimmelUrsachenForAnswers(
  answers: MeldeAnswers | undefined
): SchimmelUrsacheOption[] {
  const problem = normalizeProblem(ans(answers ?? {}, "melde_problem"));

  switch (problem) {
    case "schimmel_feucht":
      return orderIds([
        "schimmel_sichtbar",
        "fenster_kondens",
        "undicht_moeglich",
        "sonstiges",
      ]);
    case "fassade":
      return orderIds([
        "putz_locker",
        "riss_putz",
        "farbe_blaettert",
        "sonstiges",
      ]);
    case "graffiti":
      return orderIds(["graffiti", "sonstiges"]);
    default:
      return orderIds([
        "schimmel_sichtbar",
        "putz_locker",
        "graffiti",
        "sonstiges",
      ]);
  }
}

export function schimmelUrsacheLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return ALL[id as SchimmelUrsacheId] ?? id;
}

export const SCHIMMEL_MATERIAL_OPTIONS = [
  { value: "gereinigt", label: "Gereinigt" },
  { value: "markiert", label: "Markiert / dokumentiert" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

export function schimmelSchadenKurz(answers: MeldeAnswers | undefined): string {
  const a = answers ?? {};
  const problem = normalizeProblem(ans(a, "melde_problem"));
  const ort =
    ans(a, "melde_ort") ||
    ans(a, "melde_ort_fassade") ||
    ans(a, "melde_ort_graffiti");
  const groesse = ans(a, "melde_groesse");

  const problemLabel =
    {
      schimmel_feucht: "Schimmel oder feuchte Stellen",
      fassade: "Fassade: Putz, Risse oder Farbe",
      graffiti: "Graffiti / Schmiererei",
      sonstiges: "Schimmel / Fassade",
    }[problem] ?? "Schimmel / Fassade";

  const ortLabel =
    {
      bad: "Bad",
      kueche: "Küche",
      schlafzimmer: "Schlafzimmer",
      wohnzimmer: "Wohnzimmer",
      keller: "Keller",
      treppenhaus: "Treppenhaus",
      aussenfassade: "Außenfassade",
      eingang: "Eingang / Hof",
      garage: "Garage",
      sonstiges: null,
    }[ort] ?? null;

  const groesseLabel =
    {
      klein: "klein",
      mittel: "mittel",
      gross: "groß",
    }[groesse] ?? null;

  const parts = [problemLabel];
  if (ortLabel) parts.push(ortLabel);
  if (groesseLabel) parts.push(groesseLabel);
  return parts.join(" · ");
}

const SCHIMMEL_PROBLEM_IDS = new Set([
  "schimmel_feucht",
  "fassade",
  "graffiti",
  "wand_ecke",
  "bad",
  "grossflaechig",
  "feuchte_wand",
]);

export function isSchimmelMeldeContext(opts: {
  answers?: MeldeAnswers | null;
  bereichLabel?: string | null;
  bereiche?: string[] | null;
  ursachenBereich?: string | null;
}): boolean {
  if (opts.ursachenBereich === "schimmel") return true;
  const raw = ans(opts.answers ?? {}, "melde_problem");
  if (raw && SCHIMMEL_PROBLEM_IDS.has(raw)) return true;
  const hay = [
    ...(opts.bereiche ?? []),
    opts.bereichLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return (
    hay.includes("schimmel") ||
    hay.includes("fassade") ||
    hay.includes("graffiti") ||
    hay.includes("feucht")
  );
}
