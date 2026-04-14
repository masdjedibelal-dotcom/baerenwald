import type { FunnelState, PriceLineItem } from "./types";

/** Basispreise München 2024/25 */
const PREISE = {
  maler: { min: 12, max: 22 },
  boden_standard: { min: 35, max: 55 },
  boden_premium: { min: 75, max: 140 },
  bad: { min: 6500, max: 20000 },
  kueche: { min: 650, max: 1800 },
  elektro_punkt: { min: 85, max: 140 },
  elektro_qm: { min: 28, max: 65 },
  heizung: { min: 8000, max: 22000 },
  heizung_wartung: { min: 180, max: 380 },
  sanitaer_std: { min: 90, max: 160 },
  dach: { min: 80, max: 180 },
  fassade: { min: 120, max: 220 },
  fenster: { min: 450, max: 1400 },
  trockenbau: { min: 45, max: 90 },
  gartenpflege: { min: 2.2, max: 3.8 },
  gartengestalt: { min: 90, max: 175 },
  baum: { min: 380, max: 2500 },
  reinigung: { min: 0.85, max: 1.5 },
  winterdienst: { min: 620, max: 1100 },
  ausbau: { min: 800, max: 1800 },
  terrasse: { min: 280, max: 650 },
} as const;

function effektiveFlaeche(state: FunnelState): number {
  const g = state.groesse;
  if (g != null && g > 0) return g;
  return 80;
}

function effektiveBaumAnzahl(state: FunnelState): number {
  const g = state.groesse;
  if (g != null && g > 0) return Math.round(g);
  return 1;
}

function notfallDringlichkeitsFaktor(
  d: FunnelState["dringlichkeit"]
): number {
  switch (d) {
    case "stabil":
      return 1.5;
    case "nutzbar":
      return 1.2;
    case "keine_eile":
      return 1.0;
    default:
      return 1.0;
  }
}

function pushLine(
  breakdown: PriceLineItem[],
  gewerk: string,
  beschreibung: string,
  min: number,
  max: number,
  einheit: string
) {
  breakdown.push({
    gewerk,
    beschreibung,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    einheit,
  });
}

function finalizeRange(
  rawMin: number,
  rawMax: number,
  breakdown: PriceLineItem[]
): { min: number; max: number; breakdown: PriceLineItem[] } {
  const finalMin = Math.round((rawMin * 0.85) / 100) * 100;
  const finalMax = Math.round((rawMax * 1.15) / 100) * 100;
  return { min: finalMin, max: finalMax, breakdown };
}

function sumBreakdown(breakdown: PriceLineItem[]): { rawMin: number; rawMax: number } {
  return breakdown.reduce(
    (acc, b) => ({
      rawMin: acc.rawMin + b.min,
      rawMax: acc.rawMax + b.max,
    }),
    { rawMin: 0, rawMax: 0 }
  );
}

function calcRenovieren(state: FunnelState): PriceLineItem[] {
  const b = state.bereiche;
  const f = state.umfangFaktor || 1;
  const breakdown: PriceLineItem[] = [];
  const qm = effektiveFlaeche(state);

  if (b.includes("bad")) {
    pushLine(
      breakdown,
      "Bad",
      "Badsanierung",
      PREISE.bad.min * f,
      PREISE.bad.max * f,
      "Pauschale"
    );
  }
  if (b.includes("kueche")) {
    pushLine(
      breakdown,
      "Küche",
      "Küchenanschluss & Ausbau",
      PREISE.kueche.min * f,
      PREISE.kueche.max * f,
      "Pauschale"
    );
  }
  if (b.includes("waende_boeden")) {
    const wandQm = qm * 2.5;
    pushLine(
      breakdown,
      "Maler",
      "Wände streichen / tapezieren",
      wandQm * PREISE.maler.min * f,
      wandQm * PREISE.maler.max * f,
      "€"
    );
    pushLine(
      breakdown,
      "Boden",
      "Boden Standard",
      qm * PREISE.boden_standard.min * f,
      qm * PREISE.boden_standard.max * f,
      "€"
    );
  }
  if (b.includes("fenster_tueren")) {
    const stueck = 3;
    pushLine(
      breakdown,
      "Fenster",
      "ca. 3 Fenster / Türen",
      stueck * PREISE.fenster.min * f,
      stueck * PREISE.fenster.max * f,
      "€"
    );
  }
  return breakdown;
}

function calcSanieren(state: FunnelState): PriceLineItem[] {
  const b = state.bereiche;
  const f = state.umfangFaktor || 1;
  const breakdown: PriceLineItem[] = [];
  const qm = effektiveFlaeche(state);

  if (b.includes("heizung")) {
    pushLine(
      breakdown,
      "Heizung",
      "Heizungssanierung / Tausch",
      PREISE.heizung.min * f,
      PREISE.heizung.max * f,
      "Pauschale"
    );
  }
  if (b.includes("dach")) {
    const dachQm = qm * 0.8;
    pushLine(
      breakdown,
      "Dach",
      "Dachfläche (ca. 0,8 × Wohnfläche)",
      dachQm * PREISE.dach.min * f,
      dachQm * PREISE.dach.max * f,
      "€"
    );
  }
  if (b.includes("fassade")) {
    const fassQm = qm * 2.2;
    pushLine(
      breakdown,
      "Fassade",
      "Fassadenfläche (ca. 2,2 × Wohnfläche)",
      fassQm * PREISE.fassade.min * f,
      fassQm * PREISE.fassade.max * f,
      "€"
    );
  }
  if (b.includes("elektrik")) {
    pushLine(
      breakdown,
      "Elektro",
      "Elektro nach Fläche",
      qm * PREISE.elektro_qm.min * f,
      qm * PREISE.elektro_qm.max * f,
      "€"
    );
  }
  if (b.includes("fenster_daemmung")) {
    const stueck = Math.max(1, Math.round(qm / 20));
    pushLine(
      breakdown,
      "Fenster",
      "Fenstertausch / Dämmung",
      stueck * PREISE.fenster.min,
      stueck * PREISE.fenster.max,
      "€"
    );
    const fassAnteil = qm * 0.5;
    pushLine(
      breakdown,
      "Fassade",
      "Dämmung / Fassade (Anteil)",
      fassAnteil * PREISE.fassade.min * f,
      fassAnteil * PREISE.fassade.max * f,
      "€"
    );
  }
  return breakdown;
}

function calcNotfall(state: FunnelState): PriceLineItem[] {
  if (state.dringlichkeit === "akut") {
    return [];
  }
  const b = state.bereiche;
  const df = notfallDringlichkeitsFaktor(state.dringlichkeit);
  const breakdown: PriceLineItem[] = [];

  if (b.includes("heizung")) {
    pushLine(
      breakdown,
      "Heizung",
      "Notfall / Wartung",
      PREISE.heizung_wartung.min * df,
      PREISE.heizung_wartung.max * df,
      "Pauschale"
    );
  }
  if (b.includes("wasser") || b.includes("schaden")) {
    const h = 3;
    pushLine(
      breakdown,
      "Wasser & Rohre",
      `Kurzeinsatz ca. ${h} h`,
      PREISE.sanitaer_std.min * h * df,
      PREISE.sanitaer_std.max * h * df,
      "€"
    );
  }
  if (b.includes("strom")) {
    const punkte = 2;
    pushLine(
      breakdown,
      "Elektro",
      `ca. ${punkte} Arbeitspunkte`,
      PREISE.elektro_punkt.min * punkte * df,
      PREISE.elektro_punkt.max * punkte * df,
      "€"
    );
  }
  return breakdown;
}

function calcNeubauen(state: FunnelState): PriceLineItem[] {
  const b = state.bereiche;
  const planF = state.umfangFaktor || 1;
  const breakdown: PriceLineItem[] = [];
  const qm = effektiveFlaeche(state);

  if (b.includes("keller_dg") || b.includes("umbau")) {
    pushLine(
      breakdown,
      "Ausbau",
      "Keller / DG / Umbau",
      qm * PREISE.ausbau.min * planF,
      qm * PREISE.ausbau.max * planF,
      "€"
    );
  }
  if (b.includes("terrasse") || b.includes("anbau")) {
    pushLine(
      breakdown,
      "Terrasse / Außen",
      "Terrasse, Carport, Anbau",
      qm * PREISE.terrasse.min * planF,
      qm * PREISE.terrasse.max * planF,
      "€"
    );
  }
  return breakdown;
}

function calcBetreuung(state: FunnelState): PriceLineItem[] {
  const b = state.bereiche;
  const hf = state.umfangFaktor || 1;
  const breakdown: PriceLineItem[] = [];
  const qm = effektiveFlaeche(state);
  const monateGarten = 7;

  if (b.includes("garten")) {
    pushLine(
      breakdown,
      "Gartenpflege",
      `ca. ${monateGarten} Monate (Saison)`,
      qm * PREISE.gartenpflege.min * monateGarten * hf,
      qm * PREISE.gartenpflege.max * monateGarten * hf,
      "€"
    );
  }
  if (b.includes("gestaltung")) {
    pushLine(
      breakdown,
      "Gartengestaltung",
      "Einmalige Gestaltung",
      qm * PREISE.gartengestalt.min,
      qm * PREISE.gartengestalt.max,
      "€"
    );
  }
  if (b.includes("baum")) {
    const n = effektiveBaumAnzahl(state);
    pushLine(
      breakdown,
      "Baumpflege",
      `ca. ${n} Baum/Bäume`,
      n * PREISE.baum.min,
      n * PREISE.baum.max,
      "€"
    );
  }
  if (b.includes("winter")) {
    pushLine(
      breakdown,
      "Winterdienst",
      "Saisonpauschale",
      PREISE.winterdienst.min,
      PREISE.winterdienst.max,
      "Pauschale"
    );
  }
  if (b.includes("reinigung")) {
    const monate = 12;
    pushLine(
      breakdown,
      "Reinigung",
      `ca. ${monate} Monate`,
      qm * PREISE.reinigung.min * monate * hf,
      qm * PREISE.reinigung.max * monate * hf,
      "€"
    );
  }
  return breakdown;
}

/**
 * Berechnet Preisrahmen und Aufschlüsselung aus dem Bärenwald-Funnel-State.
 */
export function calculatePrice(state: FunnelState): {
  min: number;
  max: number;
  breakdown: PriceLineItem[];
} {
  if (!state.situation) {
    return finalizeRange(0, 0, []);
  }

  if (state.situation === "notfall" && state.dringlichkeit === "akut") {
    return { min: 0, max: 0, breakdown: [] };
  }

  let breakdown: PriceLineItem[] = [];

  switch (state.situation) {
    case "renovieren":
      breakdown = calcRenovieren(state);
      break;
    case "sanieren":
      breakdown = calcSanieren(state);
      break;
    case "notfall":
      breakdown = calcNotfall(state);
      break;
    case "neubauen":
      breakdown = calcNeubauen(state);
      break;
    case "betreuung":
      breakdown = calcBetreuung(state);
      break;
    default:
      breakdown = [];
  }

  const { rawMin, rawMax } = sumBreakdown(breakdown);
  if (breakdown.length === 0) {
    return { min: 0, max: 0, breakdown: [] };
  }

  return finalizeRange(rawMin, rawMax, breakdown);
}
