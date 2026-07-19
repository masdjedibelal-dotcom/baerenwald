import type { HausserviceStufe, Produkt } from "./types";

/** Nutzer-sichtbarer Name (interne Familie/Slugs: hausservice). */
export const HAUSBETREUUNG_FAMILIE_LABEL = "Service & Betreuung";

const LEISTUNGEN_BASIS = [
  "Hausmeister-Betreuung vor Ort",
  "Technische Kleinigkeiten & Meldungen",
  "Fester Ansprechpartner",
  "Monatlicher Kurzreport",
];

const LEISTUNGEN_KOMFORT = [
  ...LEISTUNGEN_BASIS,
  "Regelmäßige Reinigung",
  "Gartenarbeiten im Abo",
];

const LEISTUNGEN_PREMIUM = [
  ...LEISTUNGEN_KOMFORT,
  "Winterdienst in der Saison",
];

const STUFEN_META: Record<
  HausserviceStufe,
  { label: string; tagline: string; leistungen: string[] }
> = {
  basis: {
    label: "Basis",
    tagline: "Hausmeister — das Nötigste",
    leistungen: LEISTUNGEN_BASIS,
  },
  komfort: {
    label: "Komfort",
    tagline: "Hausmeister, Reinigung & Garten",
    leistungen: LEISTUNGEN_KOMFORT,
  },
  premium: {
    label: "Premium",
    tagline: "Rundum inkl. Winterdienst",
    leistungen: LEISTUNGEN_PREMIUM,
  },
};

function hausserviceProdukt(stufe: HausserviceStufe): Produkt {
  const meta = STUFEN_META[stufe];
  return {
    slug: `hausservice-${stufe}`,
    titel: `${HAUSBETREUUNG_FAMILIE_LABEL} ${meta.label}`,
    kurz: meta.tagline,
    familie: "hausservice",
    leistungSlugs: ["hausmeister", "gartenpflege"],
    stufe,
    leistungen: meta.leistungen,
    scopeVersion: "1.0",
    groesseQm: 100,
    situation: "betreuung",
    bereiche: ["hausmeister", "reinigung", "garten"],
  };
}

export const HAUSSERVICE_PRODUKTE: Produkt[] = (
  ["basis", "komfort", "premium"] as HausserviceStufe[]
).map(hausserviceProdukt);

export const HAUSSERVICE_DEFAULT_PRODUKT_SLUG = "hausservice-komfort";

export const HAUSSERVICE_EMPFOHLEN_STUFE: HausserviceStufe = "komfort";
