import type { Situation } from "@/lib/types";

export interface RatgeberFaqItem {
  q: string;
  a: string;
}

export interface RatgeberData {
  slug: string;
  titel: string;
  metaTitle: string;
  metaDescription: string;
  hero: { headline: string; subline: string };
  wannBrauche: { title: string; punkte: string[] };
  ablauf: { schritt: string; text: string }[];
  voraussetzungen: string[];
  materialien: {
    name: string;
    beschreibung: string;
    vonBis: string;
    fuer: string;
  }[];
  kosten: {
    einheit: string;
    von: number;
    bis: number;
    faktoren: string[];
    beispiel: string;
  };
  zeitaufwand: {
    klein: string;
    mittel: string;
    gross: string;
    faktoren: string[];
  };
  koordination: string;
  /** Genau drei Kurz-USPs neben dem Koordinationstext */
  koordinationUsps: [string, string, string];
  faq: RatgeberFaqItem[];
  qualitaet: string[];
  muenchen: string[];
  leistungsSlug: string;
  leistungsLabel: string;
  rechnerSituation: Situation;
  /** ISO 8601 Datum */
  datePublished: string;
  dateModified: string;
}
