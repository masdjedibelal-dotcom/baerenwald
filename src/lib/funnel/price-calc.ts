import type { FunnelState, PriceLineItem } from "./types";

/** Echte Kollegenpreise (Richtwerte) */
const PREIS_ECHT = {
  sanitaer: {
    verstopfung: { min: 120, max: 350, einheit: "pauschal" },
    leck: { min: 150, max: 600, einheit: "pauschal" },
    wc: { min: 120, max: 350, einheit: "pauschal" },
    armatur: { min: 120, max: 280, einheit: "pauschal" },
  },
  elektro: {
    steckdose: { min: 80, max: 180, einheit: "pro Punkt" },
    fi_schalter: { min: 150, max: 350, einheit: "pauschal" },
    fehlersuche: { min: 150, max: 600, einheit: "pauschal" },
  },
  garten: {
    rasen: { min: 1.5, max: 3.0, einheit: "pro m²" },
    hecke: { min: 8, max: 35, einheit: "pro m² Hecke" },
    pflaster: { min: 90, max: 180, einheit: "pro m²" },
  },
} as const;

type EchtService = keyof typeof PREIS_ECHT;

/** Platzhalter / Marktpreise München (bestehende Logik) */
const PREIS_MARKT = {
  maler: { min: 12, max: 22 },
  /** Platzhalter Münchner Markt, pro m² */
  boden: { min: 35, max: 130 },
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

export const FAKTOREN = {
  zugaenglichkeit: {
    einfach: 1.0,
    mittel: 1.3,
    schwer: 1.6,
  },
  zustand: {
    gut: 1.0,
    mittel: 1.4,
    schlecht: 2.0,
  },
  dringlichkeit: {
    /** Notfall „akut“ im Funnel */
    akut: 2.0,
    sofort: 2.0,
    stabil: 1.5,
    nutzbar: 1.2,
    keine_eile: 1.0,
    flexibel: 1.0,
  },
  umfang: {
    auffrischen: 1.0,
    teil: 1.5,
    komplett: 2.2,
    unsicher: 1.5,
    ersetzen: 1.0,
    modernisieren: 1.6,
    beratung: 1.6,
    woechentlich: 0.85,
    zweiwochentlich: 0.9,
    monatlich: 1.0,
    saisonal: 1.1,
    einmalig: 1.3,
    idee: 1.2,
    vorstellung: 1.0,
    plaene: 0.9,
    bereit: 0.85,
  },
} as const;

const ECHT_GEWERK_LABEL: Record<EchtService, string> = {
  sanitaer: "Sanitär",
  elektro: "Elektro",
  garten: "Garten",
};

const ECHT_TYP_LABEL: Record<string, string> = {
  verstopfung: "Verstopfung",
  leck: "Leck / Rohr",
  wc: "Heizung / Warmwasser",
  armatur: "Bad — Armaturen / Einzelteile",
  steckdose: "Steckdose / Punkt",
  fi_schalter: "FI / Sicherungskasten",
  fehlersuche: "Fehlersuche",
  rasen: "Rasenpflege",
  hecke: "Hecke",
  pflaster: "Pflaster / Terrasse",
};

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
    case "akut":
      return 1.8;
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

function round50(n: number): number {
  return Math.round(n / 50) * 50;
}

function finalizeRange(
  rawMin: number,
  rawMax: number,
  breakdown: PriceLineItem[]
): { min: number; max: number; breakdown: PriceLineItem[] } {
  const finalMin = round50(rawMin * 0.85);
  const finalMax = round50(rawMax * 1.15);
  return { min: finalMin, max: finalMax, breakdown };
}

function sumBreakdown(breakdown: PriceLineItem[]): {
  rawMin: number;
  rawMax: number;
} {
  return breakdown.reduce(
    (acc, b) => ({
      rawMin: acc.rawMin + b.min,
      rawMax: acc.rawMax + b.max,
    }),
    { rawMin: 0, rawMax: 0 }
  );
}

/** Funnel-Antworten → Echtpreis-Untertyp (leer = Platzhalter-Pfad) */
export function mapToServiceType(state: FunnelState): {
  service: EchtService | "";
  type: string;
} {
  const { situation, bereiche } = state;

  if (situation === "notfall" && bereiche.includes("wasser")) {
    return { service: "sanitaer", type: "leck" };
  }
  if (situation === "notfall" && bereiche.includes("heizung")) {
    return { service: "sanitaer", type: "wc" };
  }
  if (situation === "notfall" && bereiche.includes("strom")) {
    return { service: "elektro", type: "fehlersuche" };
  }

  if (situation === "renovieren" && bereiche.includes("bad")) {
    return { service: "sanitaer", type: "armatur" };
  }

  if (situation === "sanieren" && bereiche.includes("elektrik")) {
    if (state.umfang === "ersetzen") {
      return { service: "elektro", type: "steckdose" };
    }
    return { service: "elektro", type: "fi_schalter" };
  }

  if (situation === "renovieren" && bereiche.includes("garten")) {
    return { service: "garten", type: "rasen" };
  }

  if (situation === "neubauen" && bereiche.includes("terrasse")) {
    return { service: "garten", type: "pflaster" };
  }

  return { service: "", type: "" };
}

function getEchtBasis(service: string, type: string) {
  if (service !== "sanitaer" && service !== "elektro" && service !== "garten") {
    return null;
  }
  const block = PREIS_ECHT[service];
  return (block as Record<string, { min: number; max: number; einheit: string }>)[
    type
  ];
}

function echtGesamtFaktor(state: FunnelState): number {
  const zugFaktor =
    FAKTOREN.zugaenglichkeit[
      (state.zugaenglichkeit ?? "einfach") as keyof typeof FAKTOREN.zugaenglichkeit
    ] ?? 1.0;
  const zustandFaktor =
    FAKTOREN.zustand[
      (state.zustand ?? "gut") as keyof typeof FAKTOREN.zustand
    ] ?? 1.0;
  const dringKey =
    (state.dringlichkeit ?? "flexibel") as keyof typeof FAKTOREN.dringlichkeit;
  const dringFaktor = FAKTOREN.dringlichkeit[dringKey] ?? 1.0;
  const umfangKey = (state.umfang ?? "auffrischen") as keyof typeof FAKTOREN.umfang;
  const umfangFaktor = FAKTOREN.umfang[umfangKey] ?? 1.0;
  return zugFaktor * zustandFaktor * dringFaktor * umfangFaktor;
}

function buildEchtLine(
  service: EchtService,
  type: string,
  state: FunnelState
): PriceLineItem | null {
  const basis = getEchtBasis(service, type);
  if (!basis) return null;

  const gesamtFaktor = echtGesamtFaktor(state);
  const groesse = state.groesse ?? effektiveFlaeche(state);
  const einheit = basis.einheit;
  const multiplier =
    einheit.includes("m²") && !einheit.includes("Monat") ? groesse : 1;

  const rawMin = basis.min * multiplier * gesamtFaktor;
  const rawMax = basis.max * multiplier * gesamtFaktor;

  return {
    gewerk: ECHT_GEWERK_LABEL[service],
    beschreibung: ECHT_TYP_LABEL[type] ?? type,
    min: round50(rawMin),
    max: round50(rawMax),
    einheit,
  };
}

/** Eine oder mehrere Echtpreis-Zeilen; leer = Platzhalter-Pfad */
function collectMappedEchtLines(state: FunnelState): PriceLineItem[] {
  if (state.situation === "betreuung") {
    const b = state.bereiche;
    const lines: PriceLineItem[] = [];
    if (b.includes("gestaltung")) {
      const line = buildEchtLine("garten", "pflaster", state);
      if (line) lines.push(line);
    }
    if (b.includes("garten")) {
      const line = buildEchtLine("garten", "rasen", state);
      if (line) lines.push(line);
    }
    if (lines.length > 0) return lines;
  }

  const { service, type } = mapToServiceType(state);
  if (!service || !type) return [];
  const line = buildEchtLine(service, type, state);
  return line ? [line] : [];
}

/** Kurztext für die Ergebnis-Karte (Preisfaktoren) */
export function getBwPreisFaktorHint(state: FunnelState): string {
  const parts: string[] = [];
  if (state.zugaenglichkeit && state.zugaenglichkeit !== "einfach") {
    parts.push("Zugänglichkeit");
  }
  if (state.zustand && state.zustand !== "gut") {
    parts.push("Zustand der Fläche");
  }
  if (state.dringlichkeit === "akut") {
    parts.push("Soforteinsatz");
  }
  if (state.dringlichkeit === "stabil") {
    parts.push("Dringende Bearbeitung");
  }
  if (state.dringlichkeit === "nutzbar") {
    parts.push("Zeitnahe Bearbeitung");
  }
  return parts.length > 0
    ? parts.join(" · ")
    : "Standardpreis für München 2024/25";
}

function calcRenovieren(
  state: FunnelState,
  opts?: { skipBad?: boolean }
): PriceLineItem[] {
  const b = state.bereiche;
  const f = state.umfangFaktor || 1;
  const breakdown: PriceLineItem[] = [];
  const qm = effektiveFlaeche(state);

  if (b.includes("bad") && !opts?.skipBad) {
    pushLine(
      breakdown,
      "Bad",
      "Badsanierung",
      PREIS_MARKT.bad.min * f,
      PREIS_MARKT.bad.max * f,
      "Pauschale"
    );
  }
  if (b.includes("kueche")) {
    pushLine(
      breakdown,
      "Küche",
      "Küchenanschluss & Ausbau",
      PREIS_MARKT.kueche.min * f,
      PREIS_MARKT.kueche.max * f,
      "Pauschale"
    );
  }
  if (b.includes("waende_boeden")) {
    const wandQm = qm * 2.5;
    pushLine(
      breakdown,
      "Maler",
      "Wände streichen / tapezieren",
      wandQm * PREIS_MARKT.maler.min * f,
      wandQm * PREIS_MARKT.maler.max * f,
      "€"
    );
    pushLine(
      breakdown,
      "Boden",
      "Boden Standard",
      qm * PREIS_MARKT.boden.min * f,
      qm * PREIS_MARKT.boden.max * f,
      "€"
    );
  }
  if (b.includes("fenster_tueren")) {
    const stueck = 3;
    pushLine(
      breakdown,
      "Fenster",
      "ca. 3 Fenster / Türen",
      stueck * PREIS_MARKT.fenster.min * f,
      stueck * PREIS_MARKT.fenster.max * f,
      "€"
    );
  }
  return breakdown;
}

function calcSanieren(
  state: FunnelState,
  opts?: { skipElektrik?: boolean }
): PriceLineItem[] {
  const b = state.bereiche;
  const f = state.umfangFaktor || 1;
  const breakdown: PriceLineItem[] = [];
  const qm = effektiveFlaeche(state);

  if (b.includes("heizung")) {
    pushLine(
      breakdown,
      "Heizung",
      "Heizungssanierung / Tausch",
      PREIS_MARKT.heizung.min * f,
      PREIS_MARKT.heizung.max * f,
      "Pauschale"
    );
  }
  if (b.includes("dach")) {
    const dachQm = qm * 0.8;
    pushLine(
      breakdown,
      "Dach",
      "Dachfläche (ca. 0,8 × Wohnfläche)",
      dachQm * PREIS_MARKT.dach.min * f,
      dachQm * PREIS_MARKT.dach.max * f,
      "€"
    );
  }
  if (b.includes("fassade")) {
    const fassQm = qm * 2.2;
    pushLine(
      breakdown,
      "Fassade",
      "Fassadenfläche (ca. 2,2 × Wohnfläche)",
      fassQm * PREIS_MARKT.fassade.min * f,
      fassQm * PREIS_MARKT.fassade.max * f,
      "€"
    );
  }
  if (b.includes("elektrik") && !opts?.skipElektrik) {
    pushLine(
      breakdown,
      "Elektro",
      "Elektro nach Fläche",
      qm * PREIS_MARKT.elektro_qm.min * f,
      qm * PREIS_MARKT.elektro_qm.max * f,
      "€"
    );
  }
  if (b.includes("fenster_daemmung")) {
    const stueck = Math.max(1, Math.round(qm / 20));
    pushLine(
      breakdown,
      "Fenster",
      "Fenstertausch / Dämmung",
      stueck * PREIS_MARKT.fenster.min,
      stueck * PREIS_MARKT.fenster.max,
      "€"
    );
    const fassAnteil = qm * 0.5;
    pushLine(
      breakdown,
      "Fassade",
      "Dämmung / Fassade (Anteil)",
      fassAnteil * PREIS_MARKT.fassade.min * f,
      fassAnteil * PREIS_MARKT.fassade.max * f,
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
      PREIS_MARKT.heizung_wartung.min * df,
      PREIS_MARKT.heizung_wartung.max * df,
      "Pauschale"
    );
  }
  if (b.includes("wasser") || b.includes("schaden")) {
    const h = 3;
    pushLine(
      breakdown,
      "Wasser & Rohre",
      `Kurzeinsatz ca. ${h} h`,
      PREIS_MARKT.sanitaer_std.min * h * df,
      PREIS_MARKT.sanitaer_std.max * h * df,
      "€"
    );
  }
  if (b.includes("strom")) {
    const punkte = 2;
    pushLine(
      breakdown,
      "Elektro",
      `ca. ${punkte} Arbeitspunkte`,
      PREIS_MARKT.elektro_punkt.min * punkte * df,
      PREIS_MARKT.elektro_punkt.max * punkte * df,
      "€"
    );
  }
  return breakdown;
}

function calcNeubauen(
  state: FunnelState,
  opts?: { skipTerrasseAnbau?: boolean }
): PriceLineItem[] {
  const b = state.bereiche;
  const planF = state.umfangFaktor || 1;
  const breakdown: PriceLineItem[] = [];
  const qm = effektiveFlaeche(state);

  if (b.includes("keller_dg") || b.includes("umbau")) {
    pushLine(
      breakdown,
      "Ausbau",
      "Keller / DG / Umbau",
      qm * PREIS_MARKT.ausbau.min * planF,
      qm * PREIS_MARKT.ausbau.max * planF,
      "€"
    );
  }
  if (
    !opts?.skipTerrasseAnbau &&
    (b.includes("terrasse") || b.includes("anbau"))
  ) {
    pushLine(
      breakdown,
      "Terrasse / Außen",
      "Terrasse, Carport, Anbau",
      qm * PREIS_MARKT.terrasse.min * planF,
      qm * PREIS_MARKT.terrasse.max * planF,
      "€"
    );
  }
  return breakdown;
}

function calcBetreuung(
  state: FunnelState,
  opts?: { skipGarten?: boolean; skipGestaltung?: boolean }
): PriceLineItem[] {
  const b = state.bereiche;
  const hf = state.umfangFaktor || 1;
  const breakdown: PriceLineItem[] = [];
  const qm = effektiveFlaeche(state);
  const monateGarten = 7;

  if (b.includes("garten") && !opts?.skipGarten) {
    pushLine(
      breakdown,
      "Gartenpflege",
      `ca. ${monateGarten} Monate (Saison)`,
      qm * PREIS_MARKT.gartenpflege.min * monateGarten * hf,
      qm * PREIS_MARKT.gartenpflege.max * monateGarten * hf,
      "€"
    );
  }
  if (b.includes("gestaltung") && !opts?.skipGestaltung) {
    pushLine(
      breakdown,
      "Gartengestaltung",
      "Einmalige Gestaltung",
      qm * PREIS_MARKT.gartengestalt.min,
      qm * PREIS_MARKT.gartengestalt.max,
      "€"
    );
  }
  if (b.includes("baum")) {
    const n = effektiveBaumAnzahl(state);
    pushLine(
      breakdown,
      "Baumpflege",
      `ca. ${n} Baum/Bäume`,
      n * PREIS_MARKT.baum.min,
      n * PREIS_MARKT.baum.max,
      "€"
    );
  }
  if (b.includes("winter")) {
    pushLine(
      breakdown,
      "Winterdienst",
      "Saisonpauschale",
      PREIS_MARKT.winterdienst.min,
      PREIS_MARKT.winterdienst.max,
      "Pauschale"
    );
  }
  if (b.includes("reinigung")) {
    const monate = 12;
    pushLine(
      breakdown,
      "Reinigung",
      `ca. ${monate} Monate`,
      qm * PREIS_MARKT.reinigung.min * monate * hf,
      qm * PREIS_MARKT.reinigung.max * monate * hf,
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

  const mappedLines = collectMappedEchtLines(state);
  if (mappedLines.length > 0) {
    let breakdown = [...mappedLines];
    const b = state.bereiche;

    if (
      state.situation === "neubauen" &&
      b.includes("terrasse") &&
      (b.includes("keller_dg") ||
        b.includes("umbau") ||
        b.includes("anbau"))
    ) {
      breakdown = [
        ...breakdown,
        ...calcNeubauen(state, { skipTerrasseAnbau: true }),
      ];
    }

    if (
      state.situation === "sanieren" &&
      b.includes("elektrik") &&
      b.some((x) => x !== "elektrik")
    ) {
      breakdown = [
        ...breakdown,
        ...calcSanieren(state, { skipElektrik: true }),
      ];
    }

    if (
      state.situation === "renovieren" &&
      b.includes("bad") &&
      b.some((x) => x !== "bad")
    ) {
      breakdown = [
        ...breakdown,
        ...calcRenovieren(state, { skipBad: true }),
      ];
    }

    if (
      state.situation === "betreuung" &&
      (b.includes("garten") || b.includes("gestaltung"))
    ) {
      breakdown = [
        ...breakdown,
        ...calcBetreuung(state, {
          skipGarten: true,
          skipGestaltung: true,
        }),
      ];
    }

    const { rawMin, rawMax } = sumBreakdown(breakdown);
    return finalizeRange(rawMin, rawMax, breakdown);
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
