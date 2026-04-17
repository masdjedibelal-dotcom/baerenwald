import type { Situation } from "@/lib/types";

export type SituationTagType = "multi" | "abo" | "notfall";

export const SITUATION_OPTIONS: {
  id: Situation;
  label: string;
  hint: string;
  tag: string;
  tagType: SituationTagType;
}[] = [
  {
    id: "renovierung",
    label: "Ich möchte Zuhause erneuern",
    hint: "Wände streichen, neuer Boden, Bad, Küche auffrischen",
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

export {
  BW_FUNNEL_STEP1_OPTIONS,
  BW_FUNNEL_STEP1_ORDER,
} from "@/lib/funnel/situation-options";

export type {
  BwFunnelStep1Option,
  BwFunnelStep1TagType,
} from "@/lib/funnel/situation-options";
