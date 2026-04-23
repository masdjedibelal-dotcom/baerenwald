import type { Situation } from "@/lib/funnel/types";

export type BwFunnelStep1Option = {
  id: Situation;
  label: string;
  hint: string;
  emoji: string;
  /** Optional UI-Badge */
  tag?: string;
};

/** Bärenwald-Rechner Schritt 1 — Reihenfolge exakt */
export const BW_FUNNEL_STEP1_OPTIONS: BwFunnelStep1Option[] = [
  {
    id: "erneuern",
    label: "Zuhause erneuern",
    hint: "Inkl. Ausbau, Umbau, Terrasse, Keller, DG",
    emoji: "🏠",
  },
  {
    id: "kaputt",
    label: "Reparatur & Notfall",
    hint: "Defekt — am Ende wählst du, wie schnell wir kommen sollen",
    emoji: "🔧",
  },
  {
    id: "betreuung",
    label: "Betreuung",
    hint: "Garten, Reinigung, Hausmeister, Winterdienst",
    emoji: "🌿",
  },
  {
    id: "gewerbe",
    label: "Gewerbe",
    hint: "Büro, Praxis, Laden, Gastronomie — wir planen individuell",
    emoji: "🏢",
    tag: "B2B",
  },
];

export const BW_FUNNEL_STEP1_ORDER: Situation[] =
  BW_FUNNEL_STEP1_OPTIONS.map((o) => o.id);
