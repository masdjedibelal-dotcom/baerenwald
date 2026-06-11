export type OnboardingSlide = {
  id: string;
  imageBase: string;
  eyebrow: string;
  title: string;
  body: string;
  todos: string[];
};

export const PORTAL_ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "uebersicht",
    imageBase: "01-uebersicht",
    eyebrow: "DEIN ÜBERBLICK",
    title: "Alles auf einen Blick",
    body: "Offene Anfragen, laufende Aufträge und der nächste Schritt — ohne E-Mail-Pingpong.",
    todos: [
      "KPI-Karten oben checken",
      "„Nächster Schritt“ beachten",
      "Neue Anfrage jederzeit starten",
    ],
  },
  {
    id: "anfragen",
    imageBase: "02-anfragen",
    eyebrow: "TRANSPARENZ",
    title: "Anfrage-Status live sehen",
    body: "Du siehst jederzeit, wo dein Projekt steht — Status, Verlauf und Unterlagen ohne Nachfragen.",
    todos: [
      "Status und Verlauf im Detail lesen",
      "Hochgeladene Unterlagen einsehen",
      "Bei Bedarf Rückfrage an Bärenwald",
    ],
  },
  {
    id: "angebote",
    imageBase: "03-angebote",
    eyebrow: "ENTSCHEIDUNG",
    title: "Angebote digital prüfen",
    body: "Preise, PDFs und Konditionen an einem Ort — entscheiden, wenn du bereit bist.",
    todos: [
      "Angebot öffnen und PDF lesen",
      "Preisrahmen vergleichen",
      "Freigabe oder Rückfrage",
    ],
  },
  {
    id: "auftraege",
    imageBase: "04-auftraege",
    eyebrow: "FORTSCHRITT",
    title: "Auftrag & Bautagebuch",
    body: "Termine, Dokumente und Bautagebuch-Einträge — du bleibst informiert, ohne nachzufragen.",
    todos: [
      "Fortschritt im Auftrag verfolgen",
      "Bautagebuch mit Fotos lesen",
      "Unterlagen herunterladen",
    ],
  },
  {
    id: "gpt",
    imageBase: "05-gpt",
    eyebrow: "BÄRENWALD GPT",
    title: "Beraten & visualisieren",
    body: "KI-Beratung, Raumvisualisierung und Preisrahmen — direkt in MeinBärenwald.",
    todos: [
      "Fragen stellen oder Projekt beschreiben",
      "Raumfoto hochladen & visualisieren",
      "Ergebnis als Anfrage senden",
    ],
  },
];
