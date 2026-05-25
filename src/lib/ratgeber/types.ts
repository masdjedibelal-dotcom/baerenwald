import type { Situation } from "@/lib/funnel/types";

export interface RatgeberFaqItem {
  q: string;
  a: string;
}

/** Optionale H2-/Kapitel-Überschriften (Standard in RatgeberPage). */
export interface RatgeberSectionH2 {
  ablauf?: string;
  voraussetzungen?: string;
  optionen?: string;
  kosten?: string;
  zeit?: string;
  faq?: string;
  qualitaet?: string;
  muenchen?: string;
}

export type RatgeberLayout = "standard" | "guide";

export interface RatgeberRelatedLink {
  href: string;
  label: string;
}

export interface RatgeberData {
  slug: string;
  /** Optional: Canonical-Pfad mit Umlauten (Slug in URLs bleibt ASCII). */
  canonicalSlug?: string;
  /** Guide-Artikel: nur Kurzantwort, Haupttext (ablauf), FAQ — ohne Preistabelle. */
  layout?: RatgeberLayout;
  titel: string;
  metaTitle: string;
  metaDescription: string;
  /** GEO-Kurzantwort direkt unter Hero-Einleitung. */
  kurzeAntwort: string;
  sectionH2?: RatgeberSectionH2;
  relatedLinks?: RatgeberRelatedLink[];
  /** Text für Rechner-CTA oberhalb/unter Kurzantwort (Guide). */
  ctaRechnerLabel?: string;
  /** Final-CTA: Telefon-Button vor Rechner-Button. */
  finalCtaPhoneFirst?: boolean;
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
