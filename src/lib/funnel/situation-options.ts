import type { Situation } from "@/lib/funnel/types";

/** Tags für Schritt-1-Kacheln (CSS-Klassen über page.tsx / BW_TAG_CLASS) */
export type BwFunnelStep1TagType = "multi" | "abo" | "notfall";

export type BwFunnelStep1Option = {
  id: Situation;
  label: string;
  hint: string;
  emoji: string;
  tag?: string | null;
  tagType?: BwFunnelStep1TagType;
  /** Notfall: grüne Akzent-Kachel + Badge */
  highlight?: boolean;
};

/** Bärenwald-Rechner Schritt 1 — Reihenfolge exakt */
export const BW_FUNNEL_STEP1_OPTIONS: BwFunnelStep1Option[] = [
  {
    id: "erneuern",
    label: "Zuhause erneuern",
    hint: "Bad, Boden, Heizung, Wände, Fenster, Küche und mehr",
    emoji: "🏠",
    tag: null,
    tagType: "multi",
  },
  {
    id: "kaputt",
    label: "Reparatur / Defekt",
    hint: "Für planbare Defekte und kleinere Schäden",
    emoji: "🔧",
    tag: null,
    tagType: "multi",
  },
  {
    id: "notfall",
    label: "Notfall",
    hint: "Wasser, Strom, Heizung — schnelle Hilfe",
    emoji: "⚡",
    tag: "Dringend",
    tagType: "notfall",
    highlight: true,
  },
  {
    id: "neubauen",
    label: "Neu bauen / Ausbau",
    hint: "Keller, Dachgeschoss, Terrasse, Anbau",
    emoji: "🏗️",
    tag: null,
    tagType: "multi",
  },
  {
    id: "betreuung",
    label: "Betreuung",
    hint: "Garten, Reinigung, Hausmeister, Winterdienst",
    emoji: "🌿",
    tag: "Abo / Einzel",
    tagType: "abo",
  },
  {
    id: "gewerbe",
    label: "Gewerbe / Gastro",
    hint: "Büro, Praxis, Laden, Gastronomie",
    emoji: "🏢",
    tag: "B2B",
  },
  {
    id: "gastro",
    label: "Gastronomie",
    hint: "Restaurant, Café, Bar — wir planen persönlich mit dir",
    emoji: "🍽️",
    tag: "B2B",
  },
];

export const BW_FUNNEL_STEP1_ORDER: Situation[] =
  BW_FUNNEL_STEP1_OPTIONS.map((o) => o.id);
