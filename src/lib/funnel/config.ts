import type { FunnelStep, Kundentyp, Situation, StepOption } from "./types";

function kundentypOption(
  value: Kundentyp,
  label: string,
  hint: string,
  infoText?: string,
  warnText?: string
): StepOption {
  return { value, label, hint, infoText, warnText };
}

const GEWERBE_GASTRO_TILES: StepOption[] = [
  kundentypOption(
    "gewerbe",
    "Gewerbliches Objekt",
    "Büro, Laden, Praxis, Lager",
    undefined,
    "Gewerbeprojekte kalkulieren wir individuell — kein automatischer Preis möglich. Wir melden uns persönlich bei dir."
  ),
  kundentypOption(
    "gastro",
    "Gastronomie",
    "Restaurant, Café, Bar, Hotel",
    undefined,
    "Gastro-Umbauten sind komplex und stark reguliert. Wir besprechen das persönlich mit dir."
  ),
];

function withGewerbeGastro(base: StepOption[]): StepOption[] {
  return [...base, ...GEWERBE_GASTRO_TILES];
}

/** Optionen für den Schritt „Kundentyp“ — abhängig von der Situation */
export function getKundentypOptions(situation: Situation): StepOption[] {
  switch (situation) {
    case "renovieren":
    case "sanieren":
      return withGewerbeGastro([
        kundentypOption(
          "eigentuemer",
          "Ich bin Eigentümer",
          "Eigentumswohnung oder Haus"
        ),
        kundentypOption(
          "mieter",
          "Ich bin Mieter",
          "Mietwohnung oder gemietetes Haus",
          "Bei Mietwohnungen brauchen wir in manchen Fällen die Zustimmung des Vermieters. Wir klären das gemeinsam beim Termin."
        ),
      ]);
    case "notfall":
      return withGewerbeGastro([
        kundentypOption(
          "eigentuemer",
          "Ich bin Eigentümer",
          "Eigentumswohnung oder Haus"
        ),
        kundentypOption(
          "mieter",
          "Ich bin Mieter",
          "Mietwohnung oder gemietetes Haus",
          "Bei Notfällen in Mietwohnungen gilt: Haupthahn schließen, dann Vermieter informieren. Wir kommen sofort."
        ),
        kundentypOption(
          "hausverwaltung",
          "Hausverwaltung",
          "Ich verwalte das Objekt"
        ),
      ]);
    case "neubauen":
      return withGewerbeGastro([
        kundentypOption(
          "eigentuemer",
          "Ich bin Eigentümer",
          "Eigentumswohnung oder Haus"
        ),
      ]);
    case "betreuung":
      return withGewerbeGastro([
        kundentypOption(
          "eigentuemer",
          "Ich bin Eigentümer",
          "Eigentumswohnung oder Haus"
        ),
        kundentypOption(
          "hausverwaltung",
          "Hausverwaltung",
          "Mehrfamilienhaus oder Wohnanlage",
          "Für Hausverwaltungen bieten wir individuelle Servicepakete an. Wir besprechen das gerne persönlich."
        ),
      ]);
    default:
      return [];
  }
}

export function getKundentypStep(situation: Situation): FunnelStep {
  return {
    id: "kundentyp",
    question: "Für wen ist das Objekt?",
    subtext:
      "Hilft uns bei der richtigen Planung — du kannst auch überspringen.",
    inputType: "tiles-single",
    options: getKundentypOptions(situation),
  };
}

/** Schritt „Größe“ für Betreuung — Optionen abhängig von gewählten Bereichen */
export function getBetreuungGroesseOptions(bereiche: string[]): StepOption[] {
  if (bereiche.includes("garten")) {
    return [
      { value: "s", label: "Bis 100 m²", groesse: 70 },
      { value: "m", label: "100–300 m²", groesse: 200 },
      { value: "l", label: "300–600 m²", groesse: 450 },
      { value: "xl", label: "Über 600 m²", groesse: 800 },
    ];
  }
  if (bereiche.includes("baum")) {
    return [
      { value: "ein", label: "1 Baum", groesse: 1 },
      { value: "wenige", label: "2–4 Bäume", groesse: 3 },
      { value: "viele", label: "5 oder mehr", groesse: 6 },
    ];
  }
  if (bereiche.includes("reinigung")) {
    return [
      { value: "s", label: "Bis 60 m²", groesse: 45 },
      { value: "m", label: "60–120 m²", groesse: 90 },
      { value: "l", label: "Über 120 m²", groesse: 160 },
    ];
  }
  if (bereiche.includes("winter")) {
    return [
      { value: "kurz", label: "Bis 10 m Gehweg", groesse: 7 },
      { value: "mittel", label: "10–25 m", groesse: 18 },
      { value: "lang", label: "Über 25 m", groesse: 35 },
    ];
  }
  return [
    { value: "s", label: "Kleine Wohnung / ETW", groesse: 55 },
    { value: "m", label: "Reihenhaus / DHH", groesse: 120 },
    { value: "l", label: "Einfamilienhaus", groesse: 180 },
    { value: "xl", label: "Mehrfamilienhaus", groesse: 400 },
  ];
}

export function getBetreuungGroesseStep(bereiche: string[]): FunnelStep {
  return {
    id: "betreuung_groesse",
    question: "Wie groß ist das Objekt?",
    inputType: "tiles-single",
    options: getBetreuungGroesseOptions(bereiche),
  };
}

export const SITUATIONEN_CONFIG: Record<
  Situation,
  { steps: FunnelStep[]; skipGroesse?: boolean }
> = {
  renovieren: {
    steps: [
      {
        id: "renovieren_bereiche",
        question: "Was soll renoviert werden?",
        subtext: "Mehrfachauswahl möglich.",
        inputType: "tiles-multi",
        options: [
          {
            value: "bad",
            label: "Das Bad",
            hint: "Wasser & Heizung, Fliesen, Lüftung",
            infoText:
              "Komplettes Bad: Fliesen, WC, Dusche und Waschtisch, ggf. Lüftung. Größter Eingriff aber auch größter Wertzuwachs.",
            triggerGewerke: ["bad", "fliesen", "sanitaer"],
          },
          {
            value: "kueche",
            label: "Die Küche",
            hint: "Anschlüsse, Boden, Wände",
            infoText:
              "Wasser, Strom, Gas anschließen plus Boden und Wände. Meist 1–3 Tage.",
            triggerGewerke: ["kueche", "boden", "maler"],
          },
          {
            value: "waende_boeden",
            label: "Wände & Böden",
            hint: "Ein oder mehrere Räume",
            infoText:
              "Streichen, tapezieren, neuer Boden. Preis hängt stark von Fläche und Materialwahl ab.",
            triggerGewerke: ["maler", "boden"],
          },
          {
            value: "fenster_tueren",
            label: "Fenster oder Türen",
            hint: "Tausch oder Reparatur",
            infoText:
              "Moderne Fenster senken Heizkosten und Lärmbelastung. Preis pro Stück.",
            triggerGewerke: ["fenster"],
          },
        ],
      },
      {
        id: "renovieren_umfang",
        question: "In welchem Umfang soll renoviert werden?",
        subtext:
          "Tippe auf eine Option — wir erklären was das bedeutet.",
        inputType: "tiles-single",
        options: [
          {
            value: "auffrischen",
            label: "Nur auffrischen",
            hint: "Streichen, kleine Reparaturen",
            faktor: 1.0,
            infoText:
              "Kein Abriss, keine neuen Leitungen. Schnellste Variante. Typisch 1–3 Tage.",
          },
          {
            value: "teil",
            label: "Teilrenovierung",
            hint: "Ein Bereich wird komplett erneuert",
            faktor: 1.5,
            infoText:
              "Ein oder zwei Bereiche werden erneuert. Beispiel: neue Fliesen, WC und Waschtisch bleiben. Typisch 3–7 Tage.",
          },
          {
            value: "komplett",
            label: "Komplettrenovierung",
            hint: "Alles kommt raus — alles wird neu",
            faktor: 2.2,
            infoText:
              "Größter Eingriff, größter Wertzuwachs. Typisch 2–4 Wochen. Vor-Ort-Termin zwingend nötig.",
          },
          {
            value: "unsicher",
            label: "Ich bin noch nicht sicher",
            hint: "Wir schauen uns alles vor Ort an",
            faktor: 1.5,
            infoText:
              "Kein Problem — beim kostenlosen Vor-Ort-Termin klären wir gemeinsam was wirklich nötig ist.",
          },
        ],
      },
      {
        id: "renovieren_groesse",
        question: "Wie groß ist die Fläche ungefähr?",
        inputType: "tiles-single",
        options: [
          { value: "s", label: "Bis 50 m²", groesse: 35 },
          { value: "m", label: "50–100 m²", groesse: 75 },
          { value: "l", label: "100–200 m²", groesse: 150 },
          { value: "xl", label: "Über 200 m²", groesse: 250 },
        ],
      },
    ],
  },

  sanieren: {
    steps: [
      {
        id: "sanieren_bereiche",
        question: "Was soll erneuert werden?",
        subtext: "Mehrfachauswahl möglich.",
        inputType: "tiles-multi",
        options: [
          {
            value: "heizung",
            label: "Die Heizung",
            hint: "Komplett tauschen oder modernisieren",
            infoText:
              "Heizungstausch wird mit bis zu 70% durch BAFA und KfW gefördert. Wir helfen beim Förderantrag.",
            triggerGewerke: ["heizung"],
          },
          {
            value: "dach",
            label: "Dach oder Fassade",
            hint: "Sanierung oder Dämmung",
            infoText:
              "Gute Dämmung spart bis zu 30% Heizkosten. Oft förderbar.",
            triggerGewerke: ["dach", "fassade"],
          },
          {
            value: "elektrik",
            label: "Elektrik oder Leitungen",
            hint: "Sicherungskasten, Steckdosen",
            infoText:
              "Alte Elektrik ist ein Sicherheitsrisiko. Nur von Fachbetrieb durchführbar.",
            triggerGewerke: ["elektro"],
          },
          {
            value: "fenster_daemmung",
            label: "Fenster & Dämmung",
            hint: "Energetische Verbesserung",
            infoText:
              "Neue Fenster + Dämmung verbessern Energieausweis und steigern den Immobilienwert.",
            triggerGewerke: ["fenster", "daemmung"],
          },
        ],
      },
      {
        id: "sanieren_umfang",
        question: "Was soll bei der Sanierung passieren?",
        inputType: "tiles-single",
        options: [
          {
            value: "ersetzen",
            label: "Nur austauschen was defekt ist",
            hint: "1:1 Ersatz, kein Umbau",
            faktor: 1.0,
            infoText: "Schnellste Variante. Typisch wenn die Anlage nicht mehr funktioniert.",
          },
          {
            value: "modernisieren",
            label: "Modernisieren & effizienter machen",
            hint: "Neue Technologie, Wärmepumpe",
            faktor: 1.6,
            infoText:
              "Höhere Investition, niedrigere Betriebskosten. Oft durch KfW / BAFA förderbar.",
          },
          {
            value: "komplett",
            label: "Komplettsanierung auf einmal",
            hint: "Alles zusammen — eine Baustelle",
            faktor: 2.5,
            infoText:
              "Teuerste Option aber einmalige Baustelle. Oft langfristig die wirtschaftlichste Lösung.",
          },
          {
            value: "beratung",
            label: "Erstmal beraten lassen",
            hint: "Was lohnt sich wirklich?",
            faktor: 1.6,
            infoText:
              "Wir zeigen was Sinn macht und welche Förderungen verfügbar sind.",
          },
        ],
      },
      {
        id: "sanieren_groesse",
        question: "Wie groß ist die Wohnfläche?",
        inputType: "tiles-single",
        options: [
          { value: "s", label: "Bis 80 m²", groesse: 60 },
          { value: "m", label: "80 bis 150 m²", groesse: 115 },
          { value: "l", label: "150 bis 250 m²", groesse: 200 },
          { value: "xl", label: "Über 250 m²", groesse: 300 },
        ],
      },
    ],
  },

  notfall: {
    skipGroesse: true,
    steps: [
      {
        id: "notfall_problem",
        question: "Was ist das Problem?",
        inputType: "tiles-single",
        options: [
          {
            value: "heizung",
            label: "Heizung oder kein warmes Wasser",
            hint: "Heizung ausgefallen",
            triggerGewerke: ["heizung", "sanitaer"],
          },
          {
            value: "wasser",
            label: "Wasser läuft — Rohr oder Leck",
            hint: "Rohrbruch, Verstopfung, Leck",
            warnText:
              "Bei aktivem Wasseraustritt sofort den Haupthahn schließen.",
            triggerGewerke: ["sanitaer"],
          },
          {
            value: "strom",
            label: "Strom weg oder Elektro defekt",
            hint: "Ausfall, Kurzschluss, defekt",
            triggerGewerke: ["elektro"],
          },
          {
            value: "schaden",
            label: "Feuchtigkeit oder Schimmel",
            hint: "Wasserschaden, Schimmel entdeckt",
            warnText:
              "Schimmel sollte schnell behandelt werden — für die Gesundheit und die Substanz.",
            triggerGewerke: ["sanitaer", "maler"],
          },
        ],
      },
      {
        id: "notfall_dringlichkeit",
        question: "Wie schlimm ist die Situation gerade?",
        inputType: "tiles-single",
        options: [
          {
            value: "akut",
            label: "Es wird aktiv schlimmer",
            hint: "Wasser läuft, Strom weg, Winter",
            faktor: 1.8,
            warnText:
              "Bitte ruf uns direkt an — beim Notfall ist der Rechner zu langsam.",
          },
          {
            value: "stabil",
            label: "Nicht mehr nutzbar aber stabil",
            hint: "Funktioniert nicht, stabil",
            faktor: 1.5,
            infoText: "Termin innerhalb 24–48h.",
          },
          {
            value: "nutzbar",
            label: "Noch nutzbar aber dringend",
            hint: "Nervt, muss diese Woche weg",
            faktor: 1.2,
            infoText: "Termin innerhalb 3–5 Tage.",
          },
          {
            value: "keine_eile",
            label: "Keine Eile",
            hint: "Irgendwann in den nächsten Wochen",
            faktor: 1.0,
            infoText: "Wir planen einen regulären Termin.",
          },
        ],
      },
    ],
  },

  neubauen: {
    steps: [
      {
        id: "neubauen_was",
        question: "Was planst du?",
        subtext: "Mehrfachauswahl möglich.",
        inputType: "tiles-multi",
        options: [
          {
            value: "keller_dg",
            label: "Keller oder DG ausbauen",
            hint: "Wohnraum gewinnen",
            infoText:
              "Dachgeschoss-Ausbau ist oft die günstigste Art Wohnfläche zu gewinnen.",
            triggerGewerke: ["ausbau", "elektro", "sanitaer"],
          },
          {
            value: "anbau",
            label: "Anbau oder Garage",
            hint: "Erweiterung des Hauses",
            triggerGewerke: ["bau", "elektro"],
          },
          {
            value: "terrasse",
            label: "Terrasse oder Carport",
            hint: "Außenbereich gestalten",
            triggerGewerke: ["terrasse", "metall"],
          },
          {
            value: "umbau",
            label: "Innen umbauen",
            hint: "Wände raus oder neu",
            infoText:
              "Tragende Wände nur nach statischer Prüfung entfernen. Wir koordinieren das.",
            triggerGewerke: ["bau", "elektro", "sanitaer"],
          },
        ],
      },
      {
        id: "neubauen_planung",
        question: "Wie weit ist die Planung?",
        inputType: "tiles-single",
        options: [
          {
            value: "idee",
            label: "Nur eine Idee",
            hint: "Noch nichts geplant",
            faktor: 1.2,
            infoText:
              "Kein Problem — wir beraten kostenlos und entwickeln gemeinsam eine Lösung.",
          },
          {
            value: "vorstellung",
            label: "Ich habe eine Vorstellung",
            hint: "Grobe Idee, kein Plan",
            faktor: 1.0,
            infoText: "Beim Vor-Ort-Termin konkretisieren wir gemeinsam.",
          },
          {
            value: "plaene",
            label: "Pläne liegen vor",
            hint: "Skizzen oder Zeichnungen",
            faktor: 0.9,
            infoText: "Perfekt — das beschleunigt die Kalkulation erheblich.",
          },
          {
            value: "bereit",
            label: "Kann sofort losgehen",
            hint: "Alles geklärt, suche Ausführung",
            faktor: 0.85,
            infoText: "Sehr gut — wir können direkt ein konkretes Angebot erstellen.",
          },
        ],
      },
      {
        id: "neubauen_groesse",
        question: "Wie groß wird die neue Fläche?",
        inputType: "tiles-single",
        options: [
          { value: "s", label: "Bis 20 m²", groesse: 15 },
          { value: "m", label: "20 bis 50 m²", groesse: 35 },
          { value: "l", label: "50 bis 100 m²", groesse: 75 },
          { value: "xl", label: "Über 100 m²", groesse: 120 },
        ],
      },
    ],
  },

  betreuung: {
    steps: [
      {
        id: "betreuung_was",
        question: "Worum soll sich jemand kümmern?",
        subtext: "Mehrfachauswahl möglich.",
        inputType: "tiles-multi",
        options: [
          {
            value: "garten",
            label: "Gartenpflege",
            hint: "Mähen, Schneiden, Aufräumen",
            infoText:
              "Regelmäßige Pflege ist günstiger als einmalige Großaktionen.",
            triggerGewerke: ["gartenpflege"],
          },
          {
            value: "gestaltung",
            label: "Gartengestaltung",
            hint: "Neuanlage, Terrasse, Bepflanzung",
            infoText:
              "Professionelle Gestaltung steigert den Immobilienwert nachweislich.",
            triggerGewerke: ["gartengestaltung"],
          },
          {
            value: "baum",
            label: "Baumarbeiten",
            hint: "Fällen oder zurückschneiden",
            infoText:
              "Bäume über 80 cm Stammumfang sind in München genehmigungspflichtig.",
            triggerGewerke: ["baum"],
          },
          {
            value: "winter",
            label: "Winterdienst",
            hint: "Räumen und Streuen",
            warnText:
              "In München streupflichtig ab 7 Uhr werktags. Bei Nichterfüllung persönliche Haftung.",
            triggerGewerke: ["winterdienst"],
          },
          {
            value: "reinigung",
            label: "Gebäudereinigung",
            hint: "Treppenhaus, Gemeinschaftsflächen",
            triggerGewerke: ["reinigung"],
          },
          {
            value: "hausmeister",
            label: "Hausmeisterservice",
            hint: "Alles zusammen — ein Ansprechpartner",
            infoText:
              "Ein Ansprechpartner für alles. Wir kümmern uns um alle Handwerker und sind Ihr fester Ansprechpartner.",
            triggerGewerke: ["gartenpflege", "winterdienst", "reinigung"],
          },
        ],
      },
      {
        id: "betreuung_haeufigkeit",
        question: "Wie oft soll jemand kommen?",
        inputType: "tiles-single",
        options: [
          {
            value: "woechentlich",
            label: "Wöchentlich",
            hint: "Reinigung, intensiver Hausmeister",
            faktor: 0.85,
            infoText: "Günstigster Stückpreis durch hohe Frequenz.",
          },
          {
            value: "zweiwochentlich",
            label: "Alle 2 Wochen",
            hint: "Standard Gartenpflege",
            faktor: 0.9,
            infoText: "Empfehlung für die meisten Gärten April–Oktober.",
          },
          {
            value: "monatlich",
            label: "Monatlich",
            hint: "Kontrollgänge, leichte Pflege",
            faktor: 1.0,
            infoText: "Gut für pflegeleichte Objekte.",
          },
          {
            value: "saisonal",
            label: "Saisonal",
            hint: "Frühjahr und Herbst",
            faktor: 1.1,
            infoText: "Zwei Haupteinsätze pro Jahr.",
          },
          {
            value: "einmalig",
            label: "Einmalig",
            hint: "Nur jetzt dieses eine Mal",
            faktor: 1.3,
            infoText: "Kein Vertrag, kein Abo. Einmaliger Einsatz.",
          },
        ],
      },
    ],
  },
};

/** Aufgelöste Schritte inkl. dynamischem Betreuung-Größen-Schritt */
export function getResolvedStepsForSituation(
  situation: Situation | null,
  bereiche: string[]
): FunnelStep[] {
  if (!situation) return [];
  const cfg = SITUATIONEN_CONFIG[situation];
  if (situation !== "betreuung") return cfg.steps;
  return [
    cfg.steps[0]!,
    cfg.steps[1]!,
    getBetreuungGroesseStep(bereiche),
  ];
}
