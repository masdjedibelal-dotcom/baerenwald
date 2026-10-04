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

export type MeldeUrsachenSchimmelState = {
  bereich: "schimmel";
  selectedUrsacheId: SchimmelUrsacheId | null;
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
      wohnraum: "Wohn- / Schlafzimmer",
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

  let core = problemLabel;
  if (ortLabel) {
    const im = [
      "Bad",
      "WC",
      "Keller",
      "Treppenhaus",
      "Schlafzimmer",
      "Wohnzimmer",
      "Wohn- / Schlafzimmer",
    ].includes(ortLabel);
    const inDer = ortLabel === "Küche" || ortLabel === "Garage";
    if (im) core = `${problemLabel} im ${ortLabel}`;
    else if (inDer) core = `${problemLabel} in der ${ortLabel}`;
    else core = `${problemLabel} — ${ortLabel}`;
  }
  if (groesseLabel) core = `${core} (${groesseLabel})`;
  return core;
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
