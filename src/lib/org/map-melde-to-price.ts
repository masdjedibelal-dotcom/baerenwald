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
import { fachfragenKeyFromMeldeBereich } from "@/lib/portal2/fachfragen";

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

function buildFachdetails(
  bereichId: MeldeBereichId,
  answers: Record<string, string | string[] | undefined> | undefined
): FachdetailsState {
  const fd: FachdetailsState = {
    fachdetailAnswers: answers ?? {},
  };
  const a = answers ?? {};
  const key = fachfragenKeyFromMeldeBereich(bereichId);

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

  // Melde Ja/Nein → grobe Legacy-Felder für price-calc
  if (bereichId === "wasser" && ansJa(a, `ff_${key}_0`)) {
    fd.sanitaer = { ...(fd.sanitaer ?? {}), badWas: "leck_rohr" };
  }
  if (bereichId === "heizung" && ansJa(a, `ff_${key}_0`)) {
    fd.heizung = { ...(fd.heizung ?? {}), typ: "heizkoerper_kalt" };
  }
  if (bereichId === "strom" && ansJa(a, `ff_${key}_0`)) {
    fd.elektro = { ...(fd.elektro ?? {}), problem: "strom_weg" };
  }
  if (bereichId === "dach" && ansJa(a, `ff_${key}_0`)) {
    fd.dach = { ...(fd.dach ?? {}), vorhaben: "undicht" };
  }
  if (bereichId === "fenster_tuer" && ansJa(a, `ff_${key}_2`)) {
    fd.fenster = { ...(fd.fenster ?? {}), defekt: "glas" };
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
  const key = fachfragenKeyFromMeldeBereich(input.bereichId);
  if (ansJa(a, `ff_${key}_1`)) {
    min = Math.round(min * 1.15);
    max = Math.round(max * 1.25);
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
