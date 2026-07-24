import { calculatePrice } from "@/lib/funnel/price-calc";
import type { FunnelState } from "@/lib/funnel/types";
import {
  computeHausserviceMonatPreis,
  HAUSSERVICE_DEFAULT_INPUT,
} from "./hausservice-preis";
import { PRODUKTE_BY_FAMILIE, getProdukt } from "./katalog";
import {
  produktToFunnelState,
  type ProduktFunnelOverrides,
} from "./produkt-to-funnel";
import type { HausserviceStufe } from "./types";

export type ProduktPreisResult = {
  min: number;
  max: number;
  mitte: number;
  breakdown: FunnelState["breakdown"];
  state: FunnelState;
};

export function produktPreis(
  slug: string,
  overrides: ProduktFunnelOverrides = {}
): ProduktPreisResult | null {
  const produkt = getProdukt(slug);
  const katalogOverrides: ProduktFunnelOverrides = { ...overrides };
  delete katalogOverrides.plz;

  if (produkt?.familie === "hausservice" && produkt.stufe) {
    const state = produktToFunnelState(slug, katalogOverrides);
    if (!state) return null;
    const input = {
      wohnflaeche:
        katalogOverrides.wohnflaeche ??
        produkt.groesseQm ??
        HAUSSERVICE_DEFAULT_INPUT.wohnflaeche,
      gartenQm:
        katalogOverrides.gartenQm ?? HAUSSERVICE_DEFAULT_INPUT.gartenQm,
    };
    const band = computeHausserviceMonatPreis(
      produkt.stufe as HausserviceStufe,
      input
    );
    return {
      min: band.min,
      max: band.max,
      mitte: Math.round((band.min + band.max) / 2),
      breakdown: [],
      state: {
        ...state,
        priceMin: band.min,
        priceMax: band.max,
        breakdown: [],
      },
    };
  }

  const state = produktToFunnelState(slug, katalogOverrides);
  if (!state) return null;
  const result = calculatePrice(state, { preview: true });
  return {
    min: result.min,
    max: result.max,
    mitte: result.mitte,
    breakdown: result.breakdown,
    state: {
      ...state,
      priceMin: result.min,
      priceMax: result.max,
      breakdown: result.breakdown,
    },
  };
}

/** Niedrigster „ab“-Preis einer Familie (ohne PLZ). */
export function produktFamilieAbPreis(
  familie: "bad" | "fix" | "garten" | "hausservice"
): number | null {
  const slugs = getProduktSlugsForFamilie(familie);
  let min: number | null = null;
  for (const slug of slugs) {
    const p = produktPreis(slug);
    if (!p || p.min <= 0) continue;
    min = min == null ? p.min : Math.min(min, p.min);
  }
  return min;
}

function getProduktSlugsForFamilie(
  familie: "bad" | "fix" | "garten" | "hausservice"
): string[] {
  return PRODUKTE_BY_FAMILIE[familie].map((p) => p.slug);
}

export function formatProduktPreisRange(min: number, max: number): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("de-DE", {
      maximumFractionDigits: 0,
    }).format(Math.round(n));
  if (min > 0 && max > 0 && min !== max) {
    return `${fmt(min)} – ${fmt(max)} €`;
  }
  if (max > 0) return `ca. ${fmt(max)} €`;
  if (min > 0) return `ab ${fmt(min)} €`;
  return "Preis auf Anfrage";
}

export function formatProduktAbPreis(min: number): string {
  const fmt = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0,
  }).format(Math.round(min));
  return `ab ${fmt} €`;
}

/** Garten-Abo: 2 Besuche pro Monat (Apr–Okt) — Anzeige im Katalog. */
export const GARTEN_BESUCHE_PRO_MONAT = 2;

export function formatGartenMonatPreis(besuchMin: number, besuchMax: number): string {
  const round10 = (n: number) => Math.round(n / 10) * 10;
  const min = round10(besuchMin * GARTEN_BESUCHE_PRO_MONAT);
  const max = round10(besuchMax * GARTEN_BESUCHE_PRO_MONAT);
  return `${formatProduktPreisRange(min, max)} / Monat`;
}
