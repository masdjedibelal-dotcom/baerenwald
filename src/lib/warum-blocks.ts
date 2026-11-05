export type WarumBlock = {
  titel: string;
  /** Absätze der Karte */
  texte: readonly string[];
  icon: string;
  variant: "dark" | "mist" | "soft";
};

export const WARUM_EINSATZ_BLOCKS: readonly WarumBlock[] = [
  {
    titel: "Unsere eigenen Gewerke",
    texte: [
      "Trockenbau, Bodenlegerarbeiten, Abbruch, Garten- und Landschaftsbau sowie Elektrotechnik unter Meisterleitung führen wir mit eigenen Mitarbeitern aus. Unsere Mannschaft übernimmt auch vereinbarte Vorarbeiten wie den Ausbau alter Böden oder das Fräsen von Schlitzen.",
      "Wir bereiten die Arbeitsbereiche vor, stimmen die Reihenfolge ab und organisieren bei Bedarf Material und Lieferungen. So findet der nächste Betrieb einen sauberen, vorbereiteten Arbeitsplatz vor und kann sich auf seine Facharbeit konzentrieren.",
    ],
    icon: "02-reparatur",
    variant: "dark",
  },
  {
    titel: "Rund 70 Partnerbetriebe mit unterschiedlichen Stärken",
    texte: [
      "Allein im Sanitärbereich arbeiten wir mit mehreren Fachbetrieben zusammen. Ein Betrieb hat besondere Erfahrung mit kompletten Badsanierungen, ein anderer mit Leitungsarbeiten im Bestand. Nach diesem Prinzip wählen wir in jedem Gewerk den Fachbetrieb aus, dessen Erfahrung am besten zur konkreten Aufgabe passt.",
      "Ändert sich der Bauablauf oder braucht ein Partner Unterstützung, können wir dank unseres Netzwerks kurzfristig umplanen und einen geeigneten Fachbetrieb hinzuziehen.",
    ],
    icon: "25-person",
    variant: "mist",
  },
  {
    titel: "Bauleitung und Statik",
    texte: [
      "Je nach Vorhaben binden wir erfahrene Bauleiter aus unserem Partnernetzwerk ein. Sie prüfen den Baufortschritt vor Ort und begleiten die Übergaben zwischen den Gewerken.",
      "Bei statischen Fragen ziehen wir einen Statiker hinzu. Referenzen unserer Partnerbauleiter stellen wir Ihnen gerne auf Anfrage zur Verfügung.",
    ],
    icon: "01-haus-erneuern",
    variant: "soft",
  },
] as const;
