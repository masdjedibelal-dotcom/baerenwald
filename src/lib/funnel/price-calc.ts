import type { FunnelState, PriceLineItem } from "./types";

// ── PLZ-Faktoren München 2026 ──────────────────────────────────────────────
const PLZ_FAKTOREN: Record<string, number> = {
  // Innenstadt — teurer
  "80331": 1.15, "80333": 1.15, "80335": 1.12, "80336": 1.12, "80337": 1.12,
  "80469": 1.12, "80538": 1.15, "80539": 1.15,
  "80801": 1.12, "80802": 1.12, "80803": 1.12, "80804": 1.10, "80805": 1.10,
  "80807": 1.10, "80809": 1.08,
  // Stadtteile — normal
  "80634": 1.05, "80636": 1.05, "80637": 1.05, "80638": 1.05, "80639": 1.05,
  "80686": 1.03, "80687": 1.03, "80689": 1.03,
  "80796": 1.05, "80797": 1.05, "80798": 1.05, "80799": 1.08,
  "80937": 1.03, "80939": 1.03,
  "80992": 1.03, "80993": 1.03, "80995": 1.02, "80997": 1.02, "80999": 1.02,
  "81241": 1.03, "81243": 1.02, "81245": 1.02, "81247": 1.02, "81249": 1.02,
  "81369": 1.03, "81371": 1.03, "81373": 1.03, "81375": 1.03,
  "81377": 1.03, "81379": 1.03,
  "81477": 1.02, "81479": 1.02,
  "81539": 1.05, "81541": 1.05, "81543": 1.05, "81545": 1.05,
  "81547": 1.05, "81549": 1.05,
  "81667": 1.08, "81669": 1.08, "81671": 1.08, "81673": 1.05,
  "81675": 1.10, "81677": 1.10, "81679": 1.10,
  "81735": 1.03, "81737": 1.03, "81739": 1.03,
  "81825": 1.02, "81827": 1.02, "81829": 1.02,
  "81925": 1.08, "81927": 1.08, "81929": 1.08,
  // Umland — leicht günstiger
  "82031": 0.97, "82041": 0.97, "82049": 0.97, "82054": 0.97,
  "82131": 0.97, "82152": 0.97, "82166": 0.97, "82194": 0.97,
  "82205": 0.97, "82211": 0.97, "82216": 0.97, "82223": 0.97,
  "82229": 0.97, "82230": 0.97, "82256": 0.97,
  "82319": 0.95, "82340": 0.95, "82343": 0.95, "82346": 0.95,
  "82347": 0.95, "82349": 0.95, "82362": 0.95, "82380": 0.95,
  "82386": 0.95, "82387": 0.95, "82392": 0.95, "82393": 0.95,
  "82395": 0.95, "82396": 0.95, "82397": 0.95, "82398": 0.95,
  "82399": 0.95, "82402": 0.95, "82404": 0.95, "82405": 0.95,
  "82407": 0.95, "82409": 0.95,
  "85521": 0.97, "85540": 0.97, "85551": 0.97, "85579": 0.97,
  "85591": 0.97, "85598": 0.97, "85609": 0.97, "85622": 0.97,
  "85630": 0.97, "85635": 0.97, "85640": 0.97, "85646": 0.97,
  "85649": 0.97, "85652": 0.97, "85653": 0.97, "85656": 0.97,
  "85658": 0.97, "85659": 0.97, "85661": 0.97, "85662": 0.97,
  "85664": 0.97, "85667": 0.97, "85669": 0.97, "85670": 0.97,
  "85672": 0.97, "85673": 0.97, "85674": 0.97, "85676": 0.97,
  "85677": 0.97, "85678": 0.97, "85679": 0.97,
};

export function getPlzFaktor(plz: string): number {
  if (PLZ_FAKTOREN[plz]) return PLZ_FAKTOREN[plz];
  const p3 = plz.substring(0, 3);
  if (p3 === "803" || p3 === "804") return 1.10;
  if (["805", "806", "807", "808"].includes(p3)) return 1.05;
  if (plz.startsWith("80") || plz.startsWith("81")) return 1.03;
  if (
    plz.startsWith("82") || plz.startsWith("83") ||
    plz.startsWith("84") || plz.startsWith("85") ||
    plz.startsWith("86")
  ) return 0.97;
  return 1.0;
}

export function getKoordinationsRabatt(anzahlBereiche: number): number {
  if (anzahlBereiche >= 3) return 0.90;
  if (anzahlBereiche === 2) return 0.95;
  return 1.0;
}

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
/** Erweiterte Services inkl. Marktpreis-Typen */
type MappedService =
  | EchtService
  | "maler"
  | "boden"
  | "bad"
  | "kueche"
  | "heizung"
  | "dach"
  | "fassade"
  | "fenster"
  | "reinigung";

/** Korrigierte Münchner Marktpreise 2026 — engere Ranges, Spreizung über Faktoren */
const PREIS_MARKT = {
  // Maler
  maler_waende: { min: 18, max: 28, einheit: "pro m² Wandfläche" },
  maler_waende_decke: { min: 22, max: 35, einheit: "pro m² Wandfläche" },
  maler_fassade: { min: 40, max: 75, einheit: "pro m² Fassadenfläche" },
  // Boden
  boden_laminat: { min: 28, max: 55, einheit: "pro m² inkl. Material" },
  boden_parkett: { min: 55, max: 120, einheit: "pro m² inkl. Material" },
  boden_vinyl: { min: 35, max: 75, einheit: "pro m² inkl. Material" },
  boden_fliesen: { min: 65, max: 130, einheit: "pro m² inkl. Material" },
  boden_teppich: { min: 18, max: 45, einheit: "pro m² inkl. Material" },
  // Bad
  bad_fliesen: { min: 65, max: 120, einheit: "pro m²" },
  bad_komplett: { min: 8000, max: 18000, einheit: "pauschal" },
  bad_objekte: { min: 1200, max: 4500, einheit: "pauschal" },
  // Küche
  kueche_aufbau: { min: 400, max: 900, einheit: "pauschal Montage" },
  // Heizung
  heizung_gas: { min: 5500, max: 12000, einheit: "pauschal inkl. Material" },
  heizung_waermepumpe: { min: 15000, max: 35000, einheit: "pauschal inkl. Material" },
  heizung_wartung: { min: 180, max: 380, einheit: "pauschal jährlich" },
  // Dach
  dach_ziegel: { min: 80, max: 160, einheit: "pro m²" },
  dach_komplett: { min: 150, max: 320, einheit: "pro m²" },
  dach_regenrinne: { min: 35, max: 80, einheit: "pro laufendem Meter" },
  // Fassade
  fassade_anstrich: { min: 35, max: 65, einheit: "pro m²" },
  fassade_daemmung: { min: 120, max: 220, einheit: "pro m²" },
  // Fenster
  fenster_standard: { min: 550, max: 1200, einheit: "pro Stück inkl. Einbau" },
  fenster_dachfenster: { min: 900, max: 2200, einheit: "pro Stück inkl. Einbau" },
  // Trockenbau
  trockenbau_wand: { min: 45, max: 75, einheit: "pro m²" },
  trockenbau_decke: { min: 38, max: 70, einheit: "pro m²" },
  // Reinigung
  reinigung_regelmaessig: { min: 1.2, max: 2.5, einheit: "pro m²/Monat" },
  reinigung_einmalig: { min: 2.5, max: 5.0, einheit: "pro m² einmalig" },
  // Winterdienst
  winterdienst_saison: { min: 580, max: 980, einheit: "pro Saison" },
  // Hausmeister
  hausmeister_monatlich: { min: 280, max: 650, einheit: "pro Monat" },
  // Ausbau
  ausbau_umbau: { min: 900, max: 1800, einheit: "pro m² Wohnfläche" },
  // Terrasse (Neubauen)
  terrasse_pflaster: { min: 280, max: 550, einheit: "pro m²" },
  // Gartenpflege
  gartenpflege: { min: 2.2, max: 3.8, einheit: "pro m²/Monat" },
  gartengestalt: { min: 90, max: 175, einheit: "pro m²" },
  baum: { min: 380, max: 1800, einheit: "pauschal" },
  // Elektro (Marktpfad)
  elektro_punkt: { min: 85, max: 140, einheit: "pro Punkt" },
  elektro_qm: { min: 28, max: 58, einheit: "pro m²" },
  // Sanitär Notfall
  sanitaer_std: { min: 90, max: 160, einheit: "pro Stunde" },
} as const;

const MINDESTAUFTRAG = 150;

/** Zugänglichkeit (Objekt erreichbar) */
export const ZUGAENGLICHKEIT_FAKTOR = {
  einfach: 1.0,
  mittel: 1.3,
  schwer: 1.6,
  unknown: 1.1,
} as const;

/** Zustand der Fläche / Substanz */
export const ZUSTAND_FAKTOR = {
  gut: 1.0,
  mittel: 1.4,
  schlecht: 2.0,
  unknown: 1.1,
} as const;

/**
 * Gewünschter Zeitraum (PLZ-Schritt) — wirkt auf den Preisrahmen
 * wie „Dringlichkeit“ aus Kundensicht.
 */
export const DRINGLICHKEIT_FAKTOR = {
  sofort: 2.0,
  heute: 1.6,
  woche: 1.2,
  flexibel: 1.0,
} as const;

export const FAKTOREN = {
  zugaenglichkeit: ZUGAENGLICHKEIT_FAKTOR,
  zustand: ZUSTAND_FAKTOR,
  /** Nur Notfall-Schritt „Wie schlimm…“ (nicht PLZ-Zeitraum) */
  dringlichkeit: {
    akut: 2.0,
    stabil: 1.5,
    nutzbar: 1.2,
    keine_eile: 1.0,
  },
  umfang: {
    auffrischen: 1.0,
    teil: 1.5,
    komplett: 2.2,
    unsicher: 1.1,
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
  kundentyp: {
    eigentuemer: 1.0,
    mieter: 1.1,
    hausverwaltung: 1.2,
    gewerbe: 1.4,
    gastro: 1.6,
  },
} as const;

/** Persönliche Planung statt Online-Preis (Wärmepumpe-Neubau / alte Ölheizung) */
export function getBwResultModus(
  state: FunnelState
): "normal" | "zu_komplex" {
  if (state.fachdetails?.garten?.baumgroesse === "gross") {
    return "zu_komplex";
  }
  const h = state.fachdetails?.heizung;
  if (h?.typ === "waermepumpe" && h?.vorhaben === "neu") {
    return "zu_komplex";
  }
  if (h?.typ === "oel" && h?.alter === "ueber20") {
    return "zu_komplex";
  }
  return "normal";
}

function zeitraumPreisFaktor(zeitraum: FunnelState["zeitraum"]): number {
  if (zeitraum == null) return 1.0;
  const legacyMap: Record<string, keyof typeof DRINGLICHKEIT_FAKTOR> = {
    "4wochen": "woche",
    "1-3monate": "woche",
    offen: "flexibel",
  };
  const raw = zeitraum as string;
  const key =
    legacyMap[raw] ?? (raw as keyof typeof DRINGLICHKEIT_FAKTOR);
  return DRINGLICHKEIT_FAKTOR[key] ?? 1.0;
}

const ECHT_GEWERK_LABEL: Record<MappedService, string> = {
  sanitaer: "Sanitär",
  elektro: "Elektro",
  garten: "Garten",
  maler: "Maler",
  boden: "Boden",
  bad: "Bad",
  kueche: "Küche",
  heizung: "Heizung",
  dach: "Dach",
  fassade: "Fassade",
  fenster: "Fenster",
  reinigung: "Reinigung",
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
  // Maler
  waende: "Wände streichen",
  waende_decke: "Wände + Decke streichen",
  fassade_anstrich: "Fassade — Anstrich",
  // Boden
  laminat: "Laminat (inkl. Material)",
  parkett: "Parkett (inkl. Material)",
  vinyl: "Vinyl / Designboden (inkl. Material)",
  fliesen_boden: "Fliesen Boden (inkl. Material)",
  teppich: "Teppich (inkl. Material)",
  // Bad
  bad_fliesen: "Bad — Fliesen",
  bad_komplett: "Bad — Komplettsanierung",
  bad_objekte: "Bad — Sanitärobjekte",
  // Küche
  aufbau: "Küche Montage",
  // Heizung
  gas: "Gasheizung Tausch",
  waermepumpe: "Wärmepumpe (Neueinbau)",
  wartung: "Heizung Wartung",
  // Dach
  ziegel: "Einzelne Ziegel",
  dach_komplett: "Dach komplett neu",
  regenrinne: "Regenrinne / Ablauf",
  // Fassade
  anstrich: "Fassade — Anstrich",
  daemmung: "Fassade — Dämmung",
  // Fenster
  standard: "Fenster Standard",
  dachfenster: "Dachfenster",
  // Reinigung
  regelmaessig: "Reinigung (regelmäßig)",
  einmalig: "Reinigung (einmalig)",
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
  breakdown: PriceLineItem[],
  state?: Pick<FunnelState, "plz" | "bereiche">
): {
  min: number;
  max: number;
  breakdown: PriceLineItem[];
  mindestauftragAktiv: boolean;
  plzFaktor: number;
  koordinationsRabatt: number;
} {
  let fMin = round50(rawMin * 0.85);
  let fMax = round50(rawMax * 1.15);

  // PLZ-Faktor anwenden
  const plzFaktor = state ? getPlzFaktor(state.plz ?? "") : 1.0;
  fMin = round50(fMin * plzFaktor);
  fMax = round50(fMax * plzFaktor);

  // Koordinationsrabatt bei mehreren Bereichen
  const koordinationsRabatt = state
    ? getKoordinationsRabatt(state.bereiche.length)
    : 1.0;
  fMin = round50(fMin * koordinationsRabatt);
  fMax = round50(fMax * koordinationsRabatt);

  // Mindestauftrag nach allen Faktoren prüfen
  let mindestauftragAktiv = false;
  if (fMin > 0 && fMin < MINDESTAUFTRAG) {
    fMax = Math.max(fMax, MINDESTAUFTRAG + 100);
    fMin = MINDESTAUFTRAG;
    mindestauftragAktiv = true;
  }

  return { min: fMin, max: fMax, breakdown, mindestauftragAktiv, plzFaktor, koordinationsRabatt };
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

function scaleBreakdownByGewerk(
  breakdown: PriceLineItem[],
  gewerke: string[],
  factor: number
): PriceLineItem[] {
  if (factor === 1) return breakdown;
  return breakdown.map((line) =>
    gewerke.includes(line.gewerk)
      ? {
          ...line,
          min: Math.round(line.min * factor * 100) / 100,
          max: Math.round(line.max * factor * 100) / 100,
        }
      : line
  );
}

/** Zusatzfaktoren aus Fachdetails auf Platzhalter-Zeilen (Gewerk-Namen) */
function applyFachdetailsLegacyScaling(
  breakdown: PriceLineItem[],
  state: FunnelState
): PriceLineItem[] {
  let out = breakdown;
  if (state.fachdetails?.maler?.zustand === "stark") {
    out = scaleBreakdownByGewerk(out, ["Maler", "Fassade"], 1.3);
  }
  if (state.fachdetails?.dach?.alter === "ueber40") {
    out = scaleBreakdownByGewerk(out, ["Dach"], 1.5);
  }
  if (
    state.fachdetails?.boden?.aktuell === "fliesen" &&
    state.fachdetails?.boden?.verlegung === "dick"
  ) {
    out = scaleBreakdownByGewerk(out, ["Boden"], 1.4);
  }
  return out;
}

/** Funnel-Antworten → Preis-Untertyp (leer = Platzhalter-Pfad) */
export function mapToServiceType(state: FunnelState): {
  service: MappedService | "";
  type: string;
} {
  const { situation, bereiche } = state;
  const fd = state.fachdetails;

  if (
    (situation === "renovieren" || situation === "sanieren") &&
    bereiche.includes("feuchtigkeit_schimmel")
  ) {
    return { service: "maler", type: "waende_decke" };
  }

  // ── NOTFALL ──
  if (situation === "notfall" && bereiche.includes("wasser")) {
    return { service: "sanitaer", type: "leck" };
  }
  if (situation === "notfall" && bereiche.includes("heizung")) {
    return { service: "sanitaer", type: "wc" };
  }
  if (situation === "notfall" && bereiche.includes("strom")) {
    return { service: "elektro", type: "fehlersuche" };
  }

  // ── MALER ──
  if (
    bereiche.includes("maler") ||
    bereiche.includes("streichen") ||
    bereiche.includes("waende_boeden")
  ) {
    const was = fd?.maler?.was;
    if (was === "fassade") return { service: "fassade", type: "anstrich" };
    if (was === "waende_decke" || was === "komplett")
      return { service: "maler", type: "waende_decke" };
    return { service: "maler", type: "waende" };
  }

  // ── BODEN ──
  if (bereiche.includes("boden")) {
    const aktuell = fd?.boden?.aktuell;
    if (aktuell === "fliesen") return { service: "boden", type: "fliesen" };
    if (aktuell === "laminat") return { service: "boden", type: "laminat" };
    return { service: "boden", type: "vinyl" };
  }

  // ── BAD ──
  if (bereiche.includes("bad")) {
    const badWas = fd?.sanitaer?.badWas;
    if (badWas === "komplett") return { service: "bad", type: "komplett" };
    if (badWas === "objekte") return { service: "bad", type: "objekte" };
    return { service: "bad", type: "fliesen" };
  }

  // ── HEIZUNG ──
  if (bereiche.includes("heizung")) {
    const typ = fd?.heizung?.typ;
    if (typ === "waermepumpe") return { service: "", type: "" }; // → zu_komplex via getBwResultModus
    const vorhaben = fd?.heizung?.vorhaben;
    if (vorhaben === "wartung") return { service: "heizung", type: "wartung" };
    return { service: "heizung", type: "gas" };
  }

  // ── DACH ──
  if (bereiche.includes("dach")) {
    const vorhaben = fd?.dach?.vorhaben;
    if (vorhaben === "ziegel") return { service: "dach", type: "ziegel" };
    if (vorhaben === "dachfenster")
      return { service: "fenster", type: "dachfenster" };
    if (vorhaben === "regenrinne") return { service: "dach", type: "regenrinne" };
    return { service: "dach", type: "komplett" };
  }

  // ── REINIGUNG ──
  if (bereiche.includes("reinigung")) {
    if (state.umfang === "einmalig") return { service: "reinigung", type: "einmalig" };
    return { service: "reinigung", type: "regelmaessig" };
  }

  // ── ELEKTRO ──
  if (situation === "sanieren" && bereiche.includes("elektrik")) {
    if (state.umfang === "ersetzen") {
      return { service: "elektro", type: "steckdose" };
    }
    return { service: "elektro", type: "fi_schalter" };
  }

  // ── GARTEN ──
  if (situation === "renovieren" && bereiche.includes("garten")) {
    return { service: "garten", type: "rasen" };
  }

  if (situation === "neubauen" && bereiche.includes("terrasse")) {
    return { service: "garten", type: "pflaster" };
  }

  return { service: "", type: "" };
}

const MARKT_SERVICE_TYPE_MAP: Partial<Record<string, Record<string, keyof typeof PREIS_MARKT>>> = {
  maler: {
    waende: "maler_waende",
    waende_decke: "maler_waende_decke",
  },
  boden: {
    laminat: "boden_laminat",
    parkett: "boden_parkett",
    vinyl: "boden_vinyl",
    fliesen: "boden_fliesen",
    teppich: "boden_teppich",
  },
  bad: {
    fliesen: "bad_fliesen",
    komplett: "bad_komplett",
    objekte: "bad_objekte",
  },
  kueche: {
    aufbau: "kueche_aufbau",
  },
  heizung: {
    gas: "heizung_gas",
    waermepumpe: "heizung_waermepumpe",
    wartung: "heizung_wartung",
  },
  dach: {
    ziegel: "dach_ziegel",
    komplett: "dach_komplett",
    regenrinne: "dach_regenrinne",
  },
  fassade: {
    anstrich: "fassade_anstrich",
    daemmung: "fassade_daemmung",
  },
  fenster: {
    standard: "fenster_standard",
    dachfenster: "fenster_dachfenster",
  },
  reinigung: {
    regelmaessig: "reinigung_regelmaessig",
    einmalig: "reinigung_einmalig",
  },
};

function getEchtBasis(service: string, type: string): { min: number; max: number; einheit: string } | null {
  // Direkte Echt-Preise (Sanitär, Elektro, Garten)
  if (service === "sanitaer" || service === "elektro" || service === "garten") {
    const block = PREIS_ECHT[service as EchtService];
    return (block as Record<string, { min: number; max: number; einheit: string }>)[type] ?? null;
  }
  // Marktpreis-Pfad
  const marktKey = MARKT_SERVICE_TYPE_MAP[service]?.[type];
  if (!marktKey) return null;
  return PREIS_MARKT[marktKey] as { min: number; max: number; einheit: string };
}

function fachdetailsBodenZugBonus(state: FunnelState): number {
  return state.fachdetails?.boden?.aktuell === "fliesen" &&
    state.fachdetails?.boden?.verlegung === "dick"
    ? 1.4
    : 1;
}

function fachdetailsMalerZustandBonus(state: FunnelState): number {
  return state.fachdetails?.maler?.zustand === "stark" ? 1.3 : 1;
}

function fachdetailsDachAlterBonus(state: FunnelState): number {
  return state.fachdetails?.dach?.alter === "ueber40" ? 1.5 : 1;
}

/** „Weiß ich nicht“-Antworten in Fachdetails → leichter Unsicherheits-Puffer */
function fachdetailsWeissNichtFactor(state: FunnelState): number {
  const fd = state.fachdetails;
  if (!fd) return 1;
  const w = (v: string | undefined) => v === "weiss_nicht";
  if (
    w(fd.elektro?.problem) ||
    w(fd.elektro?.folge) ||
    w(fd.sanitaer?.lage) ||
    w(fd.sanitaer?.rohre) ||
    w(fd.sanitaer?.badWas) ||
    w(fd.sanitaer?.notfallSchwere) ||
    w(fd.heizung?.typ) ||
    w(fd.heizung?.alter) ||
    w(fd.heizung?.vorhaben) ||
    w(fd.maler?.was) ||
    w(fd.maler?.zustand) ||
    w(fd.maler?.fassade) ||
    w(fd.boden?.aktuell) ||
    w(fd.boden?.verlegung) ||
    w(fd.dach?.vorhaben) ||
    w(fd.dach?.alter) ||
    w(fd.garten?.was) ||
    w(fd.garten?.haeufigkeit) ||
    w(fd.garten?.baumgroesse)
  ) {
    return 1.1;
  }
  return 1;
}

function echtGesamtFaktor(state: FunnelState): number {
  const umfangKey =
    (state.umfang ?? "auffrischen") as keyof typeof FAKTOREN.umfang;
  let umfangFaktor = FAKTOREN.umfang[umfangKey] ?? 1.0;
  const gartenH = state.fachdetails?.garten?.haeufigkeit;
  if (state.fachdetails?.garten?.was === "pflege") {
    if (gartenH === "woechentlich") umfangFaktor = 0.85;
    else if (gartenH === "einmalig") umfangFaktor = 1.3;
  }
  let zugFaktor: number =
    ZUGAENGLICHKEIT_FAKTOR[
      (state.zugaenglichkeit ?? "einfach") as keyof typeof ZUGAENGLICHKEIT_FAKTOR
    ] ?? 1.0;
  if (state.fachdetails?.sanitaer?.lage === "wand") {
    zugFaktor = Math.max(zugFaktor, ZUGAENGLICHKEIT_FAKTOR.schwer);
  }
  zugFaktor *= fachdetailsBodenZugBonus(state);
  let zustandFaktor =
    ZUSTAND_FAKTOR[
      (state.zustand ?? "gut") as keyof typeof ZUSTAND_FAKTOR
    ] ?? 1.0;
  zustandFaktor *= fachdetailsMalerZustandBonus(state);
  zustandFaktor *= fachdetailsDachAlterBonus(state);
  const dringFaktor = zeitraumPreisFaktor(state.zeitraum);
  const kundentypKey =
    state.situation === "gewerbe" || state.situation === "gastro"
      ? state.situation
      : ((state.kundentyp ?? "eigentuemer") as keyof typeof FAKTOREN.kundentyp);
  const kundentypFaktor =
    FAKTOREN.kundentyp[kundentypKey as keyof typeof FAKTOREN.kundentyp] ?? 1.0;
  return (
    umfangFaktor *
    zugFaktor *
    zustandFaktor *
    dringFaktor *
    kundentypFaktor *
    fachdetailsWeissNichtFactor(state)
  );
}

function buildEchtLine(
  service: MappedService,
  type: string,
  state: FunnelState
): PriceLineItem | null {
  const basis = getEchtBasis(service, type);
  if (!basis) return null;

  const gesamtFaktor = echtGesamtFaktor(state);
  const groesse = state.groesse ?? effektiveFlaeche(state);
  const einheit = basis.einheit;
  const isPauschal = einheit === "pauschal" || einheit.includes("pauschal");
  const multiplier = !isPauschal && einheit.includes("m²") && !einheit.includes("Monat") ? groesse : 1;

  const rawMin = basis.min * multiplier * gesamtFaktor;
  const rawMax = basis.max * multiplier * gesamtFaktor;

  return {
    gewerk: ECHT_GEWERK_LABEL[service] ?? service,
    beschreibung: ECHT_TYP_LABEL[type] ?? type,
    min: round50(rawMin),
    max: round50(rawMax),
    einheit,
  };
}

/** Eine oder mehrere Preis-Zeilen; leer = Platzhalter-Pfad */
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
  const line = buildEchtLine(service as MappedService, type, state);
  return line ? [line] : [];
}

/** Kurztext für die Ergebnis-Karte (Preisfaktoren) */
export function getBwPreisFaktorHint(state: FunnelState): string {
  const parts: string[] = [];
  if (
    state.zugaenglichkeit &&
    state.zugaenglichkeit !== "einfach" &&
    state.zugaenglichkeit !== "unknown"
  ) {
    parts.push("Zugänglichkeit");
  }
  if (
    state.zustand &&
    state.zustand !== "gut" &&
    state.zustand !== "unknown"
  ) {
    parts.push("Zustand der Fläche");
  }
  if (state.zugaenglichkeit === "unknown" || state.zustand === "unknown") {
    parts.push("Unsicherheit bei Angaben");
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
  if (state.zeitraum === "sofort") {
    parts.push("Sehr zeitnaher Startwunsch");
  }
  if (state.zeitraum === "heute") {
    parts.push("Terminwunsch diese Woche");
  }
  if (state.zeitraum === "woche") {
    parts.push("Termin innerhalb von 4 Wochen");
  }
  return parts.length > 0
    ? parts.join(" · ")
    : "Standardpreis für München 2026";
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
    const badWas = state.fachdetails?.sanitaer?.badWas;
    const badPreis = badWas === "komplett" ? PREIS_MARKT.bad_komplett : badWas === "objekte" ? PREIS_MARKT.bad_objekte : PREIS_MARKT.bad_fliesen;
    pushLine(
      breakdown,
      "Bad",
      badWas === "komplett" ? "Bad Komplettsanierung" : badWas === "objekte" ? "Bad — Einzelobjekte" : "Badsanierung",
      badPreis.min * f,
      badPreis.max * f,
      badPreis.einheit
    );
  }
  if (b.includes("kueche")) {
    pushLine(
      breakdown,
      "Küche",
      "Küche — Montage",
      PREIS_MARKT.kueche_aufbau.min * f,
      PREIS_MARKT.kueche_aufbau.max * f,
      PREIS_MARKT.kueche_aufbau.einheit
    );
  }
  const needMalerLine =
    b.includes("waende_boeden") ||
    b.includes("maler") ||
    b.includes("streichen");
  const needBodenLine = b.includes("waende_boeden") || b.includes("boden");

  if (needMalerLine) {
    const malerWas = state.fachdetails?.maler?.was;
    if (malerWas === "fassade") {
      const fassQm = qm * 2.2;
      pushLine(
        breakdown,
        "Fassade",
        "Außenbereich (laut Angaben)",
        fassQm * PREIS_MARKT.maler_fassade.min * f,
        fassQm * PREIS_MARKT.maler_fassade.max * f,
        PREIS_MARKT.maler_fassade.einheit
      );
    } else if (malerWas === "waende_decke" || malerWas === "komplett") {
      const wandQm = qm * 2.5;
      pushLine(
        breakdown,
        "Maler",
        "Wände + Decke streichen",
        wandQm * PREIS_MARKT.maler_waende_decke.min * f,
        wandQm * PREIS_MARKT.maler_waende_decke.max * f,
        PREIS_MARKT.maler_waende_decke.einheit
      );
    } else {
      const wandQm = qm * 2.5;
      pushLine(
        breakdown,
        "Maler",
        "Wände streichen",
        wandQm * PREIS_MARKT.maler_waende.min * f,
        wandQm * PREIS_MARKT.maler_waende.max * f,
        PREIS_MARKT.maler_waende.einheit
      );
    }
  }
  if (b.includes("feuchtigkeit_schimmel")) {
    const wandQm = qm * 2;
    pushLine(
      breakdown,
      "Feuchte / Schimmel",
      "Flächen trocknen, Ursache prüfen, Malerarbeiten",
      wandQm * PREIS_MARKT.maler_waende_decke.min * f,
      wandQm * PREIS_MARKT.maler_waende_decke.max * f,
      PREIS_MARKT.maler_waende_decke.einheit
    );
    pushLine(
      breakdown,
      "Sanitär",
      "Anschlüsse / Leitungsbereich (Anteil)",
      PREIS_MARKT.bad_objekte.min * 0.35 * f,
      PREIS_MARKT.bad_objekte.max * 0.55 * f,
      PREIS_MARKT.bad_objekte.einheit
    );
  }
  if (needBodenLine) {
    const bodenAktuell = state.fachdetails?.boden?.aktuell;
    const bodenPreis =
      bodenAktuell === "fliesen" ? PREIS_MARKT.boden_fliesen :
      bodenAktuell === "laminat" ? PREIS_MARKT.boden_laminat :
      bodenAktuell === "teppich" ? PREIS_MARKT.boden_teppich :
      PREIS_MARKT.boden_vinyl;
    const bodenLabel =
      bodenAktuell === "fliesen" ? "Fliesen (inkl. Material)" :
      bodenAktuell === "laminat" ? "Laminat (inkl. Material)" :
      bodenAktuell === "teppich" ? "Teppich (inkl. Material)" :
      "Boden Standard";
    pushLine(
      breakdown,
      "Boden",
      bodenLabel,
      qm * bodenPreis.min * f,
      qm * bodenPreis.max * f,
      bodenPreis.einheit
    );
  }
  if (b.includes("fenster_tueren")) {
    const stueck = state.groesse ?? 3;
    pushLine(
      breakdown,
      "Fenster",
      `ca. ${stueck} Fenster / Türen`,
      stueck * PREIS_MARKT.fenster_standard.min * f,
      stueck * PREIS_MARKT.fenster_standard.max * f,
      PREIS_MARKT.fenster_standard.einheit
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
    const heizPreis = PREIS_MARKT.heizung_gas;
    pushLine(
      breakdown,
      "Heizung",
      "Heizungssanierung / Tausch",
      heizPreis.min * f,
      heizPreis.max * f,
      heizPreis.einheit
    );
  }
  if (b.includes("dach")) {
    const dachVorhaben = state.fachdetails?.dach?.vorhaben;
    if (dachVorhaben === "dachfenster") {
      const stueck = Math.max(1, Math.round(qm / 80));
      pushLine(
        breakdown,
        "Dachfenster",
        `ca. ${stueck} Fenster (Schätzung)`,
        stueck * PREIS_MARKT.fenster_dachfenster.min * f,
        stueck * PREIS_MARKT.fenster_dachfenster.max * f,
        PREIS_MARKT.fenster_dachfenster.einheit
      );
    } else if (dachVorhaben === "regenrinne") {
      const lm = Math.max(10, Math.round(qm / 12));
      pushLine(
        breakdown,
        "Dach",
        `Regenrinne / Fallrohr (ca. ${lm} m)`,
        lm * PREIS_MARKT.dach_regenrinne.min * f,
        lm * PREIS_MARKT.dach_regenrinne.max * f,
        PREIS_MARKT.dach_regenrinne.einheit
      );
    } else {
      const dachPreis =
        dachVorhaben === "ziegel"
          ? PREIS_MARKT.dach_ziegel
          : PREIS_MARKT.dach_komplett;
      const dachQm = qm * 0.8;
      pushLine(
        breakdown,
        "Dach",
        dachVorhaben === "ziegel"
          ? "Einzelne Ziegel"
          : "Dachfläche (ca. 0,8 × Wohnfläche)",
        dachQm * dachPreis.min * f,
        dachQm * dachPreis.max * f,
        dachPreis.einheit
      );
    }
  }
  if (b.includes("feuchtigkeit_schimmel")) {
    const wandQm = qm * 2;
    pushLine(
      breakdown,
      "Feuchte / Schimmel",
      "Sanierung mit Sanitär- und Maleranteil",
      wandQm * PREIS_MARKT.maler_waende_decke.min * f,
      wandQm * PREIS_MARKT.maler_waende_decke.max * f,
      PREIS_MARKT.maler_waende_decke.einheit
    );
    pushLine(
      breakdown,
      "Sanitär",
      "Leitungen / Abdichtung (Anteil)",
      PREIS_MARKT.bad_objekte.min * 0.4 * f,
      PREIS_MARKT.bad_objekte.max * 0.6 * f,
      PREIS_MARKT.bad_objekte.einheit
    );
  }
  if (b.includes("fassade")) {
    const fassQm = qm * 2.2;
    pushLine(
      breakdown,
      "Fassade",
      "Fassadenfläche (ca. 2,2 × Wohnfläche)",
      fassQm * PREIS_MARKT.fassade_anstrich.min * f,
      fassQm * PREIS_MARKT.fassade_anstrich.max * f,
      PREIS_MARKT.fassade_anstrich.einheit
    );
  }
  if (b.includes("elektrik") && !opts?.skipElektrik) {
    pushLine(
      breakdown,
      "Elektro",
      "Elektro nach Fläche",
      qm * PREIS_MARKT.elektro_qm.min * f,
      qm * PREIS_MARKT.elektro_qm.max * f,
      PREIS_MARKT.elektro_qm.einheit
    );
  }
  if (b.includes("fenster_daemmung")) {
    const stueck = Math.max(1, Math.round(qm / 20));
    pushLine(
      breakdown,
      "Fenster",
      "Fenstertausch / Dämmung",
      stueck * PREIS_MARKT.fenster_standard.min,
      stueck * PREIS_MARKT.fenster_standard.max,
      PREIS_MARKT.fenster_standard.einheit
    );
    const fassAnteil = qm * 0.5;
    pushLine(
      breakdown,
      "Fassade",
      "Dämmung / Fassade (Anteil)",
      fassAnteil * PREIS_MARKT.fassade_daemmung.min * f,
      fassAnteil * PREIS_MARKT.fassade_daemmung.max * f,
      PREIS_MARKT.fassade_daemmung.einheit
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
      PREIS_MARKT.heizung_wartung.einheit
    );
  }
  if (b.includes("wasser")) {
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
      PREIS_MARKT.elektro_punkt.einheit
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
      qm * PREIS_MARKT.ausbau_umbau.min * planF,
      qm * PREIS_MARKT.ausbau_umbau.max * planF,
      PREIS_MARKT.ausbau_umbau.einheit
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
      qm * PREIS_MARKT.terrasse_pflaster.min * planF,
      qm * PREIS_MARKT.terrasse_pflaster.max * planF,
      PREIS_MARKT.terrasse_pflaster.einheit
    );
  }
  return breakdown;
}

function calcBetreuung(
  state: FunnelState,
  opts?: { skipGarten?: boolean; skipGestaltung?: boolean }
): PriceLineItem[] {
  const b = state.bereiche;
  let hf = state.umfangFaktor || 1;
  const gH = state.fachdetails?.garten?.haeufigkeit;
  if (state.fachdetails?.garten?.was === "pflege") {
    if (gH === "woechentlich") hf = 0.85;
    else if (gH === "einmalig") hf = 1.3;
  }
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
      PREIS_MARKT.winterdienst_saison.min,
      PREIS_MARKT.winterdienst_saison.max,
      PREIS_MARKT.winterdienst_saison.einheit
    );
  }
  if (b.includes("reinigung")) {
    const monate = 12;
    pushLine(
      breakdown,
      "Reinigung",
      `ca. ${monate} Monate`,
      qm * PREIS_MARKT.reinigung_regelmaessig.min * monate * hf,
      qm * PREIS_MARKT.reinigung_regelmaessig.max * monate * hf,
      "€"
    );
  }
  return breakdown;
}

/**
 * Berechnet Preisrahmen und Aufschlüsselung aus dem Bärenwald-Funnel-State.
 */
/** Schwellenwerte für automatischen Preisrahmen */
const SCHWELLE_ZU_KOMPLEX = 15000;
const SCHWELLE_WARNUNG = 8000;

export type BwResultModus =
  | "preisrahmen"
  | "preisrahmen_warnung"
  | "zu_komplex";

/**
 * Wendet Schwellenwert-Check auf ein finalizeRange-Ergebnis an.
 * Gibt resultModus + schwellenwertAusgeloest zurück.
 */
function applyThreshold(
  rangeResult: ReturnType<typeof finalizeRange> & { istFallback?: boolean },
  options?: BwCalculatePriceOptions
): ReturnType<typeof finalizeRange> & {
  resultModus: BwResultModus;
  schwellenwertAusgeloest: boolean;
  istFallback?: boolean;
} {
  if (rangeResult.istFallback) {
    return {
      ...rangeResult,
      resultModus: "preisrahmen",
      schwellenwertAusgeloest: false,
      istFallback: true,
    };
  }
  if (rangeResult.min > SCHWELLE_ZU_KOMPLEX) {
    if (options?.preview) {
      return {
        ...rangeResult,
        resultModus: "zu_komplex",
        schwellenwertAusgeloest: true,
        istFallback: false,
      };
    }
    return {
      ...rangeResult,
      min: 0,
      max: 0,
      breakdown: [],
      resultModus: "zu_komplex",
      schwellenwertAusgeloest: true,
      istFallback: false,
    };
  }
  const resultModus: BwResultModus =
    rangeResult.min >= SCHWELLE_WARNUNG ? "preisrahmen_warnung" : "preisrahmen";
  return {
    ...rangeResult,
    resultModus,
    schwellenwertAusgeloest: false,
    istFallback: Boolean(rangeResult.istFallback),
  };
}

const FALLBACK_MIN = 450;
const FALLBACK_MAX = 1800;

function buildFallbackPrice(state: FunnelState): {
  min: number;
  max: number;
  breakdown: PriceLineItem[];
  mindestauftragAktiv: boolean;
  plzFaktor: number;
  koordinationsRabatt: number;
  resultModus: BwResultModus;
  schwellenwertAusgeloest: boolean;
  istFallback: boolean;
} {
  const breakdown: PriceLineItem[] = [
    {
      gewerk: "allgemein",
      beschreibung: "Handwerksleistung",
      min: FALLBACK_MIN,
      max: FALLBACK_MAX,
      einheit: "pauschal",
    },
  ];
  return {
    min: FALLBACK_MIN,
    max: FALLBACK_MAX,
    breakdown,
    mindestauftragAktiv: false,
    plzFaktor: getPlzFaktor(state.plz ?? ""),
    koordinationsRabatt: getKoordinationsRabatt(
      Math.max(1, state.bereiche?.length ?? 1)
    ),
    resultModus: "preisrahmen",
    schwellenwertAusgeloest: false,
    istFallback: true,
  };
}

export type BwCalculatePriceResult = {
  min: number;
  max: number;
  breakdown: PriceLineItem[];
  mindestauftragAktiv: boolean;
  plzFaktor: number;
  koordinationsRabatt: number;
  resultModus: BwResultModus;
  schwellenwertAusgeloest: boolean;
  istFallback: boolean;
};

export type BwCalculatePriceOptions = {
  /** Live-Vorschau: trotz Notfall akut / zu_komplex einen Rahmen berechnen */
  preview?: boolean;
};

function withMaybeZeroFallback(
  state: FunnelState,
  result: Omit<BwCalculatePriceResult, "istFallback"> & {
    istFallback?: boolean;
  },
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
    (base.breakdown?.length ?? 0) === 0 ||
    base.min <= 0
  ) {
    return buildFallbackPrice(state);
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
    breakdown: [] as PriceLineItem[],
    mindestauftragAktiv: false,
    plzFaktor: 1.0,
    koordinationsRabatt: 1.0,
    resultModus: "zu_komplex" as BwResultModus,
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

    breakdown = applyFachdetailsLegacyScaling(breakdown, state);
    const { rawMin, rawMax } = sumBreakdown(breakdown);
    return withMaybeZeroFallback(
      state,
      applyThreshold(finalizeRange(rawMin, rawMax, breakdown, state), options),
      options
    );
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
      if (
        preview &&
        state.dringlichkeit === "akut" &&
        breakdown.length === 0
      ) {
        return {
          min: 150,
          max: 600,
          breakdown: [],
          mindestauftragAktiv: false,
          plzFaktor: getPlzFaktor(state.plz ?? ""),
          koordinationsRabatt: getKoordinationsRabatt(
            Math.max(1, state.bereiche?.length ?? 1)
          ),
          resultModus: "preisrahmen",
          schwellenwertAusgeloest: false,
          istFallback: true,
        };
      }
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

  breakdown = applyFachdetailsLegacyScaling(breakdown, state);

  const { rawMin, rawMax } = sumBreakdown(breakdown);
  if (breakdown.length === 0) {
    return buildFallbackPrice(state);
  }

  return withMaybeZeroFallback(
    state,
    applyThreshold(finalizeRange(rawMin, rawMax, breakdown, state), options),
    options
  );
}
