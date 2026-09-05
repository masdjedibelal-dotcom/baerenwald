import {
  LANDING_ICON_WARUM_CONTACT,
  LANDING_ICON_WARUM_PRICE,
  LANDING_ICON_WARUM_STATUS,
} from "@/lib/landing-icons";

export type WarumBlock = {
  titel: string;
  text: string;
  icon: string;
  variant: "dark" | "mist" | "soft";
};

export const WARUM_EINSATZ_BLOCKS: readonly WarumBlock[] = [
  {
    titel: "Ein Ansprechpartner",
    text: "Einer kennt Ihr Projekt — nicht drei Nummern, die Sie selbst abstimmen.",
    icon: LANDING_ICON_WARUM_CONTACT,
    variant: "dark",
  },
  {
    titel: "Preistransparenz",
    text: "Preisrahmen vor dem Anruf. Festpreis nach dem Termin vor Ort.",
    icon: LANDING_ICON_WARUM_PRICE,
    variant: "mist",
  },
  {
    titel: "Immer auf dem Stand",
    text: "Statusupdates und digitales Abnahmeprotokoll — ohne nachfragen.",
    icon: LANDING_ICON_WARUM_STATUS,
    variant: "soft",
  },
] as const;
