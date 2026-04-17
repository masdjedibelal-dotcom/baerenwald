import type { Situation } from "@/lib/funnel/types";

export type BwFunnelStep1Option = {
  id: Situation;
  label: string;
  hint: string;
  emoji: string;
};

/** Bärenwald-Rechner Schritt 1 — Reihenfolge exakt */
export const BW_FUNNEL_STEP1_OPTIONS: BwFunnelStep1Option[] = [
  {
    id: "erneuern",
    label: "Zuhause erneuern",
    hint: "Bad, Boden, Heizung, Wände, Fenster und mehr",
    emoji: "🏠",
  },
  {
    id: "kaputt",
    label: "Reparatur / Defekt",
    hint: "Für planbare Defekte und kleinere Schäden",
    emoji: "🔧",
  },
  {
    id: "notfall",
    label: "Notfall",
    hint: "Wasser, Strom, Heizung — schnelle Hilfe",
    emoji: "⚡",
  },
  {
    id: "neubauen",
    label: "Neu bauen / Ausbau",
    hint: "Keller, Dachgeschoss, Terrasse, Anbau",
    emoji: "🏗️",
  },
  {
    id: "betreuung",
    label: "Betreuung",
    hint: "Garten, Reinigung, Hausmeister, Winterdienst",
    emoji: "🌿",
  },
  {
    id: "gewerbe",
    label: "Gewerbe / Gastro",
    hint: "Büro, Praxis, Laden, Gastronomie",
    emoji: "🏢",
  },
  {
    id: "gastro",
    label: "Gastronomie",
    hint: "Restaurant, Café, Bar — wir planen persönlich mit dir",
    emoji: "🍽️",
  },
];

export const BW_FUNNEL_STEP1_ORDER: Situation[] =
  BW_FUNNEL_STEP1_OPTIONS.map((o) => o.id);
