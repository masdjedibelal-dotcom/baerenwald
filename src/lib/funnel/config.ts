import {
  getAktiveFachdetailGewerke,
} from "./fachdetails-notfall";
import type {
  FachdetailsState,
  FunnelState,
  FunnelStep,
  Kundentyp,
  Situation,
  StepOption,
} from "./types";

/** Slider + Chips + Direkteingabe (Rechner „Größe“) */
export type GroesseSliderConfig = {
  min: number;
  max: number;
  step: number;
  default: number;
  einheit: string;
  einheitKurz: string;
  chips: { label: string; value: number }[];
};

export const GROESSE_CONFIG: {
  flaeche: GroesseSliderConfig;
  wohnflaeche: GroesseSliderConfig;
  stueck: GroesseSliderConfig;
  garten: GroesseSliderConfig;
  laufmeter: GroesseSliderConfig;
  pauschal: null;
} = {
  flaeche: {
    min: 10,
    max: 200,
    step: 5,
    default: 50,
    einheit: "Fläche in m²",
    einheitKurz: "m²",
    chips: [
      { label: "bis 30 m²", value: 25 },
      { label: "30–60 m²", value: 45 },
      { label: "60–100 m²", value: 80 },
      { label: "100–150 m²", value: 125 },
      { label: "über 150 m²", value: 175 },
    ],
  },
  wohnflaeche: {
    min: 20,
    max: 300,
    step: 10,
    default: 80,
    einheit: "Wohnfläche in m²",
    einheitKurz: "m²",
    chips: [
      { label: "bis 50 m²", value: 40 },
      { label: "50–80 m²", value: 65 },
      { label: "80–120 m²", value: 100 },
      { label: "120–200 m²", value: 160 },
      { label: "über 200 m²", value: 230 },
    ],
  },
  stueck: {
    min: 1,
    max: 20,
    step: 1,
    default: 3,
    einheit: "Anzahl Stück",
    einheitKurz: "Stück",
    chips: [
      { label: "1 Stück", value: 1 },
      { label: "2–3 Stück", value: 2 },
      { label: "4–6 Stück", value: 5 },
      { label: "7–10 Stück", value: 8 },
      { label: "über 10", value: 12 },
    ],
  },
  garten: {
    min: 20,
    max: 1000,
    step: 10,
    default: 150,
    einheit: "Gartenfläche in m²",
    einheitKurz: "m²",
    chips: [
      { label: "bis 50 m²", value: 35 },
      { label: "50–150 m²", value: 100 },
      { label: "150–300 m²", value: 225 },
      { label: "300–600 m²", value: 450 },
      { label: "über 600 m²", value: 700 },
    ],
  },
  laufmeter: {
    min: 5,
    max: 80,
    step: 5,
    default: 18,
    einheit: "Gehweglänge in m",
    einheitKurz: "m",
    chips: [
      { label: "Bis 10 m", value: 7 },
      { label: "10–25 m", value: 18 },
      { label: "über 25 m", value: 35 },
    ],
  },
  pauschal: null,
};

export function groesseEinheitFromConfig(
  c: GroesseSliderConfig
): "qm" | "stueck" | "meter" {
  if (c.einheitKurz === "Stück") return "stueck";
  if (c.einheitKurz === "m" && !c.einheit.includes("m²")) return "meter";
  return "qm";
}

export function getGroesseConfig(
  state: Pick<FunnelState, "situation" | "bereiche">
): GroesseSliderConfig | null {
  const { situation, bereiche } = state;
  const b = bereiche;

  if (situation === "notfall") {
    return GROESSE_CONFIG.pauschal;
  }

  const fensterLike =
    b.includes("fenster_tueren") ||
    b.includes("fenster_daemmung") ||
    b.includes("fenster") ||
    b.includes("tueren");
  if (fensterLike) {
    return GROESSE_CONFIG.stueck;
  }

  if (
    situation === "betreuung" &&
    (b.includes("garten") || b.includes("gestaltung"))
  ) {
    return GROESSE_CONFIG.garten;
  }

  if (situation === "betreuung" && b.includes("winter")) {
    return GROESSE_CONFIG.laufmeter;
  }

  if (situation === "betreuung" && b.includes("baum")) {
    return GROESSE_CONFIG.stueck;
  }

  if (b.includes("bad") || b.includes("heizung")) {
    return GROESSE_CONFIG.wohnflaeche;
  }

  return GROESSE_CONFIG.flaeche;
}

function kundentypOption(
  value: Kundentyp,
  label: string,
  hint: string,
  infoText?: string,
  warnText?: string
): StepOption {
  return { value, label, hint, infoText, warnText };
}

/** Optionen für den Schritt „Kundentyp“ — abhängig von der Situation */
export function getKundentypOptions(situation: Situation): StepOption[] {
  switch (situation) {
    case "renovieren":
    case "sanieren":
      return [
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
      ];
    case "notfall":
      return [
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
      ];
    case "neubauen":
      return [
        kundentypOption(
          "eigentuemer",
          "Ich bin Eigentümer",
          "Eigentumswohnung oder Haus"
        ),
      ];
    case "betreuung":
      return [
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
      ];
    case "gewerbe":
    case "gastro":
      return [];
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
  { steps: FunnelStep[]; skipGroesse?: boolean; skipUmfang?: boolean }
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
  gewerbe: {
    skipGroesse: true,
    skipUmfang: true,
    steps: [
      {
        id: "gew_beschreibung",
        question: "Was soll gemacht werden?",
        subtext:
          "Kurz beschreiben reicht — wir melden uns persönlich.",
        inputType: "tiles-single",
        options: [
          {
            value: "umbau",
            label: "Umbau oder Renovierung",
            hint: "Büro, Laden, Praxis umbauen",
          },
          {
            value: "neubau",
            label: "Neu einrichten",
            hint: "Komplette Neugestaltung",
          },
          {
            value: "wartung",
            label: "Wartung & Service",
            hint: "Regelmäßige Betreuung",
          },
          {
            value: "sonstiges",
            label: "Sonstiges",
            hint: "Anderes Vorhaben",
          },
        ],
      },
    ],
  },
  gastro: {
    skipGroesse: true,
    skipUmfang: true,
    steps: [
      {
        id: "gas_beschreibung",
        question: "Was planst du?",
        subtext:
          "Gastro-Projekte sind komplex — wir besprechen alles persönlich.",
        inputType: "tiles-single",
        options: [
          {
            value: "umbau",
            label: "Umbau oder Renovierung",
            hint: "Gastraum, Küche, Bar",
          },
          {
            value: "neueroeffnung",
            label: "Neueröffnung",
            hint: "Kompletter Ausbau",
          },
          {
            value: "wartung",
            label: "Wartung & Reparatur",
            hint: "Laufende Instandhaltung",
          },
          {
            value: "terrasse",
            label: "Terrasse oder Außenbereich",
            hint: "Außengastronomie ausbauen",
          },
        ],
      },
    ],
  },
};

/** Relevante Bereiche für den Schritt „Fachdetails“ (nach Bereiche, vor Kundentyp) */
export function bereicheNeedFachdetails(bereiche: string[]): boolean {
  const s = new Set(bereiche);
  return (
    s.has("strom") ||
    s.has("elektrik") ||
    s.has("elektro") ||
    s.has("bad") ||
    s.has("wasser") ||
    s.has("sanitaer") ||
    s.has("heizung") ||
    s.has("maler") ||
    s.has("streichen") ||
    s.has("waende_boeden") ||
    s.has("boden") ||
    s.has("dach") ||
    s.has("garten") ||
    s.has("gestaltung") ||
    s.has("baum") ||
    s.has("baumarbeiten")
  );
}

/** Dynamische Detailfragen je Gewerk */
export const BW_FUNNEL_STEP_FACHDETAILS: FunnelStep = {
  id: "fachdetails",
  question: "Ein paar Detailfragen",
  subtext:
    "Folgefragen sind optional — mit „Weiß ich nicht“ kommst du auch weiter.",
  inputType: "fachdetails",
};

/** Weiter nur wenn je sichtbarem Block (max. 2) die Hauptfrage beantwortet ist */
export function isFachdetailsStepComplete(state: {
  situation: Situation | null;
  bereiche: string[];
  fachdetails: FachdetailsState;
}): boolean {
  if (!bereicheNeedFachdetails(state.bereiche)) return true;
  const b = state.bereiche;
  const fd = state.fachdetails;
  const notfall = state.situation === "notfall";
  const active = getAktiveFachdetailGewerke(b, 2);

  for (const g of active) {
    switch (g) {
      case "elektro":
        if (!fd.elektro?.problem) return false;
        break;
      case "sanitaer":
        if (notfall) {
          if (!fd.sanitaer?.notfallSchwere) return false;
        } else {
          if (!fd.sanitaer?.lage) return false;
          if (b.includes("bad") && !fd.sanitaer?.badWas) return false;
        }
        break;
      case "heizung":
        if (!fd.heizung?.typ) return false;
        break;
      case "maler":
        if (!fd.maler?.was) return false;
        break;
      case "boden":
        if (!fd.boden?.aktuell) return false;
        break;
      case "dach":
        if (!fd.dach?.vorhaben) return false;
        break;
      case "garten":
        if (!fd.garten?.was) return false;
        break;
      default:
        break;
    }
  }
  return true;
}

/** Nach Umfang/Planung — für Preisfaktor Zugänglichkeit (renovieren / sanieren / neubauen) */
export const BW_FUNNEL_STEP_ZUGAENGLICHKEIT: FunnelStep = {
  id: "zugaenglichkeit",
  question: "Wie gut ist das Objekt erreichbar?",
  inputType: "tiles-single",
  options: [
    {
      value: "einfach",
      label: "Normal erreichbar",
      hint: "Erdgeschoss oder Lift vorhanden",
      faktor: 1.0,
    },
    {
      value: "mittel",
      label: "Etwas schwierig",
      hint: "Hohes Stockwerk, enger Aufgang",
      faktor: 1.3,
    },
    {
      value: "schwer",
      label: "Schwer erreichbar",
      hint: "Dachgeschoss, Keller, enge Zufahrt",
      faktor: 1.6,
    },
  ],
};

/** Nach Zugänglichkeit — nur renovieren / sanieren (Preisfaktor Zustand) */
export const BW_FUNNEL_STEP_ZUSTAND: FunnelStep = {
  id: "zustand",
  question: "Wie ist der aktuelle Zustand?",
  inputType: "tiles-single",
  options: [
    {
      value: "gut",
      label: "Gut — nur optisch veraltet",
      hint: "Alles funktioniert, sieht alt aus",
      faktor: 1.0,
    },
    {
      value: "mittel",
      label: "Mittel — kleinere Schäden",
      hint: "Risse, kleine Schäden, abgenutzt",
      faktor: 1.4,
    },
    {
      value: "schlecht",
      label: "Schlecht — größere Schäden",
      hint: "Schimmel, starke Schäden, alles muss raus",
      faktor: 2.0,
    },
  ],
};

function insertBeforeGroesse(
  steps: FunnelStep[],
  toInsert: FunnelStep[]
): FunnelStep[] {
  const gIdx = steps.findIndex((s) =>
    s.id.toLowerCase().includes("groesse")
  );
  if (gIdx < 0) return steps;
  const next = [...steps];
  next.splice(gIdx, 0, ...toInsert);
  return next;
}

/** Aufgelöste Schritte inkl. dynamischem Betreuung-Größen-Schritt */
export function getResolvedStepsForSituation(
  situation: Situation | null,
  bereiche: string[]
): FunnelStep[] {
  if (!situation) return [];
  const cfg = SITUATIONEN_CONFIG[situation];

  if (situation === "betreuung") {
    const stepsBetreuung: FunnelStep[] = [cfg.steps[0]!];
    if (bereicheNeedFachdetails(bereiche)) {
      stepsBetreuung.push(BW_FUNNEL_STEP_FACHDETAILS);
    }
    stepsBetreuung.push(cfg.steps[1]!, getBetreuungGroesseStep(bereiche));
    return stepsBetreuung;
  }

  let steps = [...cfg.steps];

  if (situation === "renovieren" || situation === "sanieren") {
    steps = insertBeforeGroesse(steps, [
      BW_FUNNEL_STEP_ZUGAENGLICHKEIT,
      BW_FUNNEL_STEP_ZUSTAND,
    ]);
  } else if (situation === "neubauen") {
    steps = insertBeforeGroesse(steps, [BW_FUNNEL_STEP_ZUGAENGLICHKEIT]);
  }

  if (bereicheNeedFachdetails(bereiche)) {
    steps.splice(1, 0, BW_FUNNEL_STEP_FACHDETAILS);
  }

  return steps;
}
