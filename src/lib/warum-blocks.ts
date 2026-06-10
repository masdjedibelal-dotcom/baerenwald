export type WarumBlock = {
  titel: string;
  text: string;
  icon: string;
  variant: "dark" | "mist" | "soft";
};

export const WARUM_EINSATZ_BLOCKS: readonly WarumBlock[] = [
  {
    titel: "Ein Ansprechpartner",
    text: "Einer kennt dein Projekt — nicht drei Nummern, die du selbst abstimmst.",
    icon: "18-hausmeister",
    variant: "dark",
  },
  {
    titel: "Preistransparenz",
    text: "Preisrahmen vor dem Anruf. Festpreis nach dem Termin vor Ort.",
    icon: "01-haus-erneuern",
    variant: "mist",
  },
  {
    titel: "Immer auf dem Stand",
    text: "Statusupdates und digitales Abnahmeprotokoll — ohne nachfragen.",
    icon: "03-betreuung",
    variant: "soft",
  },
] as const;
