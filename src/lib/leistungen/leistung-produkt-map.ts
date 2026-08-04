import {
  BAD_DEFAULT_PRODUKT_SLUG,
  BAD_PRODUKTE,
  FIX_DEFAULT_PRODUKT_SLUG,
  FIX_PRODUKTE,
  GARTEN_DEFAULT_PRODUKT_SLUG,
  GARTEN_PRODUKTE,
} from "@/lib/products";
import type { LeistungsProduktLink } from "@/lib/products/types";

/** Leistungs-Basis-Slug → Produkte + Default. */
export const LEISTUNG_PRODUKT_MAP: Record<string, LeistungsProduktLink> = {
  "badezimmer-sanierung": {
    leistungSlug: "badezimmer-sanierung",
    produktSlugs: BAD_PRODUKTE.map((p) => p.slug),
    defaultProduktSlug: BAD_DEFAULT_PRODUKT_SLUG,
  },
  "bad-sanieren": {
    leistungSlug: "badezimmer-sanierung",
    produktSlugs: BAD_PRODUKTE.map((p) => p.slug),
    defaultProduktSlug: BAD_DEFAULT_PRODUKT_SLUG,
  },
  "heizung-sanitaer": {
    leistungSlug: "heizung-sanitaer",
    produktSlugs: FIX_PRODUKTE.filter((p) =>
      p.leistungSlugs.includes("heizung-sanitaer")
    ).map((p) => p.slug),
    defaultProduktSlug: "fix-verstopfung",
  },
  rohrbruch: {
    leistungSlug: "heizung-sanitaer",
    produktSlugs: ["fix-rohrleck", "fix-verstopfung", "fix-armatur"],
    defaultProduktSlug: "fix-rohrleck",
  },
  "heizung-defekt": {
    leistungSlug: "heizung-sanitaer",
    produktSlugs: FIX_PRODUKTE.filter((p) => p.bereiche.includes("heizung")).map(
      (p) => p.slug
    ),
    defaultProduktSlug: "fix-heizung-kalt",
  },
  elektroarbeiten: {
    leistungSlug: "elektroarbeiten",
    produktSlugs: FIX_PRODUKTE.filter((p) =>
      p.leistungSlugs.includes("elektroarbeiten")
    ).map((p) => p.slug),
    defaultProduktSlug: FIX_DEFAULT_PRODUKT_SLUG,
  },
  stromausfall: {
    leistungSlug: "elektroarbeiten",
    produktSlugs: ["fix-stromausfall", "fix-fi", "fix-steckdose"],
    defaultProduktSlug: "fix-stromausfall",
  },
  gartenpflege: {
    leistungSlug: "gartenpflege",
    produktSlugs: GARTEN_PRODUKTE.map((p) => p.slug),
    defaultProduktSlug: GARTEN_DEFAULT_PRODUKT_SLUG,
  },
};

/** Karussell-interner Slug → Leistungs-Basis-Slug. */
export const KARUSSELL_LEISTUNG_MAP: Record<string, string> = {
  malerarbeiten: "malerarbeiten",
  "badezimmer-sanierung": "badezimmer-sanierung",
  bodenbelag: "bodenbelag",
  "fenster-tueren": "fenster-tueren",
  trockenbau: "trockenbau",
  "heizung-sanitaer": "heizung-sanitaer",
  elektroarbeiten: "elektroarbeiten",
  dacharbeiten: "dacharbeiten",
  gartenpflege: "gartenpflege",
  gartengestaltung: "gartengestaltung",
  hausmeisterservice: "hausmeisterservice",
  gebauedereinigung: "hausmeisterservice",
  wartung: "heizung-sanitaer",
  "winterdienst-service": "winterdienst",
  "heizung-sanitaer-notfall": "heizung-sanitaer",
  "wasser-notfall": "heizung-sanitaer",
  "elektro-notfall": "elektroarbeiten",
};

export function normalizeLeistungSlug(slug: string): string {
  const s = slug.trim();
  if (s.endsWith("-muenchen")) return s.slice(0, -"-muenchen".length);
  return s;
}

export function getLeistungProduktLink(
  leistungSlug: string
): LeistungsProduktLink | null {
  const key = normalizeLeistungSlug(leistungSlug);
  return LEISTUNG_PRODUKT_MAP[key] ?? null;
}

export function getProdukteForLeistung(leistungSlug: string): string[] {
  return getLeistungProduktLink(leistungSlug)?.produktSlugs ?? [];
}

export function getDefaultProduktForLeistung(
  leistungSlug: string
): string | null {
  return getLeistungProduktLink(leistungSlug)?.defaultProduktSlug ?? null;
}

export function getLeistungForProdukt(produktSlug: string): string | null {
  for (const [leistung, link] of Object.entries(LEISTUNG_PRODUKT_MAP)) {
    if (link.produktSlugs.includes(produktSlug)) return leistung;
  }
  return null;
}

export function getKarussellLeistungSlug(karussellSlug: string): string {
  return KARUSSELL_LEISTUNG_MAP[karussellSlug] ?? karussellSlug;
}

export function getKarussellDefaultProdukt(karussellSlug: string): string | null {
  const leistung = getKarussellLeistungSlug(karussellSlug);
  return getDefaultProduktForLeistung(leistung);
}
