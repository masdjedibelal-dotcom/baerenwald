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
  eyebrow: "Preisrahmen für dein Projekt",
  h2: "Was kostet dein Vorhaben?",
  sub: "In unter einer Minute zum unverbindlichen Rahmen — Festpreisangebot nach Besichtigung.",
  ctaPrimary: "Kostenrahmen anfragen →",
  ctaSecondary: "Im Detailrechner anpassen",
  trust: "Meisterbetriebe · Anfahrt bei Auftrag angerechnet · ca. 2 Min.",
};

export const KONVERTER_COPY: Record<string, KonverterCopy> = {
  "badezimmer-sanierung": {
    eyebrow: "Preisrahmen für dein Bad",
    h2: "Welches Bad passt zu dir?",
    sub: "Größe und Ausstattung wählen — du siehst sofort einen realistischen Rahmen. Unverbindlich, Festpreis nach Besichtigung.",
    ctaPrimary: "Preisrahmen anfragen →",
    ctaSecondary: "Im Detailrechner anpassen",
    trust: "Meisterbetriebe · Koordination aller Gewerke · ca. 2 Min.",
  },
  gartenpflege: {
    eyebrow: "Gartenpflege-Abo",
    h2: "Welche Gartengröße hast du?",
    sub: "Größe wählen — Preis pro Besuch als Orientierung. Rhythmus und Details klären wir im Angebot.",
    ctaPrimary: "Kostenrahmen anfragen →",
    ctaSecondary: "Im Detailrechner anpassen",
    trust: "Regelmäßig · Entsorgung inklusive · München & Umgebung",
  },
  "heizung-sanitaer": {
    eyebrow: "Schnelle Hilfe",
    h2: "Was ist passiert?",
    sub: "Akuter Notfall? Ruf uns an — online siehst du einen ersten Einsatz-Rahmen.",
    ctaPrimary: "Rückruf anfordern →",
    ctaSecondary: "Zum Detailrechner",
    trust: "Mo–Sa 7–20 Uhr · Sanitär-Fachbetriebe",
  },
  elektroarbeiten: {
    eyebrow: "Elektro-Notfall",
    h2: "Strom weg oder defekt?",
    sub: "Zertifizierte Elektriker — bei akutem Fall zuerst anrufen.",
    ctaPrimary: "Rückruf anfordern →",
    ctaSecondary: "Zum Detailrechner",
    trust: "Normgerecht · Dokumentation auf Wunsch",
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

/** Kurzlabels für Vergleichsspalten unter den Paket-Cards */
export const HAUSSERVICE_STUFE_SHORT_LABELS: Record<HausserviceStufe, string> = {
  basis: "S",
  komfort: "M",
  premium: "L",
};
