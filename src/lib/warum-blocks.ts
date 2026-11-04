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
    titel: "Eigene Gewerke",
    text: "Trockenbau, Bodenlegen, Abbruch, Garten- und Landschaftsbau und Elektrotechnik unter Meisterleitung führen wir selbst aus.",
    icon: LANDING_ICON_WARUM_CONTACT,
    variant: "dark",
  },
  {
    titel: "Rund 70 Partnerbetriebe",
    text: "Für alle weiteren Gewerke binden wir Fachbetriebe ein, ausgewählt nach Können und Eignung für Ihre Aufgabe.",
    icon: LANDING_ICON_WARUM_PRICE,
    variant: "mist",
  },
  {
    titel: "Ein Ansprechpartner",
    text: "Von der Besichtigung bis zur Abnahme bleibt Bärenwald Ihr Ansprechpartner, auch wenn Partnerbetriebe ausführen.",
    icon: LANDING_ICON_WARUM_STATUS,
    variant: "soft",
  },
] as const;
