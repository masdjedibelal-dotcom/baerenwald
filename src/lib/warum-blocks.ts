export type WarumBlock = {
  titel: string;
  text: string;
  variant: "dark" | "mist" | "soft";
};

export const WARUM_EINSATZ_BLOCKS: readonly WarumBlock[] = [
  {
    titel: "Ein Ansprechpartner",
    text: "Nicht drei Nummern die du anrufst. Nicht du als Projektmanager zwischen den Gewerken. Einer der alles kennt — und alles koordiniert.",
    variant: "dark",
  },
  {
    titel: "Preistransparenz",
    text: "Du siehst was dein Projekt kostet bevor du überhaupt anrufst. Nach dem Termin ein verbindlicher Festpreis. Kein Nachtrag ohne deine Zustimmung.",
    variant: "mist",
  },
  {
    titel: "Immer auf dem Stand",
    text: "Statusupdates während des Projekts. Digitales Abnahmeprotokoll am Ende. Du weißt immer was läuft — ohne einmal nachfragen zu müssen.",
    variant: "soft",
  },
] as const;
