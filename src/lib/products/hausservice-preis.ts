import { PREISE } from "@/lib/funnel/price-calc";
import type { HausserviceStufe } from "./types";

export type HausservicePreisInput = {
  wohnflaeche: number;
  gartenQm: number;
};

const WF_REF = 100;
const GARTEN_REF = 80;
const BESUCHE_PRO_MONAT = 2;

function round10(n: number): number {
  return Math.round(n / 10) * 10;
}

function scaleBand(min: number, max: number, value: number, ref: number) {
  const f = Math.max(0.75, Math.min(1.75, value / ref));
  return { min: round10(min * f), max: round10(max * f) };
}

function gartenBesuchBand(gartenQm: number): { min: number; max: number } {
  const tier =
    gartenQm < 100
      ? PREISE.garten.pflege_klein
      : gartenQm < 300
        ? PREISE.garten.pflege_mittel
        : PREISE.garten.pflege_gross;
  return { min: tier.min, max: tier.max };
}

/** Monatspreis Hausbetreuung — skaliert mit Wohnfläche & Gartenfläche. */
export function computeHausserviceMonatPreis(
  stufe: HausserviceStufe,
  input: HausservicePreisInput
): { min: number; max: number } {
  const wf = Math.max(40, input.wohnflaeche || WF_REF);
  const garten = Math.max(0, input.gartenQm || 0);

  const hm = scaleBand(
    PREISE.hausmeister.monatlich.min,
    PREISE.hausmeister.monatlich.max,
    wf,
    WF_REF
  );

  if (stufe === "basis") {
    return hm;
  }

  const reinigungMin = PREISE.reinigung.regelmaessig.min * wf;
  const reinigungMax = PREISE.reinigung.regelmaessig.max * wf;
  const gartenBesuch = gartenBesuchBand(garten || GARTEN_REF);
  const gartenMonat = {
    min: round10(gartenBesuch.min * BESUCHE_PRO_MONAT),
    max: round10(gartenBesuch.max * BESUCHE_PRO_MONAT),
  };

  const komfort = {
    min: hm.min + round10(reinigungMin) + (stufe === "komfort" || stufe === "premium" ? gartenMonat.min : 0),
    max: hm.max + round10(reinigungMax) + (stufe === "komfort" || stufe === "premium" ? gartenMonat.max : 0),
  };

  if (stufe === "komfort") {
    return komfort;
  }

  const winterMonat = {
    min: round10(PREISE.winterdienst.saison.min / 6),
    max: round10(PREISE.winterdienst.saison.max / 6),
  };
  const reparaturPuffer = { min: 60, max: 120 };

  return {
    min: komfort.min + winterMonat.min + reparaturPuffer.min,
    max: komfort.max + winterMonat.max + reparaturPuffer.max,
  };
}

export const HAUSSERVICE_DEFAULT_INPUT: HausservicePreisInput = {
  wohnflaeche: 100,
  gartenQm: 80,
};
