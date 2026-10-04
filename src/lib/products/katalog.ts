import { BAD_PRODUKTE } from "./katalog-bad";
import { FIX_PRODUKTE } from "./katalog-fix";
import {
  GARTEN_PRODUKTE
} from "./katalog-garten";
import {
  HAUSSERVICE_PRODUKTE
} from "./katalog-hausservice";
import type { Produkt } from "./types";

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

export function getProdukt(slug: string | null | undefined): Produkt | null {
  if (!slug?.trim()) return null;
  return PRODUKT_BY_SLUG[slug.trim()] ?? null;
}
