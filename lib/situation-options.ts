import type { Situation as BwSituation } from "@/lib/funnel/types";
import type { Situation } from "@/lib/types";

export type SituationTagType = "multi" | "abo" | "notfall";

/** Tags für den Bärenwald-Rechner (Schritt 1) — inkl. B2B */
export type BwFunnelStep1TagType = "multi" | "abo" | "notfall" | "neutral";

export const SITUATION_OPTIONS: {
  id: Situation;
  label: string;
  hint: string;
  tag: string;
  tagType: SituationTagType;
}[] = [
  {
    id: "renovierung",
    label: "Ich möchte renovieren",
    hint: "Wände, Böden, Bad, Küche auffrischen",
    tag: "Mehrere Leistungen",
    tagType: "multi",
  },
  {
    id: "neubau",
    label: "Ich will etwas umbauen oder anbauen",
    hint: "Neue Wand einziehen, Dachgeschoss ausbauen, Terrasse bauen",
    tag: "Mehrere Leistungen",
    tagType: "multi",
  },
  {
    id: "akut",
    label: "Es ist kaputt — ich brauche Hilfe",
    hint: "Heizung aus, Rohr undicht, Strom weg — so schnell wie möglich",
    tag: "Dringend",
    tagType: "notfall",
  },
  {
    id: "pflege",
    label: "Ich will mich um nichts kümmern müssen",
    hint: "Garten, Winterdienst, Reinigung — jemand der regelmäßig da ist",
    tag: "Abo / Einzel",
    tagType: "abo",
  },
  {
    id: "b2b",
    label: "Etwas muss grundlegend erneuert werden",
    hint: "Heizung, Dach, Fenster, Leitungen — nicht nur auffrischen sondern wirklich neu",
    tag: "Größere Vorhaben",
    tagType: "multi",
  },
];

/** Bärenwald-Funnel Schritt 1 — Situationen (lib/funnel/types) */
export const BW_FUNNEL_STEP1_OPTIONS: {
  id: BwSituation;
  label: string;
  hint: string;
  emoji: string;
  tag?: string;
  tagType?: BwFunnelStep1TagType;
}[] = [
  {
    id: "renovieren",
    label: "Renovieren",
    hint: "Bad, Küche, Wände, Fenster",
    emoji: "🏠",
    tagType: "multi",
  },
  {
    id: "sanieren",
    label: "Sanieren",
    hint: "Heizung, Dach, Elektrik, Leitungen",
    emoji: "🔧",
    tagType: "multi",
  },
  {
    id: "notfall",
    label: "Notfall",
    hint: "Heizung, Wasser, Strom — wir kommen schnell",
    emoji: "⚡",
    tagType: "notfall",
  },
  {
    id: "neubauen",
    label: "Neubau / Ausbau",
    hint: "Keller, Dachgeschoss, Terrasse, Umbau",
    emoji: "🏗️",
    tagType: "multi",
  },
  {
    id: "betreuung",
    label: "Betreuung",
    hint: "Garten, Reinigung, Winterdienst",
    emoji: "🌿",
    tagType: "abo",
  },
  {
    id: "gewerbe",
    label: "Gewerbe oder Büro",
    hint: "Büro, Laden, Praxis, Lager — wir planen individuell mit dir",
    emoji: "🏢",
    tag: "B2B",
    tagType: "neutral",
  },
  {
    id: "gastro",
    label: "Gastronomie",
    hint: "Restaurant, Café, Bar, Hotel — komplex und individuell",
    emoji: "🍽️",
    tag: "B2B",
    tagType: "neutral",
  },
];

export const BW_FUNNEL_STEP1_ORDER: BwSituation[] =
  BW_FUNNEL_STEP1_OPTIONS.map((o) => o.id);
