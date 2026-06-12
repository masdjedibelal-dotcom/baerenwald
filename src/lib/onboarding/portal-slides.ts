export type OnboardingSlide = {
  id: string;
  imageBase: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Kurzliste: beim Kundenportal Vorteile, beim Partner-Portal To-dos */
  highlights: string[];
};

export const PORTAL_ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "uebersicht",
    imageBase: "01-uebersicht",
    eyebrow: "DEIN ÜBERBLICK",
    title: "Alles für dein Projekt an einem Ort",
    body: "Anfragen, Angebote und Aufträge — übersichtlich gebündelt. Kein E-Mail-Pingpong, kein Suchen in Ordnern.",
    highlights: [
      "Offene Anfragen und laufende Aufträge auf einen Blick",
      "Neues Projekt direkt starten — mit deinen gespeicherten Kontaktdaten",
      "Bärenwald GPT für Beratung, Visualisierung und Preisrechner",
    ],
  },
  {
    id: "anfragen",
    imageBase: "02-anfragen",
    eyebrow: "TRANSPARENZ",
    title: "Immer wissen, wo dein Projekt steht",
    body: "Du siehst den aktuellen Bearbeitungsstand — mit Verlauf und Unterlagen, wann immer du möchtest.",
    highlights: [
      "Status und Verlauf ohne Nachfragen per E-Mail",
      "Hochgeladene Fotos und Dokumente jederzeit einsehen",
      "Bei Fragen erreichst du uns direkt per Telefon oder WhatsApp",
    ],
  },
  {
    id: "angebote",
    imageBase: "03-angebote",
    eyebrow: "ENTSCHEIDUNG",
    title: "Angebote in Ruhe prüfen",
    body: "Preise, PDFs und Konditionen an einem Ort — du entscheidest in deinem Tempo, ohne Druck.",
    highlights: [
      "Angebote digital öffnen und PDF durchlesen",
      "Positionen und Preise klar auf einen Blick",
      "Erst bei Fragen nachfragen — dann in Ruhe zusagen",
    ],
  },
  {
    id: "auftraege",
    imageBase: "04-auftraege",
    eyebrow: "FORTSCHRITT",
    title: "Baustelle transparent mitverfolgen",
    body: "Termine, Bautagebuch-Einträge und Dokumente — so bleibst du informiert, auch ohne Vor-Ort-Termin.",
    highlights: [
      "Fortschritt deines Auftrags live verfolgen",
      "Bautagebuch mit Fotos vom Handwerker-Team lesen",
      "Rechnungen und Unterlagen jederzeit herunterladen",
    ],
  },
];
