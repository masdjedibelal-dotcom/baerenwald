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
  fachdetailAnswers?: Record<string, string | string[]>;
  dringlichkeit?: string | null;
};

export type MeldePriceResult = {
  preis_min: number | null;
  preis_max: number | null;
  preis_unsicher: boolean;
};

function buildFachdetails(
  bereichId: MeldeBereichId,
  answers: Record<string, string | string[]> | undefined
): FachdetailsState {
  const fd: FachdetailsState = {
    fachdetailAnswers: answers ?? {},
  };
  const a = answers ?? {};

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

  return fd;
}

export function buildMeldeFunnelState(input: MeldePriceInput): FunnelState {
  const bereiche = meldeBereichToFunnelBereiche(input.bereichId);
  let zeitraum = meldeKategorieToZeitraum(input.kategorie);
  if (input.kategorie === "notfall") {
    zeitraum = "sofort";
  } else if (input.dringlichkeit) {
    zeitraum = input.dringlichkeit;
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

/** Serverseitige Preisspanne für HV-Meldungen. */
export function mapMeldeToPrice(input: MeldePriceInput): MeldePriceResult {
  if (input.bereichId === "sonstiges" || input.kategorie === "sonstiges") {
    return { preis_min: null, preis_max: null, preis_unsicher: true };
  }
  if (!isMeldeBereichId(input.bereichId)) {
    return { preis_min: null, preis_max: null, preis_unsicher: true };
  }

  const state = buildMeldeFunnelState(input);
  const result = calculatePrice(state);

  if (
    result.resultModus === "zu_komplex" ||
    (result.min <= 0 && result.max <= 0)
  ) {
    return { preis_min: null, preis_max: null, preis_unsicher: true };
  }

  return {
    preis_min: Math.round(result.min),
    preis_max: Math.round(result.max),
    preis_unsicher: Boolean(result.istFallback),
  };
}
