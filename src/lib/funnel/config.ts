import { isFachdetailGewerkChainComplete } from "./fachdetails-chain-complete";
import { getAktiveFachdetailGewerke } from "./fachdetails-notfall";
import {
  shouldSwapFachdetailsBeforeGroesse,
  skipGroesseForSanierenDachKleinjob,
} from "./dach-step-order";
import type {
  FachdetailsState,
  FunnelState,
  FunnelStep,
  Kundentyp,
  Situation,
  StepOption,
} from "./types";

export { shouldSwapFachdetailsBeforeGroesse, skipGroesseForSanierenDachKleinjob };

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
  emoji: string,
  infoText?: string,
  warnText?: string
): StepOption {
  return { value, label, hint, emoji, infoText, warnText };
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
          "Eigentumswohnung oder Haus",
          "🏠"
        ),
        kundentypOption(
          "mieter",
          "Ich bin Mieter",
          "Mietwohnung oder gemietetes Haus",
          "🔑",
          "Bei Mietwohnungen brauchen wir in manchen Fällen die Zustimmung des Vermieters. Wir klären das gemeinsam beim Termin."
        ),
      ];
    case "notfall":
      return [
        kundentypOption(
          "eigentuemer",
          "Ich bin Eigentümer",
          "Eigentumswohnung oder Haus",
          "🏠"
        ),
        kundentypOption(
          "mieter",
          "Ich bin Mieter",
          "Mietwohnung oder gemietetes Haus",
          "🔑",
          "Bei Notfällen in Mietwohnungen gilt: Haupthahn schließen, dann Vermieter informieren. Wir kommen sofort."
        ),
        kundentypOption(
          "hausverwaltung",
          "Hausverwaltung",
          "Ich verwalte das Objekt",
          "🏢"
        ),
      ];
    case "neubauen":
      return [
        kundentypOption(
          "eigentuemer",
          "Ich bin Eigentümer",
          "Eigentumswohnung oder Haus",
          "🏠"
        ),
      ];
    case "betreuung":
      return [
        kundentypOption(
          "eigentuemer",
          "Ich bin Eigentümer",
          "Eigentumswohnung oder Haus",
          "🏠"
        ),
        kundentypOption(
          "hausverwaltung",
          "Hausverwaltung",
          "Mehrfamilienhaus oder Wohnanlage",
          "🏢",
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
    question: "Für wen ist das Projekt?",
    subtext: "Das hilft uns bei Planung und Abstimmung",
    inputType: "tiles-single",
    options: getKundentypOptions(situation),
  };
}

/** Schritt „Größe“ für Betreuung — Optionen abhängig von gewählten Bereichen */
export function getBetreuungGroesseOptions(bereiche: string[]): StepOption[] {
  if (bereiche.includes("garten")) {
    return [
      { value: "s", label: "Bis 100 m²", groesse: 70, emoji: "📐" },
      { value: "m", label: "100–300 m²", groesse: 200, emoji: "📐" },
      { value: "l", label: "300–600 m²", groesse: 450, emoji: "📐" },
      { value: "xl", label: "Über 600 m²", groesse: 800, emoji: "📐" },
    ];
  }
  if (bereiche.includes("baum")) {
    return [
      { value: "ein", label: "1 Baum", groesse: 1, emoji: "🌲" },
      { value: "wenige", label: "2–4 Bäume", groesse: 3, emoji: "🌲" },
      { value: "viele", label: "5 oder mehr", groesse: 6, emoji: "🌲" },
    ];
  }
  if (bereiche.includes("reinigung")) {
    return [
      { value: "s", label: "Bis 60 m²", groesse: 45, emoji: "📐" },
      { value: "m", label: "60–120 m²", groesse: 90, emoji: "📐" },
      { value: "l", label: "Über 120 m²", groesse: 160, emoji: "📐" },
    ];
  }
  if (bereiche.includes("winter")) {
    return [
      { value: "kurz", label: "Bis 10 m Gehweg", groesse: 7, emoji: "❄️" },
      { value: "mittel", label: "10–25 m", groesse: 18, emoji: "❄️" },
      { value: "lang", label: "Über 25 m", groesse: 35, emoji: "❄️" },
    ];
  }
  return [
    { value: "s", label: "Kleine Wohnung / ETW", groesse: 55, emoji: "📐" },
    { value: "m", label: "Reihenhaus / DHH", groesse: 120, emoji: "📐" },
    { value: "l", label: "Einfamilienhaus", groesse: 180, emoji: "📐" },
    { value: "xl", label: "Mehrfamilienhaus", groesse: 400, emoji: "📐" },
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
        question: "Was soll gemacht werden?",
        subtext: "Wähle die Bereiche aus, die betroffen sind.",
        inputType: "tiles-multi",
        options: [
          {
            value: "bad",
            label: "Das Bad",
            hint: "Wasser & Heizung, Fliesen, Lüftung",
            emoji: "🚿",
            infoText:
              "Komplettes Bad: Fliesen, WC, Dusche und Waschtisch, ggf. Lüftung. Größter Eingriff aber auch größter Wertzuwachs.",
            triggerGewerke: ["bad", "fliesen", "sanitaer"],
          },
          {
            value: "kueche",
            label: "Die Küche",
            hint: "Anschlüsse, Boden, Wände",
            emoji: "🍳",
            infoText:
              "Wasser, Strom, Gas anschließen plus Boden und Wände. Meist 1–3 Tage.",
            triggerGewerke: ["kueche", "boden", "maler"],
          },
          {
            value: "waende_boeden",
            label: "Wände & Böden",
            hint: "Ein oder mehrere Räume",
            emoji: "🖌️",
            infoText:
              "Streichen, tapezieren, neuer Boden. Preis hängt stark von Fläche und Materialwahl ab.",
            triggerGewerke: ["maler", "boden"],
          },
          {
            value: "fenster_tueren",
            label: "Fenster oder Türen",
            hint: "Tausch oder Reparatur",
            emoji: "🪟",
            infoText:
              "Moderne Fenster senken Heizkosten und Lärmbelastung. Preis pro Stück.",
            triggerGewerke: ["fenster"],
          },
          {
            value: "feuchtigkeit_schimmel",
            label: "Feuchtigkeit oder Schimmel",
            hint: "Wasserflecken, muffiger Geruch, sichtbarer Befall",
            emoji: "🍄",
            infoText:
              "Sanierung und Ursachenklärung planen wir mit Maler- und Sanitärgewerk — in Ruhe und ohne Druck.",
            triggerGewerke: ["maler", "sanitaer"],
          },
        ],
      },
      {
        id: "renovieren_umfang",
        question: "In welchem Umfang soll das Projekt umgesetzt werden?",
        inputType: "tiles-single",
        options: [
          {
            value: "auffrischen",
            label: "Kleines Auffrischen",
            hint: "Nur einzelne Bereiche oder optische Verbesserungen",
            emoji: "✨",
            faktor: 1.0,
            infoText:
              "Kein Abriss, keine neuen Leitungen. Schnellste Variante. Typisch 1–3 Tage.",
          },
          {
            value: "teil",
            label: "Teilrenovierung",
            hint: "Mehrere Bereiche werden überarbeitet",
            emoji: "🔨",
            faktor: 1.5,
            infoText:
              "Ein oder zwei Bereiche werden erneuert. Beispiel: neue Fliesen, WC und Waschtisch bleiben. Typisch 3–7 Tage.",
          },
          {
            value: "komplett",
            label: "Komplettrenovierung",
            hint: "Alles wird neu gemacht",
            emoji: "🏗️",
            faktor: 2.2,
            infoText:
              "Größter Eingriff, größter Wertzuwachs. Typisch 2–4 Wochen. Vor-Ort-Termin zwingend nötig.",
          },
          {
            value: "unsicher",
            label: "Noch nicht sicher",
            hint: "Wir beraten dich beim Termin",
            emoji: "💭",
            faktor: 1.1,
            infoText:
              "Kein Problem — wir rechnen mit einem Durchschnittswert. Beim Vor-Ort-Termin klären wir gemeinsam, was wirklich nötig ist.",
          },
        ],
      },
      {
        id: "renovieren_groesse",
        question: "Wie groß ist die Fläche ungefähr?",
        inputType: "tiles-single",
        options: [
          { value: "s", label: "Bis 50 m²", groesse: 35, emoji: "📐" },
          { value: "m", label: "50–100 m²", groesse: 75, emoji: "📐" },
          { value: "l", label: "100–200 m²", groesse: 150, emoji: "📐" },
          { value: "xl", label: "Über 200 m²", groesse: 250, emoji: "📐" },
        ],
      },
    ],
  },

  sanieren: {
    steps: [
      {
        id: "sanieren_bereiche",
        question: "Was soll gemacht werden?",
        subtext: "Wähle die Bereiche aus, die betroffen sind.",
        inputType: "tiles-multi",
        options: [
          {
            value: "heizung",
            label: "Die Heizung",
            hint: "Komplett tauschen oder modernisieren",
            emoji: "🔥",
            infoText:
              "Heizungstausch wird mit bis zu 70% durch BAFA und KfW gefördert. Wir helfen beim Förderantrag.",
            triggerGewerke: ["heizung"],
          },
          {
            value: "dach",
            label: "Dach oder Fassade",
            hint: "Sanierung oder Dämmung",
            emoji: "🏠",
            infoText:
              "Gute Dämmung spart bis zu 30% Heizkosten. Oft förderbar.",
            triggerGewerke: ["dach", "fassade"],
          },
          {
            value: "elektrik",
            label: "Elektrik oder Leitungen",
            hint: "Sicherungskasten, Steckdosen",
            emoji: "⚡",
            infoText:
              "Alte Elektrik ist ein Sicherheitsrisiko. Nur von Fachbetrieb durchführbar.",
            triggerGewerke: ["elektro"],
          },
          {
            value: "fenster_daemmung",
            label: "Fenster & Dämmung",
            hint: "Energetische Verbesserung",
            emoji: "🧱",
            infoText:
              "Neue Fenster + Dämmung verbessern Energieausweis und steigern den Immobilienwert.",
            triggerGewerke: ["fenster", "daemmung"],
          },
          {
            value: "feuchtigkeit_schimmel",
            label: "Feuchtigkeit oder Schimmel",
            hint: "Wasserflecken, muffiger Geruch, sichtbarer Befall",
            emoji: "🍄",
            infoText:
              "Ursache klären, Schimmel fachgerecht entfernen und Flächen wiederherstellen — wir koordinieren Sanitär und Maler.",
            triggerGewerke: ["sanitaer", "maler"],
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
            emoji: "🔧",
            faktor: 1.0,
            infoText: "Schnellste Variante. Typisch wenn die Anlage nicht mehr funktioniert.",
          },
          {
            value: "modernisieren",
            label: "Modernisieren & effizienter machen",
            hint: "Neue Technologie, Wärmepumpe",
            emoji: "✨",
            faktor: 1.6,
            infoText:
              "Höhere Investition, niedrigere Betriebskosten. Oft durch KfW / BAFA förderbar.",
          },
          {
            value: "komplett",
            label: "Komplettsanierung auf einmal",
            hint: "Alles zusammen — eine Baustelle",
            emoji: "🏗️",
            faktor: 2.5,
            infoText:
              "Teuerste Option aber einmalige Baustelle. Oft langfristig die wirtschaftlichste Lösung.",
          },
          {
            value: "beratung",
            label: "Erstmal beraten lassen",
            hint: "Was lohnt sich wirklich?",
            emoji: "💬",
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
          { value: "s", label: "Bis 80 m²", groesse: 60, emoji: "📐" },
          { value: "m", label: "80 bis 150 m²", groesse: 115, emoji: "📐" },
          { value: "l", label: "150 bis 250 m²", groesse: 200, emoji: "📐" },
          { value: "xl", label: "Über 250 m²", groesse: 300, emoji: "📐" },
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
            emoji: "🔥",
            triggerGewerke: ["heizung", "sanitaer"],
          },
          {
            value: "wasser",
            label: "Wasser läuft — Rohr oder Leck",
            hint: "Rohrbruch, Verstopfung, Leck",
            emoji: "💧",
            warnText:
              "Bei aktivem Wasseraustritt sofort den Haupthahn schließen.",
            triggerGewerke: ["sanitaer"],
          },
          {
            value: "strom",
            label: "Strom weg oder Elektro defekt",
            hint: "Ausfall, Kurzschluss, defekt",
            emoji: "⚡",
            triggerGewerke: ["elektro"],
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
            label: "Akuter Notfall",
            hint: "Wird schlimmer oder akut gefährlich",
            emoji: "🚨",
            faktor: 1.8,
            warnText:
              "Bitte ruf uns direkt an — beim Notfall ist der Rechner zu langsam.",
          },
          {
            value: "stabil",
            label: "Ausgefallen aber stabil",
            hint: "Geht nicht, aber nichts wird schlimmer",
            emoji: "⚠️",
            faktor: 1.5,
            infoText: "Termin innerhalb 24–48h.",
          },
          {
            value: "nutzbar",
            label: "Eingeschränkt nutzbar",
            hint: "Noch nutzbar, sollte bald weg",
            emoji: "⏱️",
            faktor: 1.2,
            infoText: "Termin innerhalb 3–5 Tage.",
          },
          {
            value: "keine_eile",
            label: "Kein akuter Notfall",
            hint: "Kann mit normalem Termin laufen",
            emoji: "📅",
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
            label: "Keller oder Dachgeschoss ausbauen",
            hint: "Wohnraum gewinnen",
            emoji: "🏗️",
            infoText:
              "Dachgeschoss-Ausbau ist oft die günstigste Art Wohnfläche zu gewinnen.",
            triggerGewerke: ["ausbau", "elektro", "sanitaer"],
          },
          {
            value: "anbau",
            label: "Anbau oder Garage",
            hint: "Erweiterung des Hauses",
            emoji: "🔨",
            triggerGewerke: ["bau", "elektro"],
          },
          {
            value: "terrasse",
            label: "Terrasse oder Carport",
            hint: "Außenbereich gestalten",
            emoji: "🪵",
            triggerGewerke: ["terrasse", "metall"],
          },
          {
            value: "umbau",
            label: "Innen umbauen",
            hint: "Wände raus oder neu",
            emoji: "📐",
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
            emoji: "💡",
            faktor: 1.2,
            infoText:
              "Kein Problem — wir beraten kostenlos und entwickeln gemeinsam eine Lösung.",
          },
          {
            value: "vorstellung",
            label: "Ich habe eine Vorstellung",
            hint: "Grobe Idee, kein Plan",
            emoji: "📋",
            faktor: 1.0,
            infoText: "Beim Vor-Ort-Termin konkretisieren wir gemeinsam.",
          },
          {
            value: "plaene",
            label: "Pläne liegen vor",
            hint: "Skizzen oder Zeichnungen",
            emoji: "📐",
            faktor: 0.9,
            infoText: "Perfekt — das beschleunigt die Kalkulation erheblich.",
          },
          {
            value: "bereit",
            label: "Kann sofort losgehen",
            hint: "Alles geklärt, suche Ausführung",
            emoji: "🚀",
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
          { value: "s", label: "Bis 20 m²", groesse: 15, emoji: "📐" },
          { value: "m", label: "20 bis 50 m²", groesse: 35, emoji: "📐" },
          { value: "l", label: "50 bis 100 m²", groesse: 75, emoji: "📐" },
          { value: "xl", label: "Über 100 m²", groesse: 120, emoji: "📐" },
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
            emoji: "🌿",
            infoText:
              "Regelmäßige Pflege ist günstiger als einmalige Großaktionen.",
            triggerGewerke: ["gartenpflege"],
          },
          {
            value: "gestaltung",
            label: "Gartengestaltung",
            hint: "Neuanlage, Terrasse, Bepflanzung",
            emoji: "🌳",
            infoText:
              "Professionelle Gestaltung steigert den Immobilienwert nachweislich.",
            triggerGewerke: ["gartengestaltung"],
          },
          {
            value: "baum",
            label: "Baumarbeiten",
            hint: "Fällen oder zurückschneiden",
            emoji: "🌲",
            infoText:
              "Bäume über 80 cm Stammumfang sind in München genehmigungspflichtig.",
            triggerGewerke: ["baum"],
          },
          {
            value: "winter",
            label: "Winterdienst",
            hint: "Räumen und Streuen",
            emoji: "❄️",
            warnText:
              "In München streupflichtig ab 7 Uhr werktags. Bei Nichterfüllung persönliche Haftung.",
            triggerGewerke: ["winterdienst"],
          },
          {
            value: "reinigung",
            label: "Gebäudereinigung",
            hint: "Treppenhaus, Gemeinschaftsflächen",
            emoji: "🧹",
            triggerGewerke: ["reinigung"],
          },
          {
            value: "hausmeister",
            label: "Hausmeisterservice",
            hint: "Alles zusammen — ein Ansprechpartner",
            emoji: "🔑",
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
            emoji: "📆",
            faktor: 0.85,
            infoText: "Günstigster Stückpreis durch hohe Frequenz.",
          },
          {
            value: "zweiwochentlich",
            label: "Alle 2 Wochen",
            hint: "Standard Gartenpflege",
            emoji: "📅",
            faktor: 0.9,
            infoText: "Empfehlung für die meisten Gärten April–Oktober.",
          },
          {
            value: "monatlich",
            label: "Monatlich",
            hint: "Kontrollgänge, leichte Pflege",
            emoji: "🗓️",
            faktor: 1.0,
            infoText: "Gut für pflegeleichte Objekte.",
          },
          {
            value: "saisonal",
            label: "Saisonal",
            hint: "Frühjahr und Herbst",
            emoji: "🍂",
            faktor: 1.1,
            infoText: "Zwei Haupteinsätze pro Jahr.",
          },
          {
            value: "einmalig",
            label: "Einmalig",
            hint: "Nur jetzt dieses eine Mal",
            emoji: "📌",
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
            emoji: "🏢",
          },
          {
            value: "neubau",
            label: "Neu einrichten",
            hint: "Komplette Neugestaltung",
            emoji: "✨",
          },
          {
            value: "wartung",
            label: "Wartung & Service",
            hint: "Regelmäßige Betreuung",
            emoji: "🔧",
          },
          {
            value: "sonstiges",
            label: "Sonstiges",
            hint: "Anderes Vorhaben",
            emoji: "💬",
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
            emoji: "🍽️",
          },
          {
            value: "neueroeffnung",
            label: "Neueröffnung",
            hint: "Kompletter Ausbau",
            emoji: "🎉",
          },
          {
            value: "wartung",
            label: "Wartung & Reparatur",
            hint: "Laufende Instandhaltung",
            emoji: "🔧",
          },
          {
            value: "terrasse",
            label: "Terrasse oder Außenbereich",
            hint: "Außengastronomie ausbauen",
            emoji: "🪵",
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
    s.has("baumarbeiten") ||
    s.has("feuchtigkeit_schimmel")
  );
}

/** Dynamische Detailfragen je Gewerk */
export const BW_FUNNEL_STEP_FACHDETAILS: FunnelStep = {
  id: "fachdetails",
  question: "Fachdetails",
  subtext:
    "Pro sichtbarem Gewerk nacheinander beantworten — Folgefragen erscheinen erst nach der jeweiligen Antwort; „Weiß ich nicht“ ist möglich.",
  inputType: "fachdetails",
};

/** Weiter nur wenn je sichtbarem Block (max. 2) die gestaffelten Fragen vollständig beantwortet sind */
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
    if (!isFachdetailGewerkChainComplete(b, notfall, fd, g)) return false;
  }
  return true;
}

/** Kurz-Hinweis unter Zugänglichkeit + Zustand (Rechner) */
export const BW_FUNNEL_PREIS_HINWEIS_ZUG_ZUSTAND =
  "Diese Angabe hilft uns, den Preis genauer einzuschätzen.";

/** Nach Umfang/Planung — für Preisfaktor Zugänglichkeit (renovieren / sanieren / neubauen) */
export const BW_FUNNEL_STEP_ZUGAENGLICHKEIT: FunnelStep = {
  id: "zugaenglichkeit",
  question: "Wie einfach kommen wir an die Baustelle?",
  inputType: "tiles-single",
  options: [
    {
      value: "einfach",
      label: "Einfach erreichbar",
      hint: "Erdgeschoss oder mit Aufzug",
      faktor: 1.0,
    },
    {
      value: "mittel",
      label: "Etwas aufwendiger",
      hint: "Ohne Aufzug oder längere Wege",
      faktor: 1.3,
    },
    {
      value: "schwer",
      label: "Schwer zugänglich",
      hint: "Altbau, eng oder schwierig erreichbar",
      faktor: 1.6,
    },
    {
      value: "unknown",
      label: "Weiß ich nicht",
      hint: "Kein Problem — wir berücksichtigen das beim Termin",
      faktor: 1.1,
    },
  ],
};

/** Nach Zugänglichkeit — nur renovieren / sanieren (Preisfaktor Zustand) */
export const BW_FUNNEL_STEP_ZUSTAND: FunnelStep = {
  id: "zustand",
  question: "Wie ist der Zustand der Räume?",
  inputType: "tiles-single",
  options: [
    {
      value: "gut",
      label: "Gepflegt",
      hint: "Alles funktioniert, nur optisch verbessern",
      faktor: 1.0,
    },
    {
      value: "mittel",
      label: "Normale Abnutzung",
      hint: "Böden oder Wände älter, kleinere Schäden",
      faktor: 1.4,
    },
    {
      value: "schlecht",
      label: "Sanierungsbedürftig",
      hint: "Mehrere Dinge müssen erneuert werden",
      faktor: 2.0,
    },
    {
      value: "unknown",
      label: "Weiß ich nicht",
      hint: "Kein Problem — wir rechnen mit einem Durchschnittswert",
      faktor: 1.1,
    },
  ],
};

/** Dynamische Zustands-Frage je nach gewählten Bereichen */
export function getZustandQuestionForBereiche(bereiche: string[]): string {
  const b = new Set(bereiche);
  if (b.has("bad")) return "Wie ist der Zustand vom Bad?";
  if (b.has("heizung") || b.has("sanitaer") || b.has("wasser")) {
    return "Wie ist der Zustand der Anlage?";
  }
  if (b.has("elektro") || b.has("strom") || b.has("elektrik")) {
    return "Wie alt wirkt die Elektrik?";
  }
  if (b.has("boden") || b.has("waende_boeden")) {
    return "Wie ist der Zustand vom Boden?";
  }
  return "Wie ist der Zustand der Räume?";
}

/** @see getZustandQuestionForBereiche — API mit State-Schnittstelle */
export function getZustandLabel(
  state: Pick<FunnelState, "bereiche">
): string {
  return getZustandQuestionForBereiche(state.bereiche);
}

/** Zugänglichkeit: nur renovieren / sanieren / neubauen; nicht bei Mini-Jobs (ein Bereich ohne großen Umfang). */
export function shouldIncludeZugaenglichkeitStep(
  situation: Situation,
  umfang: string | null,
  bereiche: string[]
): boolean {
  if (!["renovieren", "sanieren", "neubauen"].includes(situation)) return false;
  if (!umfang) return false;
  if (situation === "neubauen") return true;
  if (bereiche.length === 1 && umfang !== "komplett") return false;
  return true;
}

/** Zustand: renovieren & sanieren immer (wenn Schritt eingebunden); neubauen nur bei Bestand (Keller/DG, Umbau, Anbau). */
export function shouldIncludeZustandStep(
  situation: Situation,
  bereiche: string[]
): boolean {
  if (situation === "renovieren" || situation === "sanieren") return true;
  if (situation === "neubauen") {
    const b = new Set(bereiche);
    return b.has("ausbau") || b.has("bau");
  }
  return false;
}

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
  bereiche: string[],
  fachdetails?: FachdetailsState,
  umfang: string | null = null
): FunnelStep[] {
  if (!situation) return [];
  const cfg = SITUATIONEN_CONFIG[situation];

  if (situation === "betreuung") {
    const stepsBetreuung: FunnelStep[] = [
      cfg.steps[0]!,
      cfg.steps[1]!,
      getBetreuungGroesseStep(bereiche),
    ];
    if (bereicheNeedFachdetails(bereiche)) {
      stepsBetreuung.push(BW_FUNNEL_STEP_FACHDETAILS);
    }
    return stepsBetreuung;
  }

  let steps = [...cfg.steps];

  const zugZustandSteps: FunnelStep[] = [];
  if (
    situation === "renovieren" ||
    situation === "sanieren" ||
    situation === "neubauen"
  ) {
    if (shouldIncludeZugaenglichkeitStep(situation, umfang, bereiche)) {
      zugZustandSteps.push(BW_FUNNEL_STEP_ZUGAENGLICHKEIT);
    }
    if (shouldIncludeZustandStep(situation, bereiche)) {
      zugZustandSteps.push({
        ...BW_FUNNEL_STEP_ZUSTAND,
        question: getZustandLabel({ bereiche }),
      });
    }
    if (zugZustandSteps.length > 0) {
      steps = insertBeforeGroesse(steps, zugZustandSteps);
    }
  }

  if (bereicheNeedFachdetails(bereiche)) {
    const gIdx = steps.findIndex((s) => s.id.toLowerCase().includes("groesse"));
    if (gIdx >= 0) {
      steps = [...steps];
      steps.splice(gIdx + 1, 0, BW_FUNNEL_STEP_FACHDETAILS);
    } else {
      steps = [...steps, BW_FUNNEL_STEP_FACHDETAILS];
    }
  }

  if (shouldSwapFachdetailsBeforeGroesse(situation, bereiche)) {
    const gIdx = steps.findIndex((s) => s.id.toLowerCase().includes("groesse"));
    const fIdx = steps.findIndex((s) => s.id === "fachdetails");
    if (gIdx >= 0 && fIdx >= 0 && fIdx > gIdx) {
      const next = [...steps];
      const [fachStep] = next.splice(fIdx, 1);
      next.splice(gIdx, 0, fachStep);
      steps = next;
    }
  }

  if (
    situation === "sanieren" &&
    bereiche.length === 1 &&
    bereiche[0] === "dach" &&
    skipGroesseForSanierenDachKleinjob(fachdetails)
  ) {
    steps = steps.filter((s) => !s.id.toLowerCase().includes("groesse"));
  }

  return steps;
}
