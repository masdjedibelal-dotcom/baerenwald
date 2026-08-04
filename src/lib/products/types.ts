import type { Situation } from "@/lib/funnel/types";

/** Buchbare Produktfamilien (MVP). */
export type ProduktFamilie = "bad" | "fix" | "garten" | "hausservice";

export type ProduktGroesse = "s" | "m" | "l";

export type BadAusstattungStufe = "standard" | "komfort" | "gehoben";

export type HausserviceStufe = "basis" | "komfort" | "premium";

export type KatalogQuelle =
  | "landing"
  | "karussell"
  | "leistung"
  | "portal"
  | "rechner";

/** Metadaten für Lead / CRM — wird in funnel_daten geschrieben. */
export type ProduktMeta = {
  produkt_slug: string;
  produkt_titel: string;
  produkt_familie: ProduktFamilie;
  produkt_stufe?: BadAusstattungStufe | string;
  produkt_groesse?: ProduktGroesse;
  produkt_scope_version: string;
  produkt_leistungen: string[];
  leistung_slug?: string;
  leistung_label?: string;
  katalog_quelle?: KatalogQuelle;
};

export type Produkt = {
  slug: string;
  titel: string;
  kurz: string;
  familie: ProduktFamilie;
  /** Leistungs-Slug(s) in LEISTUNGEN_DATA / leistung-produkt-map */
  leistungSlugs: string[];
  groesse?: ProduktGroesse;
  stufe?: BadAusstattungStufe | HausserviceStufe;
  /** Enthaltene Leistungen im Paket (Anzeige + CRM). */
  leistungen: string[];
  scopeVersion: string;
  /** Repräsentative m² für Preis-Klassifikation (Bad/Garten). */
  groesseQm?: number;
  situation: Situation;
  bereiche: string[];
};

export type LeistungsProduktLink = {
  leistungSlug: string;
  produktSlugs: string[];
  defaultProduktSlug: string | null;
};

export type ConversionModeType =
  | "paket"
  | "kurzflow"
  | "notfall"
  | "rechner_only";

export type ConversionMode = {
  type: ConversionModeType;
  /** Karussell-Karten-Slug → Leistungsseite */
  karussellSlugs?: string[];
};
