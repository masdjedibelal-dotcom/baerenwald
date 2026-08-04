import { BAD_DEFAULT_PRODUKT_SLUG, BAD_PRODUKTE } from "./katalog-bad";
import { FIX_DEFAULT_PRODUKT_SLUG, FIX_PRODUKTE } from "./katalog-fix";
import {
  GARTEN_DEFAULT_PRODUKT_SLUG,
  GARTEN_PRODUKTE,
} from "./katalog-garten";
import {
  HAUSSERVICE_DEFAULT_PRODUKT_SLUG,
  HAUSSERVICE_PRODUKTE,
} from "./katalog-hausservice";
import type { Produkt, ProduktFamilie } from "./types";

/**
 * Single Source of Truth für buchbare Standardprodukte.
 * Preise kommen ausschließlich aus calculatePrice(produktToFunnelState(slug)).
 */
export const PRODUKT_KATALOG: Produkt[] = [
  ...BAD_PRODUKTE,
  ...FIX_PRODUKTE,
  ...GARTEN_PRODUKTE,
  ...HAUSSERVICE_PRODUKTE,
];

export const PRODUKT_BY_SLUG: Record<string, Produkt> = Object.fromEntries(
  PRODUKT_KATALOG.map((p) => [p.slug, p])
);

export const PRODUKTE_BY_FAMILIE: Record<ProduktFamilie, Produkt[]> = {
  bad: BAD_PRODUKTE,
  fix: FIX_PRODUKTE,
  garten: GARTEN_PRODUKTE,
  hausservice: HAUSSERVICE_PRODUKTE,
};

export const DEFAULT_PRODUKT_BY_FAMILIE: Record<ProduktFamilie, string> = {
  bad: BAD_DEFAULT_PRODUKT_SLUG,
  fix: FIX_DEFAULT_PRODUKT_SLUG,
  garten: GARTEN_DEFAULT_PRODUKT_SLUG,
  hausservice: HAUSSERVICE_DEFAULT_PRODUKT_SLUG,
};

export function getProdukt(slug: string | null | undefined): Produkt | null {
  if (!slug?.trim()) return null;
  return PRODUKT_BY_SLUG[slug.trim()] ?? null;
}

export function getProdukteByFamilie(familie: ProduktFamilie): Produkt[] {
  return PRODUKTE_BY_FAMILIE[familie] ?? [];
}

export function isProduktSlug(slug: string): boolean {
  return slug in PRODUKT_BY_SLUG;
}
