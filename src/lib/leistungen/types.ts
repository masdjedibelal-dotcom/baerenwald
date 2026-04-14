import type { Situation } from "@/lib/types";

export interface LeistungsFaqItem {
  q: string;
  a: string;
}

export interface LeistungsData {
  slug: string;
  label: string;
  headline: string;
  subline: string;
  beschreibung: string;
  wasWirMachen: string[];
  preisVon: number;
  preisBis: number;
  preisEinheit: string;
  preisHinweis: string;
  vorteile: { icon: string; text: string }[];
  ratgeberSlug: string;
  ratgeberLabel: string;
  faq: LeistungsFaqItem[];
  /** Query-Wert für `/rechner?situation=` (Funnel) */
  rechnerSituation: Situation;
  metaDescription?: string;
}
