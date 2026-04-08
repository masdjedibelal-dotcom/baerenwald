import type { Situation } from "@/lib/types";

export type SituationTagType = "multi" | "abo" | "urgent";

export const SITUATION_OPTIONS: {
  id: Situation;
  label: string;
  hint: string;
  tag: string;
  tagType: SituationTagType;
}[] = [
  {
    id: "renovierung",
    label: "Renovierung",
    hint: "Räume, Bad, Küche, Außenbereich",
    tag: "Multi-Gewerk",
    tagType: "multi",
  },
  {
    id: "neubau",
    label: "Neubau / Einzug",
    hint: "Bestand, Rohbau, Bauträger",
    tag: "Multi-Gewerk",
    tagType: "multi",
  },
  {
    id: "akut",
    label: "Akuter Notfall",
    hint: "Heizung, Wasser, Strom — schnelle Hilfe",
    tag: "Dringend",
    tagType: "urgent",
  },
  {
    id: "pflege",
    label: "Pflege & Wartung",
    hint: "Garten, Reinigung, Winterdienst",
    tag: "Abo / Einzel",
    tagType: "abo",
  },
  {
    id: "b2b",
    label: "Gewerbe / B2B",
    hint: "Büro, WEG, mehrere Standorte",
    tag: "Multi-Gewerk",
    tagType: "multi",
  },
];
