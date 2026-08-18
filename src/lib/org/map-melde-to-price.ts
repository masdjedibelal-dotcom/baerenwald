import { calculatePrice } from "@/lib/funnel/price-calc";
import type { FunnelState, FachdetailsState } from "@/lib/funnel/types";
import {
  meldeKategorieToZeitraum,
  meldeKategorieToSituation,
} from "@/lib/org/melde-kategorien";
import {
  isMeldeBereichId,
  meldeBereichToFunnelBereiche,
  type MeldeBereichId,
} from "@/lib/org/melde-bereiche";
import type { MeldeKategorie } from "@/lib/org/types";

export type MeldePriceInput = {
  kategorie: MeldeKategorie;
  bereichId: MeldeBereichId;
  plz: string;
  fachdetailAnswers?: Record<string, string | string[] | undefined>;
  dringlichkeit?: string | null;
};

export type MeldePriceResult = {
  preis_min: number | null;
  preis_max: number | null;
  preis_unsicher: boolean;
};

/** Entfernt `undefined`-Einträge für API-/Persist-Payloads. */
export function compactFachdetailAnswers(
  answers: Record<string, string | string[] | undefined> | undefined
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(answers ?? {})) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Grobe Orientierungsbänder € netto (München), wenn Detail-Calc ausfällt. */
const MELDE_PRICE_BANDS: Record<
  MeldeBereichId,
  { min: number; max: number }
> = {
  wasser: { min: 220, max: 780 },
  heizung: { min: 250, max: 900 },
  strom: { min: 180, max: 650 },
  fenster_tuer: { min: 160, max: 520 },
  dach: { min: 350, max: 1400 },
  schimmel: { min: 280, max: 1100 },
  baum_notfall: { min: 400, max: 1600 },
  sonstiges: { min: 150, max: 600 },
};

function ansJa(
  answers: Record<string, string | string[] | undefined> | undefined,
  id: string
): boolean {
  const v = answers?.[id];
  const s = Array.isArray(v) ? v[0] : v;
  return String(s ?? "").toLowerCase() === "ja";
}

function ansVal(
  answers: Record<string, string | string[] | undefined> | undefined,
  id: string
): string {
  const v = answers?.[id];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

function buildFachdetails(
  bereichId: MeldeBereichId,
  answers: Record<string, string | string[] | undefined> | undefined
): FachdetailsState {
  const fd: FachdetailsState = {
    fachdetailAnswers: answers ?? {},
  };
  const a = answers ?? {};
  const problem = ansVal(a, "melde_problem");

  // Legacy Website-Keys (falls noch gesetzt)
  if (bereichId === "heizung" && typeof a.heizung_kaputt_q1 === "string") {
    fd.heizung = { typ: a.heizung_kaputt_q1 };
  }
  if (bereichId === "strom" && typeof a.elektro_kaputt_q1 === "string") {
    fd.elektro = { problem: a.elektro_kaputt_q1 };
  }
  if (bereichId === "wasser" && typeof a.sanitaer_kaputt_wasser_q1 === "string") {
    fd.sanitaer = { badWas: a.sanitaer_kaputt_wasser_q1 };
  }
  if (bereichId === "fenster_tuer" && typeof a.fenster_defekt_q1 === "string") {
    fd.fenster = { defekt: a.fenster_defekt_q1 };
  }
  if (bereichId === "dach" && typeof a.dach_kaputt_q1 === "string") {
    fd.dach = { vorhaben: a.dach_kaputt_q1 };
  }

  // Dynamische Melde-Probleme → Legacy-Felder für price-calc
  if (bereichId === "wasser") {
    if (problem === "tropft" || problem === "laeuft_stark") {
      fd.sanitaer = { ...(fd.sanitaer ?? {}), badWas: "leck_rohr" };
    } else if (problem === "wc_verstopft") {
      fd.sanitaer = { ...(fd.sanitaer ?? {}), badWas: "verstopfung" };
    } else if (problem === "von_oben" || ansJa(a, "melde_laeuft_noch")) {
      fd.sanitaer = { ...(fd.sanitaer ?? {}), badWas: "leck_rohr" };
    }
  }
  if (bereichId === "heizung") {
    if (
      problem === "nicht_warm" ||
      problem === "kalt" ||
      ansVal(a, "melde_heizung_kalt") === "ja" ||
      ansJa(a, "melde_wohnung_kalt")
    ) {
      fd.heizung = { ...(fd.heizung ?? {}), typ: "heizkoerper_kalt" };
    } else if (problem === "kein_ww" || ansVal(a, "melde_warmwasser") === "nein") {
      fd.heizung = { ...(fd.heizung ?? {}), typ: "kein_warmwasser" };
    } else if (problem === "tropft_hk") {
      fd.heizung = { ...(fd.heizung ?? {}), typ: "druckverlust_wasser" };
    } else if (problem === "geraeusche") {
      fd.heizung = { ...(fd.heizung ?? {}), typ: "heizkoerper_kalt" };
    }
  }
  if (bereichId === "strom") {
    if (
      problem === "kein_strom" ||
      problem === "fi_sicherung" ||
      ansVal(a, "melde_sicherung_raus") === "ja" ||
      ansJa(a, "melde_fi")
    ) {
      fd.elektro = { ...(fd.elektro ?? {}), problem: "strom_weg" };
    } else if (
      problem === "steckdose" ||
      problem === "licht" ||
      problem === "schalter"
    ) {
      fd.elektro = { ...(fd.elektro ?? {}), problem: "steckdose_defekt" };
    } else if (problem === "garagentor") {
      fd.elektro = { ...(fd.elektro ?? {}), problem: "strom_weg" };
    } else if (problem === "klingel") {
      fd.elektro = { ...(fd.elektro ?? {}), problem: "steckdose_defekt" };
    }
  }
  if (bereichId === "dach") {
    if (
      problem === "regenrinne_ueber" ||
      problem === "wasser_fassade" ||
      problem === "rinne" ||
      problem === "fallrohr" ||
      problem === "dach_undicht" ||
      ansJa(a, "melde_wasser_ein")
    ) {
      fd.dach = { ...(fd.dach ?? {}), vorhaben: "undicht" };
    } else if (problem === "ziegel_boden" || problem === "ziegel") {
      fd.dach = { ...(fd.dach ?? {}), vorhaben: "ziegel" };
    }
  }
  if (bereichId === "fenster_tuer") {
    if (problem === "scheibe_kaputt" || problem === "glas") {
      fd.fenster = { ...(fd.fenster ?? {}), defekt: "glas" };
    } else if (
      problem === "tuer_problem" ||
      problem === "schloss" ||
      ansVal(a, "melde_tuer_detail") === "schluessel" ||
      ansVal(a, "melde_tuer_detail") === "absperren"
    ) {
      fd.fenster = { ...(fd.fenster ?? {}), defekt: "schloss" };
    } else if (
      problem === "fenster_geht_nicht" ||
      problem === "fenster_undicht" ||
      problem === "dichtung"
    ) {
      fd.fenster = { ...(fd.fenster ?? {}), defekt: "dichtung" };
    } else if (
      problem === "fenster_klemmt" ||
      problem === "tuer_klemmt" ||
      ansVal(a, "melde_tuer_detail") === "schließt"
    ) {
      fd.fenster = { ...(fd.fenster ?? {}), defekt: "mechanik" };
    }
  }

  return fd;
}

export function buildMeldeFunnelState(input: MeldePriceInput): FunnelState {
  const bereiche = meldeBereichToFunnelBereiche(input.bereichId);
  let zeitraum: FunnelState["zeitraum"] = meldeKategorieToZeitraum(
    input.kategorie
  ) as FunnelState["zeitraum"];
  if (input.kategorie === "notfall") {
    zeitraum = "sofort";
  } else if (input.dringlichkeit) {
    zeitraum = input.dringlichkeit as FunnelState["zeitraum"];
  }

  return {
    situation: meldeKategorieToSituation(input.kategorie),
    bereiche,
    zeitraum,
    plz: input.plz || "80331",
    groesse: 80,
    umfang: null,
    fachdetails: buildFachdetails(input.bereichId, input.fachdetailAnswers),
  } as FunnelState;
}

function bandPrice(input: MeldePriceInput): MeldePriceResult {
  const band = MELDE_PRICE_BANDS[input.bereichId];
  let min = band.min;
  let max = band.max;
  const a = input.fachdetailAnswers;
  const problem = ansVal(a, "melde_problem");
  const betrifft = ansVal(a, "melde_betrifft");
  const seit = ansVal(a, "melde_seit_wann");

  // Umfang / mehrere Wohnungen
  if (betrifft === "mehrere" || betrifft === "gemeinschaft" || betrifft === "tiefgarage") {
    min = Math.round(min * 1.2);
    max = Math.round(max * 1.35);
  }
  // Akute Symptome
  if (
    ansJa(a, "melde_laeuft_noch") ||
    ansJa(a, "melde_wasser_ein") ||
    ansJa(a, "melde_fi") ||
    ansVal(a, "melde_abschliessbar") === "nein" ||
    problem === "kein_strom" ||
    problem === "laeuft" ||
    problem === "laeuft_stark" ||
    problem === "ueberschwemmt"
  ) {
    min = Math.round(min * 1.15);
    max = Math.round(max * 1.25);
  }
  if (seit === "gerade_eben" || seit === "heute") {
    min = Math.round(min * 1.05);
    max = Math.round(max * 1.1);
  }
  // Kleine Einzeldefekte: Band etwas runter
  if (
    problem === "steckdose" ||
    problem === "licht" ||
    problem === "schalter" ||
    problem === "klingel" ||
    problem === "dichtung" ||
    problem === "tropft"
  ) {
    min = Math.round(min * 0.75);
    max = Math.round(max * 0.85);
  }
  if (input.kategorie === "notfall") {
    min = Math.round(min * 1.2);
    max = Math.round(max * 1.35);
  }
  return { preis_min: min, preis_max: max, preis_unsicher: false };
}

/** Serverseitige Preisspanne für HV-Meldungen. */
export function mapMeldeToPrice(input: MeldePriceInput): MeldePriceResult {
  if (input.bereichId === "sonstiges" || input.kategorie === "sonstiges") {
    return { preis_min: null, preis_max: null, preis_unsicher: true };
  }
  if (!isMeldeBereichId(input.bereichId)) {
    return { preis_min: null, preis_max: null, preis_unsicher: true };
  }

  const state = buildMeldeFunnelState(input);
  try {
    const result = calculatePrice(state);
    if (
      result.resultModus !== "zu_komplex" &&
      !(result.min <= 0 && result.max <= 0)
    ) {
      return {
        preis_min: Math.round(result.min),
        preis_max: Math.round(result.max),
        preis_unsicher: Boolean(result.istFallback),
      };
    }
  } catch {
    /* Band-Fallback */
  }

  return bandPrice(input);
}
