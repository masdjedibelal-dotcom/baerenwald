import type { Situation } from "@/lib/funnel/types";

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
  /** Zusätzliche Ratgeber-Verlinkung (z. B. Notfall-Guide). */
  relatedRatgeber?: { slug: string; label: string };
  faq: LeistungsFaqItem[];
  /** Query-Wert für `/rechner?situation=` (Funnel) */
  rechnerSituation: Situation;
  metaDescription?: string;
  /**
   * Seite ohne Preisrahmen (Kosten zu individuell): Text statt Preisblock, Anfrage mit
   * vorausgewählter Leistung (`anliegen` = ID aus ANFRAGE_ANLIEGEN).
   */
  ohnePreis?: { titel: string; text: string; anfrageLabel: string; anliegen: string };
}
