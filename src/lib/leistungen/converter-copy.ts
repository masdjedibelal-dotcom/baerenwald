/** Conversion-Copy pro Leistung — getrennt von SEO-Texten in data.ts */

import type {
  BadAusstattungStufe,
  HausserviceStufe,
  ProduktGroesse,
} from "@/lib/products/types";

export type KonverterCopy = {
  eyebrow: string;
  h2: string;
  sub: string;
  ctaPrimary: string;
  ctaSecondary: string;
  trust: string;
};

const DEFAULT_COPY: KonverterCopy = {
  eyebrow: "Preisrahmen für Ihr Projekt",
  h2: "Was kostet Ihr Vorhaben?",
  sub: "In unter einer Minute zum unverbindlichen Rahmen — das Angebot erstellen wir nach der Besichtigung.",
  ctaPrimary: "Kostenrahmen anfragen →",
  ctaSecondary: "Im Detailrechner anpassen",
  trust: "Eigene Gewerke & Fachpartner · Ein Ansprechpartner · ca. 2 Min.",
};

export const KONVERTER_COPY: Record<string, KonverterCopy> = {
  "badezimmer-sanierung": {
    eyebrow: "Preisrahmen für Ihr Bad",
    h2: "Welches Bad passt zu Ihnen?",
    sub: "Größe und Ausstattung wählen — Sie sehen sofort einen realistischen Rahmen. Unverbindlich, Angebot nach Besichtigung.",
    ctaPrimary: "Preisrahmen anfragen →",
    ctaSecondary: "Im Detailrechner anpassen",
    trust: "Eigene Gewerke & Fachpartner · Koordination aller Gewerke · ca. 2 Min.",
  },
  gartenpflege: {
    eyebrow: "Gartenpflege-Abo",
    h2: "Welche Gartengröße haben Sie?",
    sub: "Größe wählen — Preis pro Besuch als Orientierung. Rhythmus und Details klären wir im Angebot.",
    ctaPrimary: "Kostenrahmen anfragen →",
    ctaSecondary: "Im Detailrechner anpassen",
    trust: "Regelmäßig · Entsorgung inklusive · München & Umgebung",
  },
  "heizung-sanitaer": {
    eyebrow: "Modernisierung",
    h2: "Heizung oder Bad modernisieren?",
    sub: "Heizungstausch, Wärmepumpe oder neue Leitungen: Wir stimmen die Arbeiten mit den Fachbetrieben und unserem Elektrobereich ab. Das Angebot erstellen wir nach der Besichtigung.",
    ctaPrimary: "Projekt anfragen →",
    ctaSecondary: "Im Detailrechner anpassen",
    trust: "Fachbetriebe · Elektro aus eigener Hand · Ein Ansprechpartner",
  },
  elektroarbeiten: {
    eyebrow: "Elektrotechnik",
    h2: "Elektrotechnik für Umbau und Sanierung",
    sub: "Neue Installation, Erweiterung oder Verteilung: Unser Elektromeister plant die Arbeiten mit dem Bauablauf. Das Angebot erstellen wir nach der Besichtigung.",
    ctaPrimary: "Projekt anfragen →",
    ctaSecondary: "Zum Detailrechner",
    trust: "Eigener Elektromeister · Prüfung und Dokumentation",
  },
};

export function getKonverterCopy(leistungSlug: string): KonverterCopy {
  const key = leistungSlug.endsWith("-muenchen")
    ? leistungSlug.slice(0, -"-muenchen".length)
    : leistungSlug;
  return KONVERTER_COPY[key] ?? DEFAULT_COPY;
}

export const PAKET_GROESSE_LABELS = {
  s: { label: "S", hint: "bis 5 m²" },
  m: { label: "M", hint: "5–8 m²" },
  l: { label: "L", hint: "ab 8 m²" },
} as const;

/** Gartenfläche — getrennt von Bad-m²-Labels. */
export const GARTEN_GROESSE_LABELS = {
  s: { label: "S", hint: "bis ca. 100 m²" },
  m: { label: "M", hint: "ca. 100–300 m²" },
  l: { label: "L", hint: "ab ca. 300 m²" },
} as const;

export const PAKET_STUFE_LABELS = {
  standard: "Standard",
  komfort: "Komfort",
  gehoben: "Gehoben",
} as const;

export const PAKET_STUFE_TAGLINES = {
  standard: "Solide Basis — alles Wichtige drin",
  komfort: "Beliebteste Wahl — mehr Komfort",
  gehoben: "Premium — Design & Extras",
} as const;

/** Mittlere Stufe / Größe als „Empfohlen“-Badge. */
export const PAKET_EMPFOHLEN_STUFE: BadAusstattungStufe = "komfort";
export const PAKET_EMPFOHLEN_GROESSE: ProduktGroesse = "m";

export const HAUSSERVICE_STUFE_LABELS: Record<HausserviceStufe, string> = {
  basis: "Basis",
  komfort: "Komfort",
  premium: "Premium",
};

export const HAUSSERVICE_STUFE_TAGLINES: Record<HausserviceStufe, string> = {
  basis: "Hausmeister — das Nötigste",
  komfort: "Hausmeister, Reinigung & Garten",
  premium: "Rundum inkl. Winterdienst",
};

export const HAUSSERVICE_EMPFOHLEN_STUFE: HausserviceStufe = "komfort";
