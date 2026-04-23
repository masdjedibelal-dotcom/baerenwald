import {
  buildBetreuungHaeufigkeitStep,
  shouldSkipBetreuungHaeufigkeit,
} from "./betreuung-haeufigkeit";
import { isFlatFachdetailsBlockComplete } from "./fachdetail-questions-flat";
import {
  shouldSwapFachdetailsBeforeGroesse,
  skipGroesseForSanierenDachKleinjob,
} from "./dach-step-order";
import {
  applyGroesseStepCopy,
  isHausmeisterOnlyBereiche,
  shouldFilterGroesseStep,
} from "./groesse-config";
import {
  buildErneuernProjektSteps,
  isErneuernProjektBereich,
} from "./projekt-erneuern";
import type {
  FachdetailsState,
  FunnelState,
  FunnelStep,
  Kundentyp,
  Situation,
  StepOption,
  Zeitraum,
} from "./types";
import { isReparaturNotfallSituation } from "./reparatur-flow";

export { shouldSwapFachdetailsBeforeGroesse, skipGroesseForSanierenDachKleinjob };

/** Eine Zeitraum-Kachel im PLZ-Schritt */
export type ZeitraumOption = {
  value: Zeitraum;
  label: string;
  hint: string;
  emoji: string;
};

/** Zeitraum-Chips je Situation (Notfall / B2B: leer — kein Zeitraum-Schritt). */
const ZEITRAUM_REPARATUR: ZeitraumOption[] = [
  {
    value: "sofort",
    label: "Sofort / Notfall",
    hint: "Priorisierter Termin — Notdienst-Zuschlag kann anfallen",
    emoji: "⚡",
  },
  {
    value: "diese_woche",
    label: "Diese Woche / Bald",
    hint: "Zeitnah, ohne akute Priorität",
    emoji: "🗓️",
  },
  {
    value: "flexibel",
    label: "Nächster Monat / Flexibel",
    hint: "Planbarer Zeitpunkt",
    emoji: "💭",
  },
];

export const ZEITRAUM_OPTIONS: Record<Situation, ZeitraumOption[]> = {
  gewerbe: [],
  kaputt: ZEITRAUM_REPARATUR,
  erneuern: [
    {
      value: "vier_wochen",
      label: "Innerhalb 4 Wochen",
      hint: "Wir prüfen die Verfügbarkeit",
      emoji: "🗓️",
    },
    {
      value: "zwei_monate",
      label: "In 1–2 Monaten",
      hint: "Guter Vorlauf für Planung",
      emoji: "📆",
    },
    {
      value: "sechs_monate",
      label: "In 3–6 Monaten",
      hint: "Kein Zeitdruck",
      emoji: "📋",
    },
    {
      value: "flexibel",
      label: "Ich bin flexibel",
      hint: "Wir stimmen uns ab",
      emoji: "💭",
    },
  ],
  betreuung: [
    {
      value: "sofort",
      label: "Ab sofort",
      hint: "",
      emoji: "⚡",
    },
    {
      value: "naechster_monat",
      label: "Nächsten Monat",
      hint: "",
      emoji: "📅",
    },
    {
      value: "naechste_saison",
      label: "Zur nächsten Saison",
      hint: "",
      emoji: "🌿",
    },
    {
      value: "flexibel",
      label: "Ich bin flexibel",
      hint: "",
      emoji: "💭",
    },
  ],
};

/** Überschrift + Kurztext für den Zeitraum-Block im PLZ-Schritt */
export const ZEITRAUM_FRAGEN: Record<
  Situation,
  { question: string; hint: string }
> = {
  erneuern: {
    question: "Wann planst du den Start?",
    hint: "Größere Arbeiten brauchen etwas Vorlauf für Planung und Material",
  },
  kaputt: {
    question: "Wann soll es losgehen?",
    hint: "Hilft uns bei der Terminplanung",
  },
  betreuung: {
    question: "Ab wann soll jemand kommen?",
    hint: "Für regelmäßige Betreuung planen wir den Start",
  },
  gewerbe: { question: "", hint: "" },
};

export function getZeitraumOptions(
  situation: Situation | null
): ZeitraumOption[] {
  const key = situation ?? "erneuern";
  return ZEITRAUM_OPTIONS[key] ?? ZEITRAUM_OPTIONS.erneuern;
}

export function getZeitraumFragen(
  situation: Situation | null
): { question: string; hint: string } {
  const key = situation ?? "erneuern";
  return ZEITRAUM_FRAGEN[key] ?? ZEITRAUM_FRAGEN.erneuern;
}

/** Ob im Ort-Schritt eine Zeitraum-Auswahl nötig ist */
export function needsZeitraumSelection(situation: Situation | null): boolean {
  if (situation === "kaputt") {
    return false;
  }
  return getZeitraumOptions(situation).length > 0;
}

export type { GroesseChip, GroesseSliderConfig } from "./groesse-config";
export {
  GROESSE_CONFIG,
  getGroesseConfig,
  groesseEinheitFromConfig,
  isElektroOnlyBereiche,
  isHausmeisterOnlyBereiche,
  shouldSkipGroesseForBereiche,
} from "./groesse-config";

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
    case "erneuern":
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
    case "kaputt":
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
          "Bei akuten Schäden in Mietwohnungen: Haupthahn schließen, Vermieter informieren — wir koordinieren den Rest."
        ),
        kundentypOption(
          "hausverwaltung",
          "Hausverwaltung",
          "Ich verwalte das Objekt",
          "🏢"
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
      { value: "s", label: "Kleiner Garten", groesse: 70, emoji: "🌿" },
      { value: "m", label: "Mittlerer Garten", groesse: 200, emoji: "🌿" },
      { value: "l", label: "Großer Garten", groesse: 450, emoji: "🌿" },
      { value: "xl", label: "Sehr großer Garten", groesse: 800, emoji: "🌿" },
    ];
  }
  if (bereiche.includes("baum")) {
    return [
      { value: "1", label: "1 Baum", groesse: 1, emoji: "🌲" },
      { value: "2", label: "2 Bäume", groesse: 2, emoji: "🌲" },
      { value: "3_4", label: "3–4 Bäume", groesse: 3, emoji: "🌲" },
      { value: "5_plus", label: "5 oder mehr", groesse: 6, emoji: "🌲" },
    ];
  }
  if (bereiche.includes("reinigung")) {
    return [
      {
        value: "s",
        label: "Klein (wenige Parteien)",
        groesse: 45,
        emoji: "🧹",
      },
      {
        value: "m",
        label: "Mittel (typ. Treppenhaus)",
        groesse: 90,
        emoji: "🧹",
      },
      {
        value: "l",
        label: "Groß / mehrere Zugänge",
        groesse: 160,
        emoji: "🧹",
      },
    ];
  }
  if (bereiche.includes("winter")) {
    return [
      {
        value: "kurz",
        label: "Kurze Streckenführung",
        groesse: 7,
        emoji: "❄️",
      },
      {
        value: "mittel",
        label: "Mittlere Streckenführung",
        groesse: 18,
        emoji: "❄️",
      },
      {
        value: "lang",
        label: "Lange Streckenführung",
        groesse: 35,
        emoji: "❄️",
      },
    ];
  }
  return [
    {
      value: "s",
      label: "Objekt klein / kompakt",
      groesse: 55,
      emoji: "🏢",
    },
    {
      value: "m",
      label: "Objekt mittelgroß",
      groesse: 120,
      emoji: "🏢",
    },
    {
      value: "l",
      label: "Objekt groß",
      groesse: 180,
      emoji: "🏢",
    },
    {
      value: "xl",
      label: "Objekt sehr groß",
      groesse: 400,
      emoji: "🏢",
    },
  ];
}

export function getBetreuungGroesseStep(bereiche: string[]): FunnelStep {
  const b = new Set(bereiche);
  let question = "Welchen Umfang hat das Objekt ungefähr?";
  if (b.has("baum")) question = "Wie viele Bäume betrifft das?";
  if (b.has("garten")) question = "Wie umfangreich ist der Außenbereich für die Pflege?";
  if (b.has("winter")) question = "Wie lang ist die zu räumende Streckenführung ca.?";
  if (b.has("reinigung")) question = "Welche Gebäudegröße passt am ehesten?";
  return {
    id: "betreuung_groesse",
    question,
    inputType: "tiles-single",
    options: getBetreuungGroesseOptions(bereiche),
  };
}

export const SITUATIONEN_CONFIG: Record<
  Situation,
  { steps: FunnelStep[]; skipGroesse?: boolean; skipUmfang?: boolean }
> = {
  erneuern: {
    skipUmfang: true,
    steps: [
      {
        id: "erneuern_bereiche",
        question: "Was soll erneuert werden?",
        subtext:
          "Ein Gewerk pro Durchlauf. Für mehrere Bereiche bitte je eine eigene Anfrage starten oder die Gewerke nacheinander mit uns klären — so bleibt die Preis-Einschätzung nachvollziehbar.",
        inputType: "tiles-single",
        options: [
          {
            section: "Innenbereich",
            value: "bad",
            label: "Bad",
            hint: "Fliesen, Sanitär, komplett neu",
            emoji: "🚿",
            triggerGewerke: ["bad", "fliesen", "sanitaer"],
          },
          {
            value: "boden",
            label: "Boden",
            hint: "Innen: Laminat, Parkett, Vinyl, Fliesen",
            emoji: "🪵",
            triggerGewerke: ["boden"],
          },
          {
            value: "waende",
            label: "Wände / Anstrich",
            hint: "Streichen, tapezieren, ausbessern",
            emoji: "🖌️",
            triggerGewerke: ["maler"],
          },
          {
            value: "elektrik",
            label: "Elektrik",
            hint: "Leitungen, Sicherungskasten, Steckdosen",
            emoji: "⚡",
            triggerGewerke: ["elektro"],
          },
          {
            value: "trockenbau",
            label: "Trennwand / Umbau",
            hint: "Neues Zimmer, leichte Trennwände",
            emoji: "🧱",
            triggerGewerke: ["bau"],
          },
          {
            section: "Ausbau & Umbau",
            value: "ausbau_dg",
            label: "Dachausbau / DG",
            hint: "Neuer Wohnraum unter dem Dach — GU-Paket",
            emoji: "🏠",
            triggerGewerke: ["projekt"],
          },
          {
            value: "ausbau_keller",
            label: "Kellerausbau",
            hint: "Trockenlegung, Ausbau, Feuchteschutz — GU-Paket",
            emoji: "🪜",
            triggerGewerke: ["projekt"],
          },
          {
            value: "grundriss_umbau",
            label: "Wanddurchbruch",
            hint: "Raum öffnen — tragend oder nicht tragend",
            emoji: "🚪",
            triggerGewerke: ["projekt"],
          },
          {
            value: "terrasse_neu",
            label: "Terrasse neu",
            hint: "Holz oder Stein — inkl. Erdarbeiten / Unterbau",
            emoji: "🪵",
            triggerGewerke: ["projekt"],
          },
          {
            value: "gartengestaltung",
            label: "Gartengestaltung",
            hint: "Neuanlage, Teiche, Wege — GU-Paket nach Fläche",
            emoji: "🌳",
            triggerGewerke: ["projekt"],
          },
          {
            value: "anbau",
            label: "Anbau oder Garage",
            hint: "Erweiterung des Hauses — zu individuell für den Automatpreis",
            emoji: "🔨",
            direktKomplex: true,
            triggerGewerke: ["bau", "elektro"],
          },
          {
            section: "Außen & Technik",
            value: "heizung",
            label: "Heizung",
            hint: "Neue Anlage, Wartung, Heizkörper",
            emoji: "🔥",
            triggerGewerke: ["heizung"],
          },
          {
            value: "fenster",
            label: "Fenster / Türen",
            hint: "Neue Fenster, Balkon- oder Außentüren — inkl. Aufmaß & Montage",
            emoji: "🪟",
            triggerGewerke: ["fenster"],
          },
          {
            value: "dach",
            label: "Dach",
            hint: "Ziegel, Dämmung, komplett neu",
            emoji: "🏠",
            triggerGewerke: ["dach"],
          },
          {
            value: "fassade",
            label: "Fassade",
            hint: "Anstrich, WDVS oder neue Bekleidung — Typ gleich in der nächsten Frage",
            emoji: "🧱",
            triggerGewerke: ["fassade"],
          },
          {
            value: "fassade_daemmung",
            label: "Fassadendämmung / WDVS",
            hint: "Startet den Fassaden-Flow mit WDVS — Typ ist schon gewählt",
            emoji: "🏠",
            triggerGewerke: ["fassade"],
          },
        ],
      },
      {
        id: "erneuern_groesse",
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

  kaputt: {
    skipGroesse: true,
    skipUmfang: true,
    steps: [
      {
        id: "kaputt_bereiche",
        question: "Was funktioniert nicht richtig?",
        subtext: "Bitte ein Thema wählen — so bleibt die Einschätzung klar",
        inputType: "tiles-single",
        options: [
          {
            value: "heizung",
            label: "Heizung defekt",
            hint: "Geht nicht an, kein warmes Wasser",
            emoji: "🔥",
            triggerGewerke: ["heizung"],
          },
          {
            value: "sanitaer",
            label: "Sanitär / Wasser",
            hint: "Rohr, Leck, WC, Verstopfung",
            emoji: "💧",
            triggerGewerke: ["sanitaer"],
          },
          {
            value: "elektro",
            label: "Elektro-Problem",
            hint: "Sicherung, Strom weg, Steckdose defekt",
            emoji: "⚡",
            triggerGewerke: ["elektro"],
          },
          {
            value: "fenster_tuer",
            label: "Fenster / Tür kaputt",
            hint: "Dichtung, Schloss, Rahmen, Glas",
            emoji: "🪟",
            triggerGewerke: ["fenster"],
          },
          {
            value: "dach",
            label: "Dach-Problem",
            hint: "Leck, Ziegel defekt, Regenrinne",
            emoji: "🏠",
            triggerGewerke: ["dach"],
          },
          {
            value: "schimmel",
            label: "Schimmel / Feuchtigkeit",
            hint: "Ursache finden und beheben",
            emoji: "🍄",
            direktKomplex: true,
            triggerGewerke: ["sanitaer", "maler"],
          },
        ],
      },
      {
        id: "kaputt_dringlichkeit",
        question: "Wie dringend ist die Reparatur?",
        inputType: "tiles-single",
        options: [
          {
            value: "sofort",
            label: "Jetzt sofort",
            hint: "Es wird schlimmer — sofort handeln",
            emoji: "🔴",
            faktor: 1.8,
            warnText:
              "Bitte ruf uns direkt an — bei akuten Schäden ist der Rechner zu langsam.",
          },
          {
            value: "heute",
            label: "Heute noch",
            hint: "Ausgefallen aber stabil — heute lösen",
            emoji: "🟠",
            faktor: 1.5,
            infoText: "Termin innerhalb 24–48h.",
          },
          {
            value: "diese_woche",
            label: "Diese Woche",
            hint: "Eingeschränkt nutzbar — bald reparieren",
            emoji: "🟡",
            faktor: 1.2,
            infoText: "Termin innerhalb weniger Tage.",
          },
        ],
      },
    ],
  },

  betreuung: {
    steps: [
      {
        id: "betreuung_was",
        question: "Worum soll sich jemand kümmern?",
        subtext: "Bitte ein Thema wählen",
        inputType: "tiles-single",
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
};

/** Relevante Bereiche für den Schritt „Fachdetails“ (nach Bereiche, vor Kundentyp) */
export function bereicheNeedFachdetails(bereiche: string[]): boolean {
  if (isErneuernProjektBereich(bereiche)) return false;
  const s = new Set(bereiche);
  return (
    s.has("strom") ||
    s.has("elektrik") ||
    s.has("elektro") ||
    s.has("fenster") ||
    s.has("fenster_tueren") ||
    s.has("bad") ||
    s.has("wasser") ||
    s.has("sanitaer") ||
    s.has("heizung") ||
    s.has("maler") ||
    s.has("streichen") ||
    s.has("waende") ||
    s.has("waende_boeden") ||
    s.has("boden") ||
    s.has("dach") ||
    s.has("garten") ||
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
    "Pro sichtbarem Gewerk nacheinander beantworten — Folgefragen erscheinen erst nach der jeweiligen Antwort.",
  inputType: "fachdetails",
};

/** Nach Bad-Größe: Ausstattungsstufe für die Preiskalkulation */
export const BW_FUNNEL_STEP_BAD_AUSSTATTUNG: FunnelStep = {
  id: "bad_ausstattung",
  question: "Welchen Standard planst du?",
  subtext: "Materialien und Ausstattung — wir rechnen danach den Preisrahmen",
  inputType: "tiles-single",
  options: [
    {
      value: "standard",
      label: "Standard",
      hint: "Solide Materialien, funktionales Design",
      emoji: "✓",
    },
    {
      value: "komfort",
      label: "Komfort",
      hint: "Bodengleiche Dusche, gute Markenarmaturen",
      emoji: "⭐",
    },
    {
      value: "gehoben",
      label: "Gehoben",
      hint: "Designfliesen, Markenarmaturen, individuelle Lösungen",
      emoji: "✨",
    },
  ],
};

/** Weiter nur wenn je sichtbarem Block (max. 2) die gestaffelten Fragen vollständig beantwortet sind */
export function isFachdetailsStepComplete(state: {
  situation: Situation | null;
  bereiche: string[];
  fachdetails: FachdetailsState;
}): boolean {
  if (!bereicheNeedFachdetails(state.bereiche)) return true;
  return isFlatFachdetailsBlockComplete(state);
}

/** Kurz-Hinweis unter Zugänglichkeit + Zustand (Rechner) */
export const BW_FUNNEL_PREIS_HINWEIS_ZUG_ZUSTAND =
  "Diese Angabe hilft uns, den Preis genauer einzuschätzen.";

/** Nach Umfang/Planung — für Preisfaktor Zugänglichkeit (Außen / Neubau) */
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

/** Nach Zugänglichkeit — Preisfaktor Zustand (Innen) */
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

/** Welche Zustands-Variante (Frage + Kacheln) passt zu den Bereichen? */
export type ZustandStepVariant = "waende" | "boden" | "dach";

export function getZustandStepVariantFromBereiche(
  bereiche: string[]
): ZustandStepVariant | null {
  const b = new Set(bereiche);
  if (b.has("waende") || b.has("maler") || b.has("streichen") || b.has("waende_boeden")) {
    return "waende";
  }
  if (b.has("boden")) return "boden";
  if (b.has("dach")) return "dach";
  return null;
}

function zustandVariantQuestion(variant: ZustandStepVariant): string {
  switch (variant) {
    case "waende":
      return "Wie sind die Wände aktuell?";
    case "boden":
      return "Wie ist der aktuelle Boden?";
    case "dach":
      return "Wie alt ist das Dach ungefähr?";
    default:
      return "Wie ist der Zustand der Räume?";
  }
}

function zustandVariantOptions(variant: ZustandStepVariant): StepOption[] {
  switch (variant) {
    case "waende":
      return [
        {
          value: "gut",
          label: "Gepflegt",
          hint: "glatt und sauber",
          faktor: 1.0,
        },
        {
          value: "mittel",
          label: "Normale Abnutzung",
          hint: "kleine Risse oder Flecken",
          faktor: 1.4,
        },
        {
          value: "schlecht",
          label: "Sanierungsbedürftig",
          hint: "größere Schäden oder alte Tapete",
          faktor: 2.0,
        },
        {
          value: "unknown",
          label: "Weiß ich nicht",
          hint: "Kein Problem — wir rechnen mit einem Durchschnittswert",
          faktor: 1.1,
        },
      ];
    case "boden":
      return [
        {
          value: "gut",
          label: "Gut erhalten",
          hint: "kaum sichtbare Abnutzung",
          faktor: 1.0,
        },
        {
          value: "mittel",
          label: "Normale Abnutzung",
          hint: "Gebrauchsspuren, noch tragfähig",
          faktor: 1.4,
        },
        {
          value: "schlecht",
          label: "Muss komplett raus",
          hint: "defekt oder stark verschlissen",
          faktor: 2.0,
        },
        {
          value: "unknown",
          label: "Weiß ich nicht",
          hint: "Kein Problem — wir rechnen mit einem Durchschnittswert",
          faktor: 1.1,
        },
      ];
    case "dach":
      return [
        {
          value: "gut",
          label: "Unter 20 Jahre",
          hint: "relativ jung",
          faktor: 1.0,
        },
        {
          value: "mittel",
          label: "20–40 Jahre",
          hint: "mittleres Alter",
          faktor: 1.35,
        },
        {
          value: "schlecht",
          label: "Über 40 Jahre",
          hint: "oft höherer Sanierungsbedarf",
          faktor: 1.85,
        },
        {
          value: "unknown",
          label: "Weiß ich nicht",
          hint: "Kein Problem — wir rechnen mit einem Durchschnittswert",
          faktor: 1.1,
        },
      ];
  }
}

/** Dynamische Zustands-Frage (Kurzform, z. B. Step-Label). */
export function getZustandQuestionForBereiche(bereiche: string[]): string {
  const v = getZustandStepVariantFromBereiche(bereiche);
  if (v) return zustandVariantQuestion(v);
  return "Wie ist der Zustand der Räume?";
}

/** Zustand-Schritt mit passender Frage und Kacheln je Gewerk. */
export function buildZustandStepForBereiche(bereiche: string[]): FunnelStep {
  const v = getZustandStepVariantFromBereiche(bereiche);
  if (!v) {
    return { ...BW_FUNNEL_STEP_ZUSTAND };
  }
  return {
    ...BW_FUNNEL_STEP_ZUSTAND,
    question: zustandVariantQuestion(v),
    options: zustandVariantOptions(v),
  };
}

/** Anzeige im Ergebnis: gewählte Zustands-Kachel je Variante. */
export function getZustandDisplayLabel(
  z: FunnelState["zustand"],
  bereiche: string[]
): string | null {
  if (!z) return null;
  const v = getZustandStepVariantFromBereiche(bereiche);
  const opts =
    (v ? zustandVariantOptions(v) : BW_FUNNEL_STEP_ZUSTAND.options) ?? [];
  const hit = opts.find((o) => o.value === z);
  return hit?.label ?? null;
}

/** @see getZustandQuestionForBereiche — API mit State-Schnittstelle */
export function getZustandLabel(
  state: Pick<FunnelState, "bereiche">
): string {
  return getZustandQuestionForBereiche(state.bereiche);
}

/** Zugänglichkeit: nur bei Außeneinsatz / Außenprojekten; nicht bei reiner Innensanierung ohne Dach, Fassade, Wände (Außen). */
export function shouldIncludeZugaenglichkeitStep(
  situation: Situation,
  _umfang: string | null,
  bereiche: string[],
  zuKomplex: boolean = false
): boolean {
  if (zuKomplex) return false;
  if (isReparaturNotfallSituation(situation)) return false;
  if (situation === "gewerbe") return false;
  if (situation === "betreuung") return false;
  if (situation === "erneuern" && isErneuernProjektBereich(bereiche)) {
    return false;
  }

  return (
    bereiche.includes("fassade") ||
    bereiche.includes("dach") ||
    (situation === "erneuern" &&
      (bereiche.includes("anbau") || bereiche.includes("terrasse_neu")))
  );
}

/** Zustand: nur „erneuern“ bei Wänden oder Boden (ohne Bad). */
export function shouldIncludeZustandStep(
  situation: Situation,
  bereiche: string[],
  zuKomplex: boolean = false
): boolean {
  if (zuKomplex) return false;
  if (situation === "betreuung") return false;
  if (situation === "gewerbe") return false;
  if (situation === "kaputt") return false;
  if (situation !== "erneuern") return false;
  if (isErneuernProjektBereich(bereiche)) return false;
  const b = bereiche;
  return b.includes("waende") || b.includes("boden");
}

function insertBeforeGroesse(
  steps: FunnelStep[],
  toInsert: FunnelStep[]
): FunnelStep[] {
  if (toInsert.length === 0) return steps;
  const gIdx = steps.findIndex((s) =>
    s.id.toLowerCase().includes("groesse")
  );
  if (gIdx >= 0) {
    const next = [...steps];
    next.splice(gIdx, 0, ...toInsert);
    return next;
  }
  /** Kaputt/Notfall ohne Flächen-Schritt: vor Dringlichkeit einfügen */
  const urgIdx = steps.findIndex((s) => s.id === "kaputt_dringlichkeit");
  if (urgIdx >= 0) {
    const next = [...steps];
    next.splice(urgIdx, 0, ...toInsert);
    return next;
  }
  return steps;
}

/** Aufgelöste Schritte inkl. dynamischem Betreuung-Größen-Schritt */
export function getResolvedStepsForSituation(
  situation: Situation | null,
  bereiche: string[],
  fachdetails?: FachdetailsState,
  umfang: string | null = null,
  zuKomplex: boolean = false
): FunnelStep[] {
  if (!situation) return [];
  const cfg = SITUATIONEN_CONFIG[situation];

  if (
    bereiche.includes("schimmel") ||
    bereiche.includes("feuchtigkeit_schimmel")
  ) {
    const first = cfg.steps[0];
    return first ? [first] : [];
  }

  if (situation === "betreuung") {
    const stepsBetreuung: FunnelStep[] = [cfg.steps[0]!];
    if (!shouldSkipBetreuungHaeufigkeit(bereiche)) {
      stepsBetreuung.push(buildBetreuungHaeufigkeitStep(bereiche));
    }
    if (!isHausmeisterOnlyBereiche(bereiche)) {
      stepsBetreuung.push(getBetreuungGroesseStep(bereiche));
    }
    if (bereicheNeedFachdetails(bereiche)) {
      stepsBetreuung.push(BW_FUNNEL_STEP_FACHDETAILS);
    }
    return stepsBetreuung;
  }

  let steps = [...cfg.steps];

  if (situation === "erneuern" && isErneuernProjektBereich(bereiche)) {
    steps = steps.filter((s) => s.id !== "erneuern_groesse");
    const bi = steps.findIndex((s) => s.id === "erneuern_bereiche");
    const extra = buildErneuernProjektSteps(bereiche, fachdetails);
    if (bi >= 0 && extra.length > 0) {
      const next = [...steps];
      next.splice(bi + 1, 0, ...extra);
      steps = next;
    }
  }

  if (
    isReparaturNotfallSituation(situation) &&
    (bereicheNeedFachdetails(bereiche) || bereiche.includes("bad")) &&
    !steps.some((s) => s.id === "fachdetails")
  ) {
    steps = [...steps];
    steps.splice(1, 0, BW_FUNNEL_STEP_FACHDETAILS);
  }

  const zugZustandSteps: FunnelStep[] = [];
  if (situation === "erneuern" || situation === "kaputt") {
    if (
      shouldIncludeZugaenglichkeitStep(
        situation,
        umfang,
        bereiche,
        zuKomplex
      )
    ) {
      zugZustandSteps.push(BW_FUNNEL_STEP_ZUGAENGLICHKEIT);
    }
    if (shouldIncludeZustandStep(situation, bereiche, zuKomplex)) {
      zugZustandSteps.push(buildZustandStepForBereiche(bereiche));
    }
    if (zugZustandSteps.length > 0) {
      steps = insertBeforeGroesse(steps, zugZustandSteps);
    }
  }

  if (
    (bereicheNeedFachdetails(bereiche) || bereiche.includes("bad")) &&
    !steps.some((s) => s.id === "fachdetails")
  ) {
    const gIdx = steps.findIndex((s) => s.id.toLowerCase().includes("groesse"));
    if (gIdx >= 0) {
      steps = [...steps];
      let insertAt = gIdx + 1;
      if (bereiche.includes("bad") && situation !== "gewerbe") {
        steps.splice(insertAt, 0, BW_FUNNEL_STEP_BAD_AUSSTATTUNG);
        insertAt += 1;
      }
      if (bereicheNeedFachdetails(bereiche)) {
        steps.splice(insertAt, 0, BW_FUNNEL_STEP_FACHDETAILS);
      }
    } else if (bereicheNeedFachdetails(bereiche)) {
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

  /** Nur „wenige Ziegel“ / Ziegelbereich ohne Flächenbezug — Regenrinne (lfm) und Dachfenster (Stück) behalten den Größen-Schritt (s. {@link skipGroesseForSanierenDachKleinjob}). */
  if (
    (situation === "erneuern" || situation === "kaputt") &&
    bereiche.length === 1 &&
    bereiche[0] === "dach" &&
    skipGroesseForSanierenDachKleinjob(fachdetails)
  ) {
    steps = steps.filter((s) => !s.id.toLowerCase().includes("groesse"));
  }

  steps = steps
    .filter((s) => !shouldFilterGroesseStep(situation!, bereiche, s))
    .map((s) => applyGroesseStepCopy(s, situation!, bereiche, fachdetails));

  if (isReparaturNotfallSituation(situation)) {
    steps = steps.filter(
      (s) =>
        !s.id.toLowerCase().includes("groesse") && !s.id.endsWith("_umfang")
    );
  }

  return steps;
}
