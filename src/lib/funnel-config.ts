import {
  applyPricingToState,
  shouldSkipPriceCalculation,
} from "@/lib/price-calc";
import type {
  Dringlichkeit,
  FunnelState,
  FunnelStep,
  Mode,
  PlzZeitraumAnswer,
  Situation,
  StepAnswerValue,
} from "@/lib/types";

const DRINGLICHKEIT_VALUES = new Set<Dringlichkeit>([
  "notfall",
  "dringend",
  "diese_woche",
  "irgendwann",
]);

export const SHARED_PLZ_STEP: FunnelStep = {
  id: "shared_plz",
  question: "Wo befindet sich das Objekt?",
  subtext:
    "PLZ eingeben — wir prüfen die Verfügbarkeit in deiner Region.",
  inputType: "plz-zeitraum",
  options: [
    {
      value: "sofort",
      label: "So bald wie möglich",
    },
    {
      value: "naechste_wochen",
      label: "In den nächsten 4 Wochen",
    },
    {
      value: "spaeter",
      label: "In 1–3 Monaten",
    },
  ],
};

const STEPS_RENOVIERUNG: FunnelStep[] = [
  {
    id: "renov_bereiche",
    question: "Welche Bereiche willst du erneuern?",
    inputType: "tiles-multi",
    options: [
      {
        value: "wohnzimmer",
        label: "Wohnzimmer",
        hint: "Wände, Boden, Decke",
        triggerGewerke: ["maler", "boden"],
      },
      {
        value: "bad",
        label: "Bad / WC",
        hint: "Wasser & Heizung, Fliesen, Lüftung",
        triggerGewerke: ["sanitaer", "fliesen", "elektro"],
      },
      {
        value: "schlafzimmer",
        label: "Schlafzimmer",
        hint: "Wände, Boden",
        triggerGewerke: ["maler", "boden"],
      },
      {
        value: "mehrere_raeume",
        label: "Mehrere Räume",
        hint: "Komplettsanierung",
        triggerGewerke: ["maler", "boden", "elektro"],
        triggerMode: "multi",
      },
      {
        value: "aussenbereich",
        label: "Außenbereich",
        hint: "Fassade, Garten, Terrasse",
        triggerGewerke: ["garten", "fassade"],
      },
    ],
  },
  {
    id: "renov_zustand",
    question: "Wie ist der aktuelle Zustand?",
    inputType: "chips-single",
    options: [
      {
        value: "gut",
        label: "Bewohnbar, aber veraltet",
        hint: "Optische Auffrischung nötig",
      },
      {
        value: "mittel",
        label: "Renovierungsbedürftig",
        hint: "Schäden, Schimmel, alte Leitungen",
        warnText:
          "Bei Schimmel oder alten Leitungen empfehlen wir eine kostenlose Erstbesichtigung vor der Kalkulation.",
      },
      {
        value: "schlecht",
        label: "Kernsanierung nötig",
        hint: "Alles raus, neu aufbauen",
      },
      {
        value: "unbekannt",
        label: "Weiß ich noch nicht",
        hint: "Erst Besichtigung nötig",
      },
    ],
  },
  {
    id: "renov_flaeche",
    question: "Wie groß ist die Fläche?",
    inputType: "slider",
    sliderConfig: {
      min: 20,
      max: 300,
      step: 5,
      unit: "m²",
      defaultValue: 80,
    },
    infoText:
      "Schätzwert reicht — der genaue Preis wird beim kostenlosen Vor-Ort-Termin ermittelt.",
  },
];

const STEPS_NEUBAU: FunnelStep[] = [
  {
    id: "neubau_situation",
    question: "Was ist deine Situation?",
    inputType: "tiles-single",
    options: [
      {
        value: "bestand",
        label: "Ich kaufe eine Bestandsimmobilie",
        hint: "Sanierung vor Einzug geplant",
        triggerMode: "multi",
      },
      {
        value: "neubau",
        label: "Ich baue neu",
        hint: "Rohbau steht oder in Planung",
        triggerMode: "multi",
      },
      {
        value: "bautraeger",
        label: "Ich kaufe vom Bauträger",
        hint: "Sonderwünsche & Restarbeiten",
      },
      {
        value: "altbau",
        label: "Ich übernehme Erbe / Altbau",
        hint: "Unbekannter Zustand",
        warnText:
          "Bei Altbauten empfehlen wir immer eine Besichtigung vor der Kalkulation — die Preisrange ist sonst zu ungenau.",
      },
    ],
  },
  {
    id: "neubau_leistungen",
    question: "Was soll alles gemacht werden?",
    inputType: "tiles-multi",
    options: [
      {
        value: "boden",
        label: "Böden verlegen",
        priceTag: "ab 35 €/m²",
        triggerGewerke: ["boden"],
      },
      {
        value: "maler",
        label: "Maler / Wände",
        priceTag: "ab 12 €/m²",
        triggerGewerke: ["maler"],
      },
      {
        value: "bad",
        label: "Badezimmer",
        priceTag: "ab 8.000 €",
        triggerGewerke: ["sanitaer", "fliesen"],
      },
      {
        value: "elektro",
        label: "Elektro / Licht",
        priceTag: "ab 80 €/Punkt",
        triggerGewerke: ["elektro"],
      },
      {
        value: "aussen",
        label: "Außenanlagen",
        priceTag: "ab 90 €/m²",
        triggerGewerke: ["garten", "fassade"],
      },
    ],
  },
  {
    id: "neubau_zeitraum",
    question: "Wann soll es losgehen?",
    inputType: "chips-single",
    options: [
      {
        value: "sofort",
        label: "So schnell wie möglich",
        hint: "Innerhalb 2 Wochen",
      },
      {
        value: "bald",
        label: "In 1–3 Monaten",
        hint: "Zeit zur Planung",
      },
      {
        value: "spaeter",
        label: "In 3–6 Monaten",
        hint: "Noch in Planung",
      },
      {
        value: "offen",
        label: "Offen / flexibel",
        hint: "Kein fixes Datum",
      },
    ],
  },
];

const STEPS_AKUT: FunnelStep[] = [
  {
    id: "akut_problem",
    question: "Was ist das Problem?",
    inputType: "tiles-single",
    options: [
      {
        value: "heizung",
        label: "Heizung / Wärme",
        hint: "Heizung aus, kein warmes Wasser",
        triggerGewerke: ["shk"],
      },
      {
        value: "wasser",
        label: "Wasser / Rohr",
        hint: "Rohrbruch, Verstopfung, Leck",
        triggerGewerke: ["sanitaer"],
      },
      {
        value: "strom",
        label: "Strom / Elektro",
        hint: "Ausfall, Kurzschluss, defekt",
        triggerGewerke: ["elektro"],
      },
      {
        value: "tuer",
        label: "Tür / Fenster",
        hint: "Schloss, Rahmen, Dichtung",
        triggerGewerke: ["schlosser"],
      },
      {
        value: "schaden",
        label: "Schaden / Feuchtigkeit",
        hint: "Schimmel, Wasserschaden",
        triggerGewerke: ["sanitaer", "maler"],
        triggerMode: "multi",
      },
      {
        value: "anderes",
        label: "Anderes Problem",
        hint: "Nicht in der Liste",
      },
    ],
  },
  {
    id: "akut_dringlichkeit",
    question: "Wie dringend ist es?",
    inputType: "chips-single",
    options: [
      {
        value: "notfall",
        label: "Notfall — jetzt sofort",
        hint: "Wasser läuft, kein Strom, Heizung im Winter",
      },
      {
        value: "dringend",
        label: "Dringend — heute / morgen",
        hint: "Funktioniert eingeschränkt",
      },
      {
        value: "diese_woche",
        label: "Diese Woche",
        hint: "Nervt, aber kein Notfall",
      },
      {
        value: "irgendwann",
        label: "Irgendwann",
        hint: "Kleinere Macke",
      },
    ],
  },
  {
    id: "akut_beschreibung",
    question: "Kurze Beschreibung des Problems",
    subtext:
      "1–2 Sätze reichen — oder einfach ein Foto hochladen.",
    inputType: "text",
  },
];

const STEPS_PFLEGE: FunnelStep[] = [
  {
    id: "pflege_leistungen",
    question: "Was soll regelmäßig gemacht werden?",
    inputType: "tiles-multi",
    options: [
      {
        value: "garten",
        label: "Gartenpflege",
        hint: "Mähen, Schneiden, Aufräumen",
        triggerGewerke: ["garten"],
      },
      {
        value: "reinigung",
        label: "Gebäudereinigung",
        hint: "Treppenhäuser, Gemeinschaftsflächen",
        triggerGewerke: ["reinigung"],
      },
      {
        value: "winter",
        label: "Winterdienst",
        hint: "Streuen, Räumen — Haftungsthema",
        triggerGewerke: ["winterdienst"],
        infoExpand:
          "In München sind Eigentümer streupflichtig ab 7 Uhr werktags. Bei Nichterfüllung haften Sie persönlich für Unfälle.",
      },
      {
        value: "heizung_wartung",
        label: "Heizungswartung",
        hint: "Jährliche Inspektion",
        triggerGewerke: ["shk"],
      },
      {
        value: "fenster",
        label: "Fensterreinigung",
        hint: "Innen, außen oder beides",
        triggerGewerke: ["reinigung"],
      },
      {
        value: "hausmeister",
        label: "Hausmeisterservice",
        hint: "Alles + Kleinreparaturen",
        triggerGewerke: ["hausmeister", "garten", "reinigung", "winterdienst"],
        triggerMode: "multi",
      },
    ],
  },
  {
    id: "pflege_frequenz",
    question: "Wie oft soll geleistet werden?",
    inputType: "chips-single",
    options: [
      {
        value: "woechentlich",
        label: "Wöchentlich",
        hint: "Reinigung, Hausmeister",
      },
      {
        value: "zwewoechentlich",
        label: "Alle 2 Wochen",
        hint: "Standard Gartenpflege",
      },
      {
        value: "monatlich",
        label: "Monatlich",
        hint: "Kontrollgänge, leichte Pflege",
      },
      {
        value: "saisonal",
        label: "Saisonal",
        hint: "Frühjahr / Herbst / Winter",
      },
      {
        value: "jaehrlich",
        label: "Jährlich",
        hint: "Heizung, Dach, Inspektion",
      },
      {
        value: "bedarf",
        label: "Nach Bedarf",
        hint: "Auf Abruf",
      },
    ],
  },
  {
    id: "pflege_objekt",
    question: "Was ist das Objekt?",
    inputType: "tiles-single",
    options: [
      {
        value: "etw",
        label: "Wohnung / ETW",
        hint: "Balkon oder kleiner Garten",
      },
      {
        value: "reihenhaus",
        label: "Reihenhaus / DHH",
        hint: "Typischer Vorstadt-Garten",
      },
      {
        value: "efh",
        label: "Einfamilienhaus",
        hint: "Garten + Auffahrt + ggf. Pool",
      },
      {
        value: "mfh",
        label: "Mehrfamilienhaus",
        hint: "Gemeinschaftsflächen, mehrere Einheiten",
      },
    ],
  },
];

const STEPS_B2B: FunnelStep[] = [
  {
    id: "b2b_objekt",
    question: "Was beschreibt euer Objekt am besten?",
    inputType: "tiles-single",
    options: [
      {
        value: "buero",
        label: "Bürofläche",
        hint: "Einzelbüro bis Open Space",
      },
      {
        value: "einzelhandel",
        label: "Einzelhandel / Praxis",
        hint: "Kundenbereich, Schaufenster",
      },
      {
        value: "lager",
        label: "Lagerhalle / Produktion",
        hint: "Industriefläche, Werkstatt",
      },
      {
        value: "gastro",
        label: "Gastronomie / Hotel",
        hint: "Hygieneanforderungen",
      },
      {
        value: "weg",
        label: "Wohnanlage / WEG",
        hint: "Gemeinschaftseigentum",
      },
      {
        value: "portfolio",
        label: "Mehrere Objekte",
        hint: "Portfolio / Facility Management",
      },
    ],
  },
  {
    id: "b2b_leistungen",
    question: "Was braucht ihr?",
    inputType: "tiles-multi",
    options: [
      {
        value: "reinigung",
        label: "Laufende Reinigung",
        hint: "Täglich bis wöchentlich",
        triggerGewerke: ["reinigung"],
      },
      {
        value: "hausmeister",
        label: "Hausmeisterservice",
        hint: "Ansprechpartner vor Ort",
        triggerGewerke: ["hausmeister"],
      },
      {
        value: "winter",
        label: "Winterdienst",
        hint: "Verkehrssicherungspflicht",
        triggerGewerke: ["winterdienst"],
      },
      {
        value: "instandhaltung",
        label: "Reparaturen / Instandhaltung",
        hint: "Auf Abruf oder Rahmenvertrag",
        triggerGewerke: ["shk", "elektro", "maler"],
      },
      {
        value: "umbau",
        label: "Umbau / Renovierung",
        hint: "Einmalig oder wiederkehrend",
        triggerGewerke: ["maler", "boden", "elektro"],
      },
      {
        value: "komplett",
        label: "Komplettpaket",
        hint: "Alles aus einer Hand",
        triggerGewerke: [
          "hausmeister",
          "reinigung",
          "winterdienst",
          "shk",
          "elektro",
        ],
        triggerMode: "multi",
      },
    ],
  },
  {
    id: "b2b_standorte",
    question: "Wie viele Standorte?",
    inputType: "chips-single",
    options: [
      {
        value: "ein",
        label: "1 Standort",
        hint: "Einzelobjekt",
      },
      {
        value: "wenige",
        label: "2–5 Standorte",
        hint: "Kleines Portfolio",
      },
      {
        value: "mittel",
        label: "6–20 Standorte",
        hint: "Rahmenvertrag sinnvoll",
      },
      {
        value: "viele",
        label: "Über 20 Standorte",
        hint: "Enterprise / Ausschreibung",
      },
    ],
  },
];

export const FUNNEL_STEPS_BY_SITUATION: Record<Situation, FunnelStep[]> = {
  renovierung: STEPS_RENOVIERUNG,
  neubau: STEPS_NEUBAU,
  akut: STEPS_AKUT,
  pflege: STEPS_PFLEGE,
  b2b: STEPS_B2B,
};

const STEP_MAP: Record<string, FunnelStep> = {};

function registerSteps(steps: FunnelStep[]) {
  for (const s of steps) {
    STEP_MAP[s.id] = s;
  }
}
registerSteps(STEPS_RENOVIERUNG);
registerSteps(STEPS_NEUBAU);
registerSteps(STEPS_AKUT);
registerSteps(STEPS_PFLEGE);
registerSteps(STEPS_B2B);
STEP_MAP[SHARED_PLZ_STEP.id] = SHARED_PLZ_STEP;

export function getStepsForSituation(
  situation: Situation | null
): FunnelStep[] {
  if (!situation) return [];
  return [...FUNNEL_STEPS_BY_SITUATION[situation], SHARED_PLZ_STEP];
}

export function getStepById(stepId: string): FunnelStep | undefined {
  return STEP_MAP[stepId];
}

export function matchesShowFor(
  state: FunnelState,
  showFor?: Partial<FunnelState>
): boolean {
  if (!showFor) return true;
  for (const key of Object.keys(showFor) as (keyof FunnelState)[]) {
    const expected = showFor[key];
    if (expected === undefined) continue;
    const actual = state[key];
    if (Array.isArray(expected) && Array.isArray(actual)) {
      if (expected.length !== actual.length) return false;
      if (!expected.every((v, i) => v === actual[i])) return false;
      continue;
    }
    if (actual !== expected) return false;
  }
  return true;
}

export function getVisibleSteps(state: FunnelState): FunnelStep[] {
  return getStepsForSituation(state.situation).filter((step) =>
    matchesShowFor(state, step.showFor)
  );
}

function optionValuesFromAnswer(
  step: FunnelStep,
  answer: StepAnswerValue
): string[] {
  const t = step.inputType;
  if (t === "tiles-multi" || t === "chips-multi") {
    return Array.isArray(answer)
      ? answer.filter((x): x is string => typeof x === "string")
      : [];
  }
  if (t === "tiles-single" || t === "chips-single") {
    return typeof answer === "string" ? [answer] : [];
  }
  return [];
}

function collectGewerkeFromStep(
  step: FunnelStep,
  answer: StepAnswerValue
): string[] {
  const gewerke: string[] = [];
  if (!step.options?.length) return gewerke;
  const vals = optionValuesFromAnswer(step, answer);
  for (const v of vals) {
    const opt = step.options.find((o) => o.value === v);
    if (opt?.triggerGewerke?.length) gewerke.push(...opt.triggerGewerke);
  }
  return gewerke;
}

/** Aktualisiert abgeleitete Felder aus `answers` (Leistungs-Keys, Fläche, PLZ, …). */
export function syncDerivedFromAnswers(state: FunnelState): FunnelState {
  const steps = getStepsForSituation(state.situation);
  const gewerkeSet = new Set<string>();

  for (const step of steps) {
    const ans = state.answers[step.id];
    if (ans === undefined) continue;
    const gewerke = collectGewerkeFromStep(step, ans);
    gewerke.forEach((g) => gewerkeSet.add(g));
  }

  let mode: Mode | null = null;
  if (gewerkeSet.size > 0) {
    mode = gewerkeSet.size > 1 ? "multi" : "single";
  }

  let flaeche = 0;
  const fl = state.answers.renov_flaeche;
  if (typeof fl === "number") {
    flaeche = fl;
  }

  const zustand =
    typeof state.answers.renov_zustand === "string"
      ? state.answers.renov_zustand
      : "";

  const frequenz =
    typeof state.answers.pflege_frequenz === "string"
      ? state.answers.pflege_frequenz
      : "";

  let dringlichkeit: Dringlichkeit | null = null;
  const urg = state.answers.akut_dringlichkeit;
  if (typeof urg === "string" && DRINGLICHKEIT_VALUES.has(urg as Dringlichkeit)) {
    dringlichkeit = urg as Dringlichkeit;
  }

  let plz = "";
  let zeitraum = "";
  const shared = state.answers.shared_plz;
  if (shared && typeof shared === "object" && "plz" in shared) {
    const pz = shared as PlzZeitraumAnswer;
    plz = String(pz.plz ?? "");
    zeitraum = String(pz.zeitraum ?? "");
  }
  const nb = state.answers.neubau_zeitraum;
  if (typeof nb === "string" && !zeitraum) {
    zeitraum = nb;
  }

  return {
    ...state,
    gewerke: Array.from(gewerkeSet),
    mode,
    flaeche,
    zustand,
    frequenz,
    dringlichkeit,
    plz,
    zeitraum,
  };
}

export function applyStepAnswer(
  prev: FunnelState,
  stepId: string,
  value: StepAnswerValue
): FunnelState {
  const answers = { ...prev.answers, [stepId]: value };
  let next: FunnelState = { ...prev, answers };
  next = syncDerivedFromAnswers(next);
  next = applyPricingToState(next);
  return next;
}

export function createInitialFunnelState(): FunnelState {
  return {
    situation: null,
    mode: null,
    answers: {},
    gewerke: [],
    flaeche: 0,
    zustand: "",
    frequenz: "",
    dringlichkeit: null,
    plz: "",
    zeitraum: "",
    priceMin: 0,
    priceMax: 0,
    priceBreakdown: [],
    photos: [],
    name: "",
    vorname: "",
    nachname: "",
    email: "",
    telefon: "",
    anmerkungen: "",
    selectedSlot: null,
    beratung: false,
    entscheider: true,
    b2bPrio: "",
    skipCalendar: false,
  };
}

/** B2B: viele / mittlere Standorte → Beratungsgespräch statt Preisrechner */
export function shouldShowConsultationOnly(state: FunnelState): boolean {
  return shouldSkipPriceCalculation(state);
}

/** Akut + Notfall → Telefon-CTA, Kalender auslassen */
export function isAkutNotfall(state: FunnelState): boolean {
  return state.situation === "akut" && state.dringlichkeit === "notfall";
}

export function getWarnTextForSelection(
  step: FunnelStep,
  selectedValues: string[]
): string | undefined {
  if (!step.options) return undefined;
  for (const v of selectedValues) {
    const opt = step.options.find((o) => o.value === v);
    if (opt?.warnText) return opt.warnText;
  }
  return undefined;
}

export function getInfoExpandForSelection(
  step: FunnelStep,
  selectedValues: string[]
): string | undefined {
  if (!step.options) return undefined;
  for (const v of selectedValues) {
    const opt = step.options.find((o) => o.value === v);
    if (opt?.infoExpand) return opt.infoExpand;
  }
  return undefined;
}
