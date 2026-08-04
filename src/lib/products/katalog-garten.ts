import type { Produkt, ProduktGroesse } from "./types";

const GARTEN_LEISTUNGEN_BASE = [
  "Rasen & Kanten",
  "Hecken & Sträucher",
  "Beete & Unkraut",
  "Laub & Entsorgung",
  "Fester Ansprechpartner",
];

const GARTEN_LEISTUNGEN_M = [
  ...GARTEN_LEISTUNGEN_BASE,
  "Größere Hecken & Terrassen",
];

const GARTEN_LEISTUNGEN_L = [
  ...GARTEN_LEISTUNGEN_M,
  "Hanglagen & saisonale Extras",
];

const GROESSE_META: Record<
  ProduktGroesse,
  { qm: number; label: string; titelPrefix: string; leistungen: string[] }
> = {
  s: {
    qm: 80,
    label: "S",
    titelPrefix: "Kleiner Garten",
    leistungen: GARTEN_LEISTUNGEN_BASE,
  },
  m: {
    qm: 200,
    label: "M",
    titelPrefix: "Mittlerer Garten",
    leistungen: GARTEN_LEISTUNGEN_M,
  },
  l: {
    qm: 350,
    label: "L",
    titelPrefix: "Großer Garten",
    leistungen: GARTEN_LEISTUNGEN_L,
  },
};

function gartenProdukt(groesse: ProduktGroesse): Produkt {
  const g = GROESSE_META[groesse];
  return {
    slug: `garten-pflege-${groesse}`,
    titel: `Gartenpflege ${g.label}`,
    kurz: `${g.titelPrefix} (ca. ${g.qm} m²) · Saison-Abo 2×/Monat`,
    familie: "garten",
    leistungSlugs: ["gartenpflege"],
    groesse,
    leistungen: g.leistungen,
    scopeVersion: "1.1",
    groesseQm: g.qm,
    situation: "betreuung",
    bereiche: ["garten"],
  };
}

export const GARTEN_PRODUKTE: Produkt[] = (
  ["s", "m", "l"] as ProduktGroesse[]
).map(gartenProdukt);

export const GARTEN_DEFAULT_PRODUKT_SLUG = "garten-pflege-m";
