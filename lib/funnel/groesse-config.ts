import type {
  FachdetailsState,
  FunnelState,
  FunnelStep,
  Situation,
} from "./types";

/** Slider + Chips + Direkteingabe (Rechner „Größe“) */
export type GroesseChip = {
  label: string;
  value: number;
  hint?: string;
};

export type GroesseSliderConfig = {
  min: number;
  max: number;
  step: number;
  default: number;
  einheit: string;
  einheitKurz: string;
  chips: GroesseChip[];
};

const ELECTRO_BEREICH = new Set(["strom", "elektrik", "elektro"]);

/** Reines Elektro-Vorhaben — ohne Größen-Schritt. */
export function isElektroOnlyBereiche(bereiche: string[]): boolean {
  if (bereiche.length === 0) return false;
  return bereiche.every((b) => ELECTRO_BEREICH.has(b));
}

/** Nur Hausmeister-Kachel — Größe pauschal, kein Größen-Schritt. */
export function isHausmeisterOnlyBereiche(bereiche: string[]): boolean {
  if (bereiche.length === 0) return false;
  return bereiche.every((b) => b === "hausmeister");
}

function kaputtSkipGroesse(bereiche: string[]): boolean {
  if (bereiche.length === 0) return false;
  const skip = new Set(["elektro", "sanitaer", "heizung", "schimmel"]);
  return bereiche.every((b) => skip.has(b));
}

export function shouldSkipGroesseForBereiche(
  situation: Situation,
  bereiche: string[]
): boolean {
  if (situation === "notfall") {
    return true;
  }
  if (
    (situation === "erneuern" || situation === "neubauen") &&
    isElektroOnlyBereiche(bereiche)
  ) {
    return true;
  }
  if (situation === "kaputt" && kaputtSkipGroesse(bereiche)) {
    return true;
  }
  return false;
}

export function shouldFilterGroesseStep(
  situation: Situation,
  bereiche: string[],
  step: FunnelStep
): boolean {
  if (!step.id.toLowerCase().includes("groesse")) return false;
  return shouldSkipGroesseForBereiche(situation, bereiche);
}

/** Frage/Untertitel für den Größen-Schritt (nur Wandfläche / Maler-Pfad). */
export function applyGroesseStepCopy(
  step: FunnelStep,
  situation: Situation,
  bereiche: string[],
  fachdetails?: FachdetailsState
): FunnelStep {
  if (!step.id.toLowerCase().includes("groesse")) return step;
  const b = new Set(bereiche);
  if ((situation === "erneuern" || situation === "kaputt") && b.has("bad")) {
    return {
      ...step,
      question: "Wie groß ist das Bad ungefähr?",
      subtext: undefined,
    };
  }
  const malerish =
    b.has("waende") ||
    b.has("maler") ||
    b.has("streichen") ||
    b.has("waende_boeden");
  if (
    (situation === "erneuern" || situation === "kaputt") &&
    malerish &&
    !b.has("bad") &&
    !b.has("heizung")
  ) {
    return {
      ...step,
      question: "Wie groß ist die Wandfläche ungefähr?",
      subtext:
        "Tipp: Wandfläche ≈ Raumfläche × 2,5 — ein 20 m² Zimmer hat ca. 50 m² Wandfläche.",
    };
  }
  if (situation === "erneuern" && b.has("boden") && !b.has("bad")) {
    if (fachdetails?.boden?.aktuell === "balkon_belag") {
      return {
        ...step,
        question: "Wie groß ist die Balkon- bzw. Terrassenfläche?",
        subtext: "Ungefähre m² reichen",
      };
    }
    return {
      ...step,
      question: "Wie groß ist die Bodenfläche ungefähr?",
      subtext: undefined,
    };
  }
  if (
    situation === "betreuung" &&
    (b.has("garten") || b.has("gestaltung"))
  ) {
    return {
      ...step,
      question: "Wie groß ist die Gartenfläche?",
      subtext: "Hilft uns den Aufwand pro Besuch einzuschätzen",
    };
  }
  if (situation === "erneuern" && b.has("fassade") && bereiche.length === 1) {
    return {
      ...step,
      question: "Wie groß ist die Fassadenfläche ungefähr?",
      subtext: undefined,
    };
  }
  if (
    situation === "erneuern" &&
    b.has("trockenbau") &&
    bereiche.length === 1
  ) {
    return {
      ...step,
      question: "Wie viel neue Wandfläche entsteht ungefähr?",
      subtext: "In m² — ungefähre Angabe reicht",
    };
  }
  return step;
}

export const GROESSE_CONFIG: {
  flaeche: GroesseSliderConfig;
  wohnflaeche: GroesseSliderConfig;
  bad: GroesseSliderConfig;
  heizung: GroesseSliderConfig;
  malerWand: GroesseSliderConfig;
  stueck: GroesseSliderConfig;
  stueckKaputt: GroesseSliderConfig;
  stueckFensterErneuern: GroesseSliderConfig;
  garten: GroesseSliderConfig;
  laufmeter: GroesseSliderConfig;
  fassade: GroesseSliderConfig;
  trockenbau: GroesseSliderConfig;
  bodenBalkon: GroesseSliderConfig;
  reinigung: GroesseSliderConfig;
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
  bad: {
    min: 3,
    max: 20,
    step: 1,
    default: 6,
    einheit: "m²",
    einheitKurz: "m²",
    chips: [
      { label: "🚿 Klein", value: 4, hint: "3–5 m²" },
      { label: "🛁 Mittel", value: 6, hint: "5–8 m²" },
      { label: "✨ Groß", value: 10, hint: "8–12 m²" },
      { label: "🏊 Sehr groß", value: 14, hint: "12 m²+" },
    ],
  },
  heizung: {
    min: 40,
    max: 400,
    step: 10,
    default: 80,
    einheit: "m²",
    einheitKurz: "m²",
    chips: [
      { label: "🏠 Kleine Wohnung", value: 70, hint: "Bis 80 m²" },
      { label: "🏡 Mittlere Wohnung", value: 115, hint: "80–150 m²" },
      { label: "🏢 Großes Objekt", value: 200, hint: "150–250 m²" },
      { label: "🏗️ Sehr großes Objekt", value: 300, hint: "Über 250 m²" },
    ],
  },
  malerWand: {
    min: 10,
    max: 400,
    step: 5,
    default: 50,
    einheit: "m²",
    einheitKurz: "m²",
    chips: [
      { label: "🏠 Ein Zimmer", value: 35, hint: "Ca. 30–50 m² Wandfläche" },
      { label: "🏡 Mehrere Zimmer", value: 75, hint: "Ca. 50–100 m²" },
      { label: "🏢 Ganze Wohnung", value: 150, hint: "Ca. 100–200 m²" },
      { label: "🏗️ Großes Objekt", value: 250, hint: "Über 200 m²" },
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
      { label: "1–2", value: 2 },
      { label: "3–5", value: 4 },
      { label: "6–10", value: 8 },
      { label: "über 10", value: 12 },
    ],
  },
  stueckKaputt: {
    min: 1,
    max: 10,
    step: 1,
    default: 1,
    einheit: "Anzahl betroffen",
    einheitKurz: "Stück",
    chips: [
      { label: "1", value: 1 },
      { label: "2–3", value: 2 },
      { label: "4+", value: 5 },
    ],
  },
  stueckFensterErneuern: {
    min: 1,
    max: 20,
    step: 1,
    default: 3,
    einheit: "Anzahl Fenster / Türen",
    einheitKurz: "Stück",
    chips: [
      { label: "1–2", value: 2 },
      { label: "3–5", value: 4 },
      { label: "6–10", value: 8 },
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
      { label: "Klein", value: 60, hint: "Bis 100 m²" },
      { label: "Mittel", value: 200, hint: "100–300 m²" },
      { label: "Groß", value: 400, hint: "Über 300 m²" },
    ],
  },
  laufmeter: {
    min: 5,
    max: 200,
    step: 5,
    default: 18,
    einheit: "Gehweglänge in m",
    einheitKurz: "m",
    chips: [
      { label: "Bis 25 m", value: 18 },
      { label: "25–80 m", value: 50 },
      { label: "über 80 m", value: 120 },
    ],
  },
  fassade: {
    min: 20,
    max: 500,
    step: 10,
    default: 120,
    einheit: "Fassadenfläche in m²",
    einheitKurz: "m²",
    chips: [
      { label: "bis 80 m²", value: 60 },
      { label: "80–200 m²", value: 140 },
      { label: "200–350 m²", value: 275 },
      { label: "über 350 m²", value: 420 },
    ],
  },
  trockenbau: {
    min: 5,
    max: 100,
    step: 5,
    default: 25,
    einheit: "Neue Wandfläche in m²",
    einheitKurz: "m²",
    chips: [
      { label: "bis 15 m²", value: 12 },
      { label: "15–40 m²", value: 28 },
      { label: "40–70 m²", value: 55 },
      { label: "über 70 m²", value: 85 },
    ],
  },
  bodenBalkon: {
    min: 3,
    max: 30,
    step: 1,
    default: 12,
    einheit: "Balkon- bzw. Terrassenfläche in m²",
    einheitKurz: "m²",
    chips: [
      { label: "bis 8 m²", value: 6 },
      { label: "8–15 m²", value: 12 },
      { label: "15–25 m²", value: 20 },
      { label: "über 25 m²", value: 28 },
    ],
  },
  reinigung: {
    min: 20,
    max: 500,
    step: 10,
    default: 120,
    einheit: "Fläche in m²",
    einheitKurz: "m²",
    chips: [
      { label: "bis 80 m²", value: 60 },
      { label: "80–200 m²", value: 140 },
      { label: "200–350 m²", value: 275 },
      { label: "über 350 m²", value: 420 },
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
  state: Pick<FunnelState, "situation" | "bereiche" | "fachdetails">
): GroesseSliderConfig | null {
  const { situation, bereiche, fachdetails } = state;
  const b = bereiche;

  if (!situation) {
    return null;
  }

  if (situation === "notfall") {
    return GROESSE_CONFIG.pauschal;
  }

  if (situation === "betreuung" && isHausmeisterOnlyBereiche(b)) {
    return null;
  }

  if (shouldSkipGroesseForBereiche(situation, b)) {
    return null;
  }

  if (situation === "betreuung" && b.includes("reinigung")) {
    return GROESSE_CONFIG.reinigung;
  }

  if (situation === "betreuung" && b.includes("winter")) {
    return GROESSE_CONFIG.laufmeter;
  }

  if (
    situation === "kaputt" &&
    b.includes("fenster_tuer") &&
    !b.includes("fenster")
  ) {
    return GROESSE_CONFIG.stueckKaputt;
  }

  const fensterErneuern =
    situation === "erneuern" &&
    b.includes("fenster") &&
    !b.includes("fenster_tuer");
  if (fensterErneuern) {
    return GROESSE_CONFIG.stueckFensterErneuern;
  }

  if (
    situation === "betreuung" &&
    (b.includes("garten") || b.includes("gestaltung"))
  ) {
    return GROESSE_CONFIG.garten;
  }

  if (situation === "betreuung" && b.includes("baum")) {
    return GROESSE_CONFIG.stueck;
  }

  if (situation === "erneuern" && b.includes("fassade") && b.length === 1) {
    return GROESSE_CONFIG.fassade;
  }

  if (
    situation === "erneuern" &&
    b.includes("trockenbau") &&
    b.length === 1
  ) {
    return GROESSE_CONFIG.trockenbau;
  }

  if (b.includes("bad")) {
    return GROESSE_CONFIG.bad;
  }
  if (b.includes("heizung")) {
    return GROESSE_CONFIG.heizung;
  }
  if (
    b.includes("waende") ||
    b.includes("maler") ||
    b.includes("streichen") ||
    b.includes("waende_boeden")
  ) {
    return GROESSE_CONFIG.malerWand;
  }
  if (b.includes("boden")) {
    if (fachdetails?.boden?.aktuell === "balkon_belag") {
      return GROESSE_CONFIG.bodenBalkon;
    }
    return {
      ...GROESSE_CONFIG.flaeche,
      min: 10,
      max: 200,
      default: 45,
      einheit: "Bodenfläche in m²",
    };
  }
  if (b.includes("fenster") || b.includes("fenster_tueren")) {
    return GROESSE_CONFIG.stueckFensterErneuern;
  }

  return GROESSE_CONFIG.flaeche;
}
