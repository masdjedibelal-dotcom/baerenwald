import type { FunnelState, PriceLineItem } from "./types";

// ── PLZ → Faktoren (vereinfachte Stufen, vgl. FAKTOREN.plz) ─────────────────
const PLZ_STUFE_INNENSTADT = new Set<string>([
  "80331", "80333", "80335", "80336", "80337", "80469", "80538", "80539",
  "80801", "80802", "80803", "80804", "80805", "80807", "80809",
]);

export function getPlzFaktor(plz: string): number {
  if (!plz || plz.length < 5) return FAKTOREN.plz.stadt;
  if (PLZ_STUFE_INNENSTADT.has(plz)) return FAKTOREN.plz.innenstadt;
  const p3 = plz.slice(0, 3);
  if (p3 === "803" || p3 === "804" || p3 === "805") return FAKTOREN.plz.innenstadt;
  if (
    ["806", "807", "808", "809", "812", "813", "814", "815", "816", "817", "818", "819"].some(
      (x) => plz.startsWith(x)
    )
  ) {
    return FAKTOREN.plz.stadt;
  }
  if (
    plz.startsWith("82") ||
    plz.startsWith("83") ||
    plz.startsWith("84") ||
    plz.startsWith("85") ||
    plz.startsWith("86")
  ) {
    return FAKTOREN.plz.umland;
  }
  if (plz.startsWith("80") || plz.startsWith("81")) return FAKTOREN.plz.stadt;
  return FAKTOREN.plz.stadt;
}

/** Koordination mehrerer Gewerke — in der neuen Logik neutral (1.0). */
export function getKoordinationsRabatt(_anzahlBereiche: number): number {
  return 1.0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Basispreise (enge Ranges)
// ═══════════════════════════════════════════════════════════════════════════

type BasisEintrag = {
  min: number;
  max: number;
  einheit: string;
  groesseVon?: number;
  groesseBis?: number;
};

const PREISE = {
  sanitaer: {
    verstopfung: { min: 120, max: 180, einheit: "pauschal" },
    leck: { min: 150, max: 250, einheit: "pauschal" },
    wc: { min: 120, max: 180, einheit: "pauschal" },
    armatur: { min: 120, max: 180, einheit: "pauschal" },
  },
  elektro: {
    steckdose: { min: 90, max: 140, einheit: "pro Punkt" },
    fi_schalter: { min: 160, max: 280, einheit: "pauschal" },
    fehlersuche: { min: 160, max: 300, einheit: "pauschal" },
    leitungen: { min: 85, max: 130, einheit: "pro m" },
  },
  garten: {
    rasen: { min: 1.5, max: 2.5, einheit: "pro m²" },
    hecke: { min: 8, max: 18, einheit: "pro m²" },
    pflaster: { min: 90, max: 130, einheit: "pro m²" },
  },
  bad: {
    klein: {
      min: 8000,
      max: 11000,
      einheit: "pauschal",
      groesseVon: 0,
      groesseBis: 5,
    },
    mittel: {
      min: 12500,
      max: 17000,
      einheit: "pauschal",
      groesseVon: 5,
      groesseBis: 8,
    },
    gross: {
      min: 17000,
      max: 22500,
      einheit: "pauschal",
      groesseVon: 8,
      groesseBis: 12,
    },
    sehrgross: {
      min: 22500,
      max: 32000,
      einheit: "pauschal",
      groesseVon: 12,
      groesseBis: 999,
    },
  },
  maler: {
    waende: { min: 22, max: 35, einheit: "pro m²" },
    waende_decke: { min: 26, max: 42, einheit: "pro m²" },
    komplett: { min: 30, max: 48, einheit: "pro m²" },
    fassade: { min: 38, max: 58, einheit: "pro m²" },
  },
  boden: {
    laminat: { min: 32, max: 48, einheit: "pro m²" },
    parkett_standard: { min: 65, max: 95, einheit: "pro m²" },
    parkett_premium: { min: 95, max: 135, einheit: "pro m²" },
    vinyl: { min: 35, max: 52, einheit: "pro m²" },
    fliesen: { min: 70, max: 105, einheit: "pro m²" },
    teppich: { min: 22, max: 35, einheit: "pro m²" },
  },
  heizung: {
    klein: {
      min: 4500,
      max: 6500,
      einheit: "pauschal",
      groesseVon: 0,
      groesseBis: 100,
    },
    mittel: {
      min: 6500,
      max: 9500,
      einheit: "pauschal",
      groesseVon: 100,
      groesseBis: 200,
    },
    gross: {
      min: 9500,
      max: 14000,
      einheit: "pauschal",
      groesseVon: 200,
      groesseBis: 999,
    },
    wartung: { min: 180, max: 400, einheit: "pauschal" },
  },
  heizung_notfall: {
    einsatz: { min: 250, max: 500, einheit: "pauschal" },
  },
  dach: {
    ziegel: { min: 85, max: 130, einheit: "pro m²" },
    daemmung: { min: 120, max: 180, einheit: "pro m²" },
    komplett: { min: 160, max: 240, einheit: "pro m²" },
    dachfenster: { min: 900, max: 1800, einheit: "pro Stück" },
    regenrinne: { min: 38, max: 62, einheit: "pro lfd. m" },
  },
  trockenbau: {
    wand: { min: 48, max: 72, einheit: "pro m²" },
    decke: { min: 42, max: 65, einheit: "pro m²" },
  },
  fassade: {
    anstrich: { min: 38, max: 58, einheit: "pro m²" },
    daemmung: { min: 130, max: 200, einheit: "pro m²" },
    klinker: { min: 45, max: 70, einheit: "pro m²" },
  },
  fenster: {
    standard: { min: 600, max: 950, einheit: "pro Stück" },
    dachfenster: { min: 950, max: 1600, einheit: "pro Stück" },
    tuer: { min: 800, max: 1800, einheit: "pro Stück" },
  },
  reinigung: {
    regelmaessig: { min: 1.3, max: 2.0, einheit: "pro m²/Monat" },
    einmalig: { min: 2.8, max: 4.2, einheit: "pro m² einmalig" },
  },
  winterdienst: {
    saison: { min: 620, max: 920, einheit: "pro Saison" },
    einmalig: { min: 80, max: 160, einheit: "pauschal" },
  },
  hausmeister: {
    monatlich: { min: 320, max: 520, einheit: "pro Monat" },
  },
  abriss: {
    innen: { min: 25, max: 45, einheit: "pro m²" },
    komplett: { min: 8000, max: 18000, einheit: "pauschal" },
  },
  kueche: {
    montage: { min: 400, max: 900, einheit: "pauschal" },
  },
} as const;

export const FAKTOREN = {
  plz: {
    innenstadt: 1.12,
    stadt: 1.05,
    umland: 0.97,
  },
  dringlichkeit: {
    sofort: 1.4,
    heute: 1.3,
    woche: 1.1,
    flexibel: 1.0,
  },
} as const;

type PreisServiceKey = keyof typeof PREISE;

function isGroesseBasis(b: BasisEintrag): b is BasisEintrag & {
  groesseVon: number;
  groesseBis: number;
} {
  return typeof b.groesseVon === "number" && typeof b.groesseBis === "number";
}

function getBasis(
  service: string,
  type: string,
  groesse: number | null
): BasisEintrag | null {
  const serviceData = PREISE[service as PreisServiceKey];
  if (!serviceData) return null;

  if (type && type in serviceData) {
    const direct = serviceData[type as keyof typeof serviceData];
    if (direct && !isGroesseBasis(direct)) {
      return direct;
    }
  }

  const kategorien = Object.values(serviceData).filter(isGroesseBasis);
  if (kategorien.length > 0) {
    const gEff = groesse ?? 8;
    const passend = kategorien.find(
      (b) => gEff >= b.groesseVon && gEff < b.groesseBis
    );
    return passend ?? kategorien[kategorien.length - 1] ?? null;
  }

  if (type && type in serviceData) {
    return serviceData[type as keyof typeof serviceData] ?? null;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mapping Funnel → Service / Typ
// ═══════════════════════════════════════════════════════════════════════════

export function mapToServiceType(state: FunnelState): {
  service: PreisServiceKey | "";
  type: string;
} {
  const { situation, bereiche } = state;
  const fd = state.fachdetails;

  if (situation === "gewerbe" || situation === "gastro") {
    return { service: "", type: "" };
  }

  if (
    (situation === "renovieren" || situation === "sanieren") &&
    bereiche.includes("feuchtigkeit_schimmel")
  ) {
    return { service: "maler", type: "waende_decke" };
  }

  if (situation === "notfall" && bereiche.includes("wasser")) {
    return { service: "sanitaer", type: "leck" };
  }
  if (situation === "notfall" && bereiche.includes("heizung")) {
    return { service: "heizung_notfall", type: "einsatz" };
  }
  if (situation === "notfall" && bereiche.includes("strom")) {
    return { service: "elektro", type: "fehlersuche" };
  }

  if (
    bereiche.includes("maler") ||
    bereiche.includes("streichen") ||
    bereiche.includes("waende_boeden")
  ) {
    const was = fd?.maler?.was;
    if (was === "fassade") return { service: "fassade", type: "anstrich" };
    if (was === "komplett") {
      return { service: "maler", type: "komplett" };
    }
    if (was === "waende_decke") {
      return { service: "maler", type: "waende_decke" };
    }
    return { service: "maler", type: "waende" };
  }

  if (bereiche.includes("boden")) {
    const aktuell = fd?.boden?.aktuell;
    if (aktuell === "fliesen") return { service: "boden", type: "fliesen" };
    if (aktuell === "laminat") return { service: "boden", type: "laminat" };
    if (aktuell === "parkett") return { service: "boden", type: "parkett_standard" };
    if (aktuell === "teppich") return { service: "boden", type: "teppich" };
    return { service: "boden", type: "vinyl" };
  }

  if (bereiche.includes("bad")) {
    return { service: "bad", type: "" };
  }

  if (bereiche.includes("heizung")) {
    const typ = fd?.heizung?.typ;
    if (typ === "waermepumpe") return { service: "", type: "" };
    const vorhaben = fd?.heizung?.vorhaben;
    if (vorhaben === "wartung") return { service: "heizung", type: "wartung" };
    return { service: "heizung", type: "tausch" };
  }

  if (bereiche.includes("dach")) {
    const vorhaben = fd?.dach?.vorhaben;
    if (vorhaben === "ziegel") return { service: "dach", type: "ziegel" };
    if (vorhaben === "dachfenster") {
      return { service: "dach", type: "dachfenster" };
    }
    if (vorhaben === "regenrinne") return { service: "dach", type: "regenrinne" };
    return { service: "dach", type: "komplett" };
  }

  if (bereiche.includes("reinigung")) {
    if (state.umfang === "einmalig") {
      return { service: "reinigung", type: "einmalig" };
    }
    return { service: "reinigung", type: "regelmaessig" };
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

  if (situation === "neubauen" && (bereiche.includes("keller_dg") || bereiche.includes("umbau"))) {
    return { service: "trockenbau", type: "wand" };
  }

  if (situation === "betreuung") {
    if (bereiche.includes("gestaltung")) {
      return { service: "garten", type: "pflaster" };
    }
    if (bereiche.includes("garten")) {
      return { service: "garten", type: "rasen" };
    }
    if (bereiche.includes("winter")) {
      return { service: "winterdienst", type: "saison" };
    }
    if (bereiche.includes("reinigung")) {
      return { service: "reinigung", type: "regelmaessig" };
    }
    if (bereiche.includes("hausmeister")) {
      return { service: "hausmeister", type: "monatlich" };
    }
  }

  if (bereiche.includes("kueche")) {
    return { service: "kueche", type: "montage" };
  }

  if (bereiche.includes("fassade")) {
    return { service: "fassade", type: "anstrich" };
  }

  if (bereiche.includes("fenster_tueren")) {
    return { service: "fenster", type: "standard" };
  }

  return { service: "", type: "" };
}

const GEWERK_LABEL: Record<string, string> = {
  sanitaer: "Sanitär",
  elektro: "Elektro",
  garten: "Garten",
  bad: "Bad",
  maler: "Maler",
  boden: "Boden",
  heizung: "Heizung",
  heizung_notfall: "Heizung Notfall",
  dach: "Dach",
  trockenbau: "Trockenbau",
  fassade: "Fassade",
  fenster: "Fenster",
  reinigung: "Reinigung",
  winterdienst: "Winterdienst",
  hausmeister: "Hausmeister",
  abriss: "Abriss",
  kueche: "Küche",
};

const TYP_LABEL: Record<string, Record<string, string>> = {
  sanitaer: {
    verstopfung: "Verstopfung",
    leck: "Leck / Rohr",
    wc: "Heizung / Warmwasser",
    armatur: "Armatur",
  },
  elektro: {
    steckdose: "Steckdose / Punkt",
    fi_schalter: "FI / Sicherungskasten",
    fehlersuche: "Fehlersuche",
    leitungen: "Leitungen",
  },
  garten: {
    rasen: "Rasenpflege",
    hecke: "Hecke",
    pflaster: "Pflaster / Terrasse",
  },
  maler: {
    waende: "Wände streichen",
    waende_decke: "Wände + Decke",
    komplett: "Komplett (Wände + Decke)",
    fassade: "Fassade",
  },
  boden: {
    laminat: "Laminat",
    parkett_standard: "Parkett Standard",
    parkett_premium: "Parkett Premium",
    vinyl: "Vinyl",
    fliesen: "Fliesen",
    teppich: "Teppich",
  },
  heizung: {
    wartung: "Heizung Wartung",
    tausch: "Heizungstausch",
  },
  dach: {
    ziegel: "Dach — Einzelziegel",
    daemmung: "Dachdämmung",
    komplett: "Dach komplett",
    dachfenster: "Dachfenster",
    regenrinne: "Regenrinne",
  },
  fassade: {
    anstrich: "Fassade Anstrich",
    daemmung: "Fassade Dämmung",
    klinker: "Klinker / Verblendung",
  },
  fenster: {
    standard: "Fenster",
    dachfenster: "Dachfenster",
    tuer: "Haustür / Zimmertür",
  },
  reinigung: {
    regelmaessig: "Reinigung regelmäßig",
    einmalig: "Reinigung einmalig",
  },
  winterdienst: {
    saison: "Winterdienst Saison",
    einmalig: "Winterdienst einmalig",
  },
  hausmeister: { monatlich: "Hausmeister monatlich" },
  heizung_notfall: { einsatz: "Notfall-Einsatz Heizung" },
  abriss: {
    innen: "Abriss innen",
    komplett: "Abriss komplett",
  },
  kueche: { montage: "Küchenmontage" },
  trockenbau: { wand: "Trockenbau Wand", decke: "Trockenbau Decke" },
};

function beschreibungFor(service: string, type: string): string {
  const t = TYP_LABEL[service]?.[type];
  if (t) return t;
  if (service === "bad") return "Bad — Sanierung";
  return type || service;
}

// ═══════════════════════════════════════════════════════════════════════════
// Ergebnis / Schwellen
// ═══════════════════════════════════════════════════════════════════════════

export type BwResultModus =
  | "preisrahmen"
  | "preisrahmen_warnung"
  | "zu_komplex"
  | "notfall_akut";

const FALLBACK_MIN = 450;
const FALLBACK_MAX = 1800;

function getFallback(state: FunnelState): {
  min: number;
  max: number;
  mitte: number;
  breakdown: PriceLineItem[];
  plzFaktor: number;
} {
  const plzFaktor = getPlzFaktor(state.plz ?? "");
  const z = state.zeitraum ?? "flexibel";
  const dringFaktor =
    FAKTOREN.dringlichkeit[z as keyof typeof FAKTOREN.dringlichkeit] ?? 1.0;
  const mitte0 = (FALLBACK_MIN + FALLBACK_MAX) / 2;
  const halbSpanne = (FALLBACK_MAX - FALLBACK_MIN) / 2;
  const mitteAdj = mitte0 * plzFaktor * dringFaktor;
  let finalMin = Math.round((mitteAdj - halbSpanne) / 100) * 100;
  let finalMax = Math.round((mitteAdj + halbSpanne) / 100) * 100;
  if (finalMin < 150) {
    finalMin = 150;
    finalMax = Math.max(finalMax, 300);
  }
  return {
    min: finalMin,
    max: finalMax,
    mitte: mitteAdj,
    breakdown: [
      {
        gewerk: "allgemein",
        beschreibung: "Handwerksleistung",
        min: finalMin,
        max: finalMax,
        einheit: "pauschal",
      },
    ],
    plzFaktor,
  };
}

/** Frühe Szenarien ohne Preis — blendet z. B. Zustand/Zugänglichkeit aus. */
export function getBwResultModus(state: FunnelState): "normal" | "zu_komplex" {
  if (state.situation === "gewerbe" || state.situation === "gastro") {
    return "zu_komplex";
  }
  if (
    state.situation === "sanieren" &&
    (state.umfang === "komplett" || state.umfang === "beratung")
  ) {
    return "zu_komplex";
  }
  if (state.situation === "neubauen" && state.umfang === "idee") {
    return "zu_komplex";
  }
  if (state.fachdetails?.heizung?.vorhaben === "neu") {
    return "zu_komplex";
  }
  if (state.fachdetails?.garten?.baumgroesse === "gross") {
    return "zu_komplex";
  }
  return "normal";
}

export function getBwPreisFaktorHint(state: FunnelState): string {
  const parts: string[] = [];
  const plzF = getPlzFaktor(state.plz ?? "");
  if (plzF >= FAKTOREN.plz.innenstadt - 0.001) {
    parts.push("PLZ-Bereich Innenstadt");
  } else if (plzF <= FAKTOREN.plz.umland + 0.001) {
    parts.push("PLZ-Bereich Umland");
  }
  if (state.zeitraum === "sofort") parts.push("Sehr zeitnaher Startwunsch");
  if (state.zeitraum === "heute") parts.push("Kurzfristiger Startwunsch");
  if (state.zeitraum === "woche") parts.push("Termin innerhalb weniger Wochen");
  return parts.length > 0 ? parts.join(" · ") : "Standardrahmen München";
}

function getBwAnzeigeModus(
  state: FunnelState,
  result: { mitte: number; min: number; max: number }
): BwResultModus {
  if (state.situation === "notfall" && state.dringlichkeit === "akut") {
    return "notfall_akut";
  }
  if (state.situation === "gewerbe" || state.situation === "gastro") {
    return "zu_komplex";
  }
  if (
    state.situation === "sanieren" &&
    (state.umfang === "komplett" || state.umfang === "beratung")
  ) {
    return "zu_komplex";
  }
  if (state.situation === "neubauen" && state.umfang === "idee") {
    return "zu_komplex";
  }
  if (state.fachdetails?.heizung?.vorhaben === "neu") {
    return "zu_komplex";
  }
  if (state.fachdetails?.garten?.baumgroesse === "gross") {
    return "zu_komplex";
  }
  if (result.mitte > 15000) return "zu_komplex";
  if (result.mitte > 8000) return "preisrahmen_warnung";
  return "preisrahmen";
}

export type BwCalculatePriceResult = {
  min: number;
  max: number;
  /** Mittelwert nach PLZ- und Dringlichkeitsfaktor (für Schwellen / Anzeige) */
  mitte: number;
  breakdown: PriceLineItem[];
  mindestauftragAktiv: boolean;
  plzFaktor: number;
  koordinationsRabatt: number;
  resultModus: BwResultModus;
  schwellenwertAusgeloest: boolean;
  istFallback: boolean;
};

export type BwCalculatePriceOptions = {
  preview?: boolean;
};

function computePriceCore(state: FunnelState): {
  min: number;
  max: number;
  mitte: number;
  breakdown: PriceLineItem[];
  plzFaktor: number;
  istFallback: boolean;
  mindestauftragAktiv: boolean;
  service: string;
  type: string;
} | null {
  const { service, type } = mapToServiceType(state);
  if (!service) return null;

  const basis = getBasis(service, type, state.groesse);
  if (!basis) return null;

  const groesse = state.groesse ?? 1;
  const multiplier =
    basis.einheit.includes("m²") && !basis.einheit.includes("Monat")
      ? groesse
      : 1;

  const rawMin = basis.min * multiplier;
  const rawMax = basis.max * multiplier;
  const mitte0 = (rawMin + rawMax) / 2;
  const halbSpanne = (rawMax - rawMin) / 2;

  const plzFaktor = getPlzFaktor(state.plz ?? "");
  const z = state.zeitraum ?? "flexibel";
  const dringFaktor =
    FAKTOREN.dringlichkeit[z as keyof typeof FAKTOREN.dringlichkeit] ?? 1.0;

  const mitteAdjustiert = mitte0 * plzFaktor * dringFaktor;

  let mindestauftragAktiv = false;
  let finalMin = Math.round((mitteAdjustiert - halbSpanne) / 100) * 100;
  let finalMax = Math.round((mitteAdjustiert + halbSpanne) / 100) * 100;

  if (finalMin < 150) {
    mindestauftragAktiv = true;
    finalMin = 150;
    finalMax = Math.max(finalMax, 300);
  }

  if (finalMin > 0) {
    const spread = (finalMax - finalMin) / finalMin;
    if (spread > 0.5 && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn(
        `Spread zu hoch: ${String(service)}.${type || "(Größe)"} = ${(spread * 100).toFixed(0)}%`
      );
    }
  }

  const gewerkLabel = GEWERK_LABEL[service] ?? service;
  const breakdown: PriceLineItem[] = [
    {
      gewerk: gewerkLabel,
      beschreibung: beschreibungFor(service, type),
      min: finalMin,
      max: finalMax,
      einheit: basis.einheit,
    },
  ];

  return {
    min: finalMin,
    max: finalMax,
    mitte: mitteAdjustiert,
    breakdown,
    plzFaktor,
    istFallback: false,
    mindestauftragAktiv,
    service,
    type,
  };
}

function withMaybeZeroFallback(
  state: FunnelState,
  result: Omit<BwCalculatePriceResult, "istFallback"> & { istFallback?: boolean },
  options?: BwCalculatePriceOptions
): BwCalculatePriceResult {
  const base: BwCalculatePriceResult = {
    ...result,
    istFallback: Boolean(result.istFallback),
  };
  if (base.istFallback) return base;
  if (!state.situation) return { ...base, istFallback: false };
  if (!options?.preview) {
    if (state.situation === "notfall" && state.dringlichkeit === "akut") {
      return { ...base, istFallback: false };
    }
    if (getBwResultModus(state) === "zu_komplex") {
      return { ...base, istFallback: false };
    }
  }
  if (base.schwellenwertAusgeloest && base.resultModus === "zu_komplex") {
    return { ...base, istFallback: false };
  }
  if (
    base.resultModus === "zu_komplex" &&
    base.schwellenwertAusgeloest &&
    base.min <= 0
  ) {
    return { ...base, istFallback: false };
  }
  if ((base.breakdown?.length ?? 0) === 0 || base.min <= 0) {
    const fb = getFallback(state);
    const modus = getBwAnzeigeModus(state, fb);
    return {
      min: fb.min,
      max: fb.max,
      mitte: fb.mitte,
      breakdown: fb.breakdown,
      mindestauftragAktiv: false,
      plzFaktor: fb.plzFaktor,
      koordinationsRabatt: 1,
      resultModus: modus,
      schwellenwertAusgeloest: modus === "zu_komplex" && fb.mitte > 15000,
      istFallback: true,
    };
  }
  return { ...base, istFallback: false };
}

export function calculatePrice(
  state: FunnelState,
  options?: BwCalculatePriceOptions
): BwCalculatePriceResult {
  const preview = options?.preview === true;

  const noResult: BwCalculatePriceResult = {
    min: 0,
    max: 0,
    mitte: 0,
    breakdown: [],
    mindestauftragAktiv: false,
    plzFaktor: 1,
    koordinationsRabatt: 1,
    resultModus:
      state.situation === "notfall" && state.dringlichkeit === "akut"
        ? "notfall_akut"
        : "zu_komplex",
    schwellenwertAusgeloest: false,
    istFallback: false,
  };

  if (!state.situation) {
    return noResult;
  }

  if (!preview && state.situation === "notfall" && state.dringlichkeit === "akut") {
    return noResult;
  }

  if (!preview && getBwResultModus(state) === "zu_komplex") {
    return noResult;
  }

  const core = computePriceCore(state);
  if (!core) {
    const fb = getFallback(state);
    const modus = getBwAnzeigeModus(state, fb);
    return withMaybeZeroFallback(
      state,
      {
        min: fb.min,
        max: fb.max,
        mitte: fb.mitte,
        breakdown: fb.breakdown,
        mindestauftragAktiv: false,
        plzFaktor: fb.plzFaktor,
        koordinationsRabatt: 1,
        resultModus: modus,
        schwellenwertAusgeloest: modus === "zu_komplex",
        istFallback: true,
      },
      options
    );
  }

  let {
    min: finalMin,
    max: finalMax,
    mitte,
    breakdown,
    plzFaktor,
    istFallback,
    mindestauftragAktiv,
  } = core;

  let resultModus = getBwAnzeigeModus(state, {
    mitte,
    min: finalMin,
    max: finalMax,
  });
  let schwellenwertAusgeloest = resultModus === "zu_komplex" && mitte > 15000;

  if (resultModus === "zu_komplex" && mitte > 15000 && !preview) {
    finalMin = 0;
    finalMax = 0;
    breakdown = [];
  }

  if (
    preview &&
    state.situation === "notfall" &&
    state.dringlichkeit === "akut" &&
    breakdown.length === 0
  ) {
    return {
      min: 150,
      max: 600,
      mitte: 375,
      breakdown: [],
      mindestauftragAktiv: false,
      plzFaktor: getPlzFaktor(state.plz ?? ""),
      koordinationsRabatt: 1,
      resultModus: "preisrahmen",
      schwellenwertAusgeloest: false,
      istFallback: true,
    };
  }

  return withMaybeZeroFallback(
    state,
    {
      min: finalMin,
      max: finalMax,
      mitte,
      breakdown,
      mindestauftragAktiv,
      plzFaktor,
      koordinationsRabatt: 1,
      resultModus,
      schwellenwertAusgeloest,
      istFallback,
    },
    options
  );
}
