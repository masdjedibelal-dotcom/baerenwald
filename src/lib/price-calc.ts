import type {
  Dringlichkeit,
  FunnelState,
  PriceLineItem,
} from "@/lib/types";

/** B2B: mittel / viele Standorte → kein Online-Preis */
export function shouldSkipPriceCalculation(state: FunnelState): boolean {
  const v = state.answers.b2b_standorte;
  if (state.situation !== "b2b" || typeof v !== "string") return false;
  return v === "mittel" || v === "viele";
}

function zustandFactor(zustand: string): {
  factor: number;
  spreadUnbekannt: boolean;
} {
  switch (zustand) {
    case "gut":
      return { factor: 1.0, spreadUnbekannt: false };
    case "mittel":
      return { factor: 1.4, spreadUnbekannt: false };
    case "schlecht":
      return { factor: 2.0, spreadUnbekannt: false };
    case "unbekannt":
      return { factor: 1.0, spreadUnbekannt: true };
    default:
      return { factor: 1.0, spreadUnbekannt: true };
  }
}

function applyUnbekanntSpread(
  min: number,
  max: number,
  spread: boolean
): { min: number; max: number } {
  if (!spread) return { min, max };
  return { min: min * 0.7, max: max * 1.3 };
}

function monateFromFrequenz(frequenz: string): number {
  switch (frequenz) {
    case "woechentlich":
      return 12 * 4.33;
    case "zwewoechentlich":
      return 12 * 2.17;
    case "monatlich":
      return 12;
    case "saisonal":
      return 4;
    case "jaehrlich":
      return 1;
    case "bedarf":
      return 3;
    default:
      return 12;
  }
}

function frequenzRabatt(frequenz: string): number {
  switch (frequenz) {
    case "jaehrlich":
    case "bedarf":
      return 1.0;
    case "saisonal":
      return 0.9;
    case "monatlich":
      return 0.85;
    case "woechentlich":
    case "zwewoechentlich":
      return 0.8;
    default:
      return 1.0;
  }
}

function effectiveFlaeche(state: FunnelState): number {
  const raw = state.flaeche > 0 ? state.flaeche : 100;
  return Math.max(20, raw);
}

function notfallMultiplier(d: Dringlichkeit | null): number {
  return d === "notfall" ? 1.6 : 1;
}

/**
 * Summiert alle aktiven Gewerke zu min/max und liefert eine Zeile pro Gewerk.
 */
export function calculatePrice(state: FunnelState): {
  min: number;
  max: number;
  breakdown: PriceLineItem[];
} {
  if (shouldSkipPriceCalculation(state)) {
    return { min: 0, max: 0, breakdown: [] };
  }

  const flaeche = effectiveFlaeche(state);
  const breakdown: PriceLineItem[] = [];

  const gewerke = new Set(state.gewerke);

  const add = (item: PriceLineItem) => {
    breakdown.push(item);
  };

  function applyZustandToRange(
    minNoZ: number,
    maxNoZ: number
  ): { min: number; max: number } {
    const { factor, spreadUnbekannt: su } = zustandFactor(state.zustand);
    if (su) return applyUnbekanntSpread(minNoZ, maxNoZ, true);
    return { min: minNoZ * factor, max: maxNoZ * factor };
  }

  if (gewerke.has("maler")) {
    const base = flaeche * 2.5;
    const { min, max } = applyZustandToRange(base * 12 * 0.9, base * 18 * 1.15);
    add({
      gewerk: "Maler",
      beschreibung: "Wand- und Deckenarbeiten (geschätzte Wandfläche)",
      min,
      max,
      einheit: "€/m² Wandfläche",
    });
  }

  if (gewerke.has("boden")) {
    const { min, max } = applyZustandToRange(flaeche * 32, flaeche * 75);
    add({
      gewerk: "Boden",
      beschreibung: "Bodenbeläge verlegen",
      min,
      max,
      einheit: "Projekt",
      note: "Material abhängig — Laminat vs. Parkett vs. Fliesen",
    });
  }

  if (gewerke.has("sanitaer")) {
    add({
      gewerk: "Sanitär",
      beschreibung: "Bad-Komplett / Sanitär",
      min: 5800,
      max: 18000,
      einheit: "Projekt",
      note: "Stark abhängig von Ausstattung & Fliesen",
    });
  }

  if (gewerke.has("fliesen")) {
    const teil = flaeche * 0.35;
    add({
      gewerk: "Fliesen",
      beschreibung: "Fliesenarbeiten (ca. 35 % der Grundfläche)",
      min: teil * 55,
      max: teil * 120,
      einheit: "Projekt",
    });
  }

  if (gewerke.has("elektro")) {
    add({
      gewerk: "Elektro",
      beschreibung: "Endausbau Elektro",
      min: flaeche * 28,
      max: flaeche * 65,
      einheit: "Projekt",
      note: "Nur Endausbau (Steckdosen, Licht) — keine Leitungssanierung",
    });
  }

  if (gewerke.has("garten")) {
    const mon = monateFromFrequenz(state.frequenz);
    const rabatt = frequenzRabatt(state.frequenz);
    const pflegeMin = flaeche * 2.2 * mon * rabatt;
    const pflegeMax = pflegeMin * 1.35;
    add({
      gewerk: "Garten",
      beschreibung: "Gartenpflege (geschätzt nach Fläche & Frequenz)",
      min: pflegeMin,
      max: pflegeMax,
      einheit: "Projekt",
    });
    const gestMin = flaeche * 0.25 * 90;
    const gestMax = flaeche * 0.25 * 175;
    add({
      gewerk: "Garten",
      beschreibung: "Gartengestaltung / -pflege Teilfläche",
      min: gestMin,
      max: gestMax,
      einheit: "Projekt",
    });
  }

  if (gewerke.has("shk")) {
    let mn = 180;
    let mx = 380;
    const m = notfallMultiplier(state.dringlichkeit);
    mn *= m;
    mx *= m;
    add({
      gewerk: "SHK",
      beschreibung:
        state.dringlichkeit === "notfall"
          ? "Heizung / SHK — Notfall-Priorität"
          : "Heizung / SHK (Wartung / Einsatz)",
      min: mn,
      max: mx,
      einheit: "Projekt",
      note:
        state.dringlichkeit === "notfall"
          ? "Notfall-Zuschlag +60 %"
          : undefined,
    });
  }

  if (gewerke.has("reinigung")) {
    const mon = monateFromFrequenz(state.frequenz);
    add({
      gewerk: "Reinigung",
      beschreibung: "Gebäudereinigung (Jahresschätzung)",
      min: flaeche * 0.8 * mon,
      max: flaeche * 1.4 * mon,
      einheit: "Projekt",
    });
  }

  if (gewerke.has("winterdienst")) {
    add({
      gewerk: "Winterdienst",
      beschreibung: "Winterdienst (Saison-Schätzung)",
      min: 38 * 22 * 0.88,
      max: 38 * 22 * 1.15,
      einheit: "Projekt",
    });
  }

  if (gewerke.has("hausmeister")) {
    add({
      gewerk: "Hausmeister",
      beschreibung: "Hausmeisterservice",
      min: 450,
      max: 950,
      einheit: "€/Monat",
    });
  }

  if (gewerke.has("schlosser")) {
    add({
      gewerk: "Schlosser",
      beschreibung: "Tür, Fenster, Metall",
      min: 140,
      max: 520,
      einheit: "Projekt",
    });
  }

  if (gewerke.has("fassade")) {
    const f = flaeche * 0.4;
    add({
      gewerk: "Fassade",
      beschreibung: "Fassade / Außenbereich",
      min: f * 45,
      max: f * 120,
      einheit: "Projekt",
    });
  }

  const totalMin = breakdown.reduce((s, l) => s + l.min, 0);
  const totalMax = breakdown.reduce((s, l) => s + l.max, 0);

  return {
    min: Math.round(totalMin),
    max: Math.round(totalMax),
    breakdown,
  };
}

export function applyPricingToState(state: FunnelState): FunnelState {
  const { min, max, breakdown } = calculatePrice(state);
  return {
    ...state,
    priceMin: min,
    priceMax: max,
    priceBreakdown: breakdown,
  };
}

export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

export function formatCurrencyEUR(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}
