import type { Situation } from "@/lib/funnel/types";

export type BwFunnelStep1Option = {
  id: Situation;
  label: string;
  hint: string;
  /** SVG unter `/public/icons/{name}.svg` */
  icon: string;
  /** Optional UI-Badge */
  tag?: string;
};

/** Bärenwald-Rechner Schritt 1 — Reihenfolge exakt */
export const BW_FUNNEL_STEP1_OPTIONS: BwFunnelStep1Option[] = [
  {
    id: "erneuern",
    label: "Umbau & Modernisierung",
    hint: "Inkl. Innenausbau, Außenbereich, Terrasse, Keller, DG",
    icon: "01-haus-erneuern",
  },
  {
    id: "kaputt",
    label: "Reparatur & Notfall",
    hint: "Defekt — am Ende wählst du, wie schnell wir kommen sollen",
    icon: "02-reparatur",
  },
  {
    id: "betreuung",
    label: "Betreuung",
    hint: "Garten, Reinigung, Hausmeister, Winterdienst",
    icon: "03-betreuung",
  },
  {
    id: "gewerbe",
    label: "Gewerbe",
    hint: "Büro, Praxis, Laden, Gastronomie — wir planen individuell",
    icon: "04-gewerbe",
    tag: "B2B",
  },
];

export const BW_FUNNEL_STEP1_ORDER: Situation[] =
  BW_FUNNEL_STEP1_OPTIONS.map((o) => o.id);
