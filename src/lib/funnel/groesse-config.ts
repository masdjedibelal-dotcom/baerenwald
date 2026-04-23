import type {
  FachdetailsState,
  FunnelState,
  FunnelStep,
  Situation,
} from "./types";
import {
  erneuernProjektTyp,
  isErneuernProjektBereich,
} from "./projekt-erneuern";

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
  /** Nur Raum-Kacheln, kein Slider (Wandfläche intern als m²) */
  hideSlider?: boolean;
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

export function shouldSkipGroesseForBereiche(
  situation: Situation,
  bereiche: string[]
): boolean {
  if (situation === "notfall" || situation === "kaputt") {
    return true;
  }
  if (
    (situation === "erneuern" || situation === "neubauen") &&
    isElektroOnlyBereiche(bereiche)
  ) {
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
  if (step.id === "erneuern_projekt_groesse") {
    const typ = erneuernProjektTyp(bereiche);
    if (typ === "ausbau_dg") {
      return {
        ...step,
        question: "Wie groß ist die Dachgeschoss-Projektfläche ca.?",
        subtext: "Angabe in m² — für das GU-Gesamtpaket",
      };
    }
    if (typ === "ausbau_keller") {
      return {
        ...step,
        question: "Wie groß ist die Kellerausbau-Fläche ca.?",
        subtext: "Angabe in m² — inkl. Feuchteschutz-Anteil im Paket",
      };
    }
    if (typ === "terrasse_neu") {
      return {
        ...step,
        question: "Wie groß soll die Terrasse werden?",
        subtext:
          "Fläche in m² — Erdarbeiten und Unterbau sind im Rahmen berücksichtigt",
      };
    }
    if (typ === "gartengestaltung") {
      return {
        ...step,
        question: "Wie groß ist die Gartenfläche ungefähr?",
        subtext: "m² — für Material- und Lohnkosten im GU-Paket",
      };
    }
  }
  if (
    situation === "betreuung" &&
    bereiche.includes("baum") &&
    step.id === "betreuung_groesse"
  ) {
    return {
      ...step,
      question: "Wie viele Bäume betrifft das?",
      subtext: "Ungefähre Anzahl — für den Aufwand",
    };
  }
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
      question: "Wie viele Räume sollen gestrichen werden?",
      subtext:
        "Wähle die passende Größe — wir rechnen intern mit typischer Wandfläche.",
    };
  }
  if (situation === "erneuern" && b.has("boden") && !b.has("bad")) {
    if (fachdetails?.boden?.aktuell === "balkon_belag") {
      return {
        ...step,
        question: "Wie groß ist die Balkonfläche?",
        subtext: "Ungefähre m² reichen",
      };
    }
    return {
      ...step,
      question: "Wie groß ist die Bodenfläche ungefähr?",
      subtext: undefined,
    };
  }
  if (situation === "betreuung" && b.has("garten")) {
    return {
      ...step,
      question: "Wie groß ist die Gartenfläche?",
      subtext: "Hilft uns den Aufwand pro Besuch einzuschätzen",
    };
  }
  if (
    situation === "erneuern" &&
    (b.has("fassade") || fachdetails?.maler?.was === "fassade")
  ) {
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
  if (
    (situation === "erneuern" || situation === "kaputt") &&
    b.has("dach") &&
    (fachdetails?.dach?.vorhaben === "daemmung" ||
      fachdetails?.dach?.vorhaben === "komplett")
  ) {
    return {
      ...step,
      question: "Wie groß ist die einzudeckende Dachfläche ungefähr?",
      subtext:
        "Angabe in m². Dämmung und Komplett-Eindeckung sind im Rechner zwei getrennte Positionen — eine Kombination aus beiden klären wir beim Aufmaß.",
    };
  }
  if (
    (situation === "erneuern" || situation === "kaputt") &&
    b.has("dach") &&
    fachdetails?.dach?.vorhaben === "regenrinne"
  ) {
    return {
      ...step,
      question: "Wie viele Laufmeter Regenrinne / Ablauf ungefähr?",
      subtext:
        "Gesamtlänge Rinne, Fallrohr und Anschluss — grobe Angabe reicht für den Rahmen.",
    };
  }
  if (
    (situation === "erneuern" || situation === "kaputt") &&
    b.has("dach") &&
    fachdetails?.dach?.vorhaben === "dachfenster"
  ) {
    return {
      ...step,
      question: "Wie viele Dachfenster sollen eingebaut werden?",
      subtext: undefined,
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
  dachRegenrinne: GroesseSliderConfig;
  dachDachfenster: GroesseSliderConfig;
  fassade: GroesseSliderConfig;
  trockenbau: GroesseSliderConfig;
  bodenBalkon: GroesseSliderConfig;
  /** DG-, Keller-, Terrassen-Projekt unter „Ausbau & Umbau“. */
  projektAusbau: GroesseSliderConfig;
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
    default: 40,
    einheit: "m²",
    einheitKurz: "m²",
    hideSlider: true,
    chips: [
      {
        label: "Ein Zimmer",
        value: 40,
        hint: "z. B. Schlafzimmer oder Kinderzimmer",
      },
      {
        label: "Zwei bis drei Zimmer",
        value: 90,
        hint: "z. B. Wohn- und Esszimmer",
      },
      {
        label: "Ganze Wohnung",
        value: 160,
        hint: "Alle Räume inkl. Flur",
      },
      {
        label: "Großes Objekt",
        value: 280,
        hint: "Büro oder Mehrfamilienhaus",
      },
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
  dachRegenrinne: {
    min: 5,
    max: 120,
    step: 1,
    default: 18,
    einheit: "Laufmeter Regenrinne / Ablauf (ca.)",
    einheitKurz: "m",
    chips: [
      { label: "Bis 15 m", value: 12 },
      { label: "15–30 m", value: 24 },
      { label: "30–50 m", value: 40 },
      { label: "über 50 m", value: 65 },
    ],
  },
  dachDachfenster: {
    min: 1,
    max: 12,
    step: 1,
    default: 1,
    einheit: "Anzahl Dachfenster",
    einheitKurz: "Stück",
    chips: [
      { label: "1", value: 1 },
      { label: "2", value: 2 },
      { label: "3–4", value: 3 },
      { label: "5+", value: 6 },
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
    einheit: "Balkonfläche in m²",
    einheitKurz: "m²",
    chips: [
      { label: "bis 8 m²", value: 6 },
      { label: "8–15 m²", value: 12 },
      { label: "15–25 m²", value: 20 },
      { label: "über 25 m²", value: 28 },
    ],
  },
  projektAusbau: {
    min: 8,
    max: 180,
    step: 2,
    default: 45,
    einheit: "Projektfläche in m²",
    einheitKurz: "m²",
    chips: [
      { label: "bis 25 m²", value: 20 },
      { label: "25–60 m²", value: 42 },
      { label: "60–120 m²", value: 85 },
      { label: "über 120 m²", value: 140 },
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

  if (situation === "erneuern" && isErneuernProjektBereich(b)) {
    const typ = erneuernProjektTyp(b);
    if (typ === "grundriss_umbau") return null;
    return GROESSE_CONFIG.projektAusbau;
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

  if (
    (situation === "erneuern" || situation === "kaputt") &&
    b.includes("dach") &&
    fachdetails?.dach?.vorhaben === "regenrinne"
  ) {
    return GROESSE_CONFIG.dachRegenrinne;
  }
  if (
    (situation === "erneuern" || situation === "kaputt") &&
    b.includes("dach") &&
    fachdetails?.dach?.vorhaben === "dachfenster"
  ) {
    return GROESSE_CONFIG.dachDachfenster;
  }

  const fensterErneuern =
    situation === "erneuern" &&
    b.includes("fenster") &&
    !b.includes("fenster_tuer");
  if (fensterErneuern) {
    return GROESSE_CONFIG.stueckFensterErneuern;
  }

  if (situation === "betreuung" && b.includes("garten")) {
    return GROESSE_CONFIG.garten;
  }

  /** Baum: nur Stückzahl, kein Objekt-/Grundstücksformat */
  if (situation === "betreuung" && b.includes("baum")) {
    return GROESSE_CONFIG.stueck;
  }

  if (
    situation === "erneuern" &&
    (b.includes("fassade") || fachdetails?.maler?.was === "fassade")
  ) {
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
