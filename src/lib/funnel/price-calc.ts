import type { FunnelState, PriceLineItem } from "./types";

/** PLZ → Faktor nach Entfernung zum Münchner Zentrum (80/81 = Stadt, nahes Umland, weiteres Umland). */
export function getPlzFaktor(plz: string): number {
  if (!plz || plz.length < 5) return 1.0;
  if (plz.startsWith("80") || plz.startsWith("81")) {
    return 1.0;
  }
  const umlandNah = [
    "82",
    "85031",
    "85049",
    "85221",
    "85737",
    "85764",
    "85774",
    "85386",
    "85540",
    "85551",
    "85560",
    "85570",
    "85579",
    "85586",
    "85591",
    "85598",
    "85604",
    "85609",
    "85622",
    "85630",
    "85635",
    "85640",
    "85649",
    "85653",
    "85656",
    "85659",
    "85662",
    "85665",
    "85669",
  ];
  if (umlandNah.some((p) => plz.startsWith(p))) {
    return 1.03;
  }
  return 1.06;
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
  bad: {
    klein_standard: {
      min: 9000,
      max: 12000,
      einheit: "pauschal",
      groesseVon: 0,
      groesseBis: 5,
    },
    klein_komfort: {
      min: 12000,
      max: 16000,
      einheit: "pauschal",
      groesseVon: 0,
      groesseBis: 5,
    },
    klein_gehoben: {
      min: 16000,
      max: 22000,
      einheit: "pauschal",
      groesseVon: 0,
      groesseBis: 5,
    },
    mittel_standard: {
      min: 13000,
      max: 17000,
      einheit: "pauschal",
      groesseVon: 5,
      groesseBis: 8,
    },
    mittel_komfort: {
      min: 17000,
      max: 22000,
      einheit: "pauschal",
      groesseVon: 5,
      groesseBis: 8,
    },
    mittel_gehoben: {
      min: 22000,
      max: 30000,
      einheit: "pauschal",
      groesseVon: 5,
      groesseBis: 8,
    },
    gross_standard: {
      min: 17000,
      max: 22000,
      einheit: "pauschal",
      groesseVon: 8,
      groesseBis: 12,
    },
    gross_komfort: {
      min: 22000,
      max: 28000,
      einheit: "pauschal",
      groesseVon: 8,
      groesseBis: 12,
    },
    gross_gehoben: {
      min: 28000,
      max: 40000,
      einheit: "pauschal",
      groesseVon: 8,
      groesseBis: 999,
    },
  },
  heizung: {
    klein: {
      min: 6000,
      max: 9500,
      einheit: "pauschal",
      groesseVon: 0,
      groesseBis: 100,
    },
    mittel: {
      min: 9500,
      max: 14000,
      einheit: "pauschal",
      groesseVon: 100,
      groesseBis: 200,
    },
    gross: {
      min: 14000,
      max: 20000,
      einheit: "pauschal",
      groesseVon: 200,
      groesseBis: 999,
    },
    wartung: { min: 180, max: 400, einheit: "pauschal" },
    heizkoerper: { min: 280, max: 580, einheit: "pro Stück" },
  },
  heizung_notfall: {
    ausfall: { min: 250, max: 600, einheit: "pauschal" },
  },
  sanitaer: {
    verstopfung: { min: 120, max: 250, einheit: "pauschal" },
    leck: { min: 250, max: 600, einheit: "pauschal" },
    wc: { min: 120, max: 220, einheit: "pauschal" },
    armatur: { min: 120, max: 200, einheit: "pauschal" },
  },
  elektro: {
    steckdose: { min: 90, max: 140, einheit: "pro Punkt" },
    fi_schalter: { min: 180, max: 260, einheit: "pauschal" },
    fehlersuche: { min: 160, max: 300, einheit: "pauschal" },
    leitungen: { min: 85, max: 130, einheit: "pro m" },
    sicherungskasten: { min: 900, max: 2200, einheit: "pauschal" },
    echeck: { min: 150, max: 350, einheit: "pauschal" },
  },
  maler: {
    waende: { min: 24, max: 34, einheit: "pro m² Wandfläche" },
    waende_decke: { min: 28, max: 40, einheit: "pro m² Wandfläche" },
    komplett: { min: 32, max: 46, einheit: "pro m² Wandfläche" },
    tapezieren: { min: 18, max: 32, einheit: "pro m²" },
    fassade: { min: 38, max: 58, einheit: "pro m²" },
  },
  boden: {
    laminat: { min: 32, max: 48, einheit: "pro m²" },
    parkett: { min: 75, max: 120, einheit: "pro m²" },
    parkett_schleifen: { min: 22, max: 42, einheit: "pro m²" },
    vinyl: { min: 35, max: 52, einheit: "pro m²" },
    fliesen: { min: 72, max: 102, einheit: "pro m²" },
    balkon_belag: { min: 72, max: 102, einheit: "pro m²" },
    teppich: { min: 22, max: 35, einheit: "pro m²" },
  },
  dach: {
    ziegel_wenige: { min: 300, max: 800, einheit: "pauschal" },
    ziegel_bereich: { min: 800, max: 2500, einheit: "pauschal" },
    daemmung: { min: 120, max: 180, einheit: "pro m²" },
    komplett: { min: 165, max: 235, einheit: "pro m²" },
    dachfenster: { min: 900, max: 1800, einheit: "pro Stück" },
    regenrinne: { min: 38, max: 62, einheit: "pro lfd. m" },
  },
  fassade: {
    anstrich: { min: 38, max: 58, einheit: "pro m²" },
    klinker: { min: 45, max: 70, einheit: "pro m²" },
  },
  fenster: {
    standard: { min: 600, max: 950, einheit: "pro Stück" },
    premium: { min: 900, max: 1400, einheit: "pro Stück" },
    tuer: { min: 800, max: 1400, einheit: "pro Stück" },
  },
  garten: {
    pflege_klein: {
      min: 55,
      max: 90,
      einheit: "pro Besuch",
      groesseVon: 0,
      groesseBis: 100,
    },
    pflege_mittel: {
      min: 80,
      max: 140,
      einheit: "pro Besuch",
      groesseVon: 100,
      groesseBis: 300,
    },
    pflege_gross: {
      min: 130,
      max: 220,
      einheit: "pro Besuch",
      groesseVon: 300,
      groesseBis: 999,
    },
    hecke: { min: 8, max: 18, einheit: "pro m²" },
    pflaster: { min: 90, max: 130, einheit: "pro m²" },
    gestaltung: { min: 45, max: 85, einheit: "pro m²" },
    baum_klein: { min: 150, max: 350, einheit: "pro Stück" },
    baum_gross: { min: 400, max: 900, einheit: "pro Stück" },
    rasen: { min: 1.5, max: 2.5, einheit: "pro m²" },
  },
  trockenbau: {
    wand: { min: 48, max: 72, einheit: "pro m²" },
    decke: { min: 42, max: 65, einheit: "pro m²" },
  },
  reinigung: {
    regelmaessig: { min: 1.3, max: 2.0, einheit: "pro m²/Monat" },
    einmalig: { min: 2.8, max: 4.2, einheit: "pro m²" },
  },
  winterdienst: {
    saison: { min: 620, max: 920, einheit: "pro Saison" },
    einmalig: { min: 80, max: 160, einheit: "pauschal" },
  },
  hausmeister: {
    monatlich: { min: 320, max: 520, einheit: "pro Monat" },
    nach_bedarf: { min: 280, max: 480, einheit: "pro Monat" },
    jahresvertrag: { min: 3500, max: 6200, einheit: "pro Jahr" },
  },
  terrasse: {
    holz: { min: 180, max: 320, einheit: "pro m²" },
    stein: { min: 120, max: 220, einheit: "pro m²" },
    beton: { min: 80, max: 140, einheit: "pro m²" },
  },
  abriss: {
    innen: { min: 25, max: 45, einheit: "pro m²" },
    komplett: { min: 8000, max: 18000, einheit: "pauschal" },
  },
} as const;

/** Generalunternehmer-/Koordinationsmarge vor PLZ-Faktor (auf Min/Max-Rahmen). */
export const GU_MARGE = 1.15;

const BAD_OVERFLOW_PRO_QM: Record<"standard" | "komfort" | "gehoben", number> = {
  standard: 800,
  komfort: 1200,
  gehoben: 1800,
};

function roundTo50(n: number): number {
  return Math.round(n / 50) * 50;
}

function getBadAusstattungStufe(
  state: FunnelState
): "standard" | "komfort" | "gehoben" {
  const a = state.badAusstattung ?? "standard";
  if (a === "komfort" || a === "gehoben" || a === "standard") return a;
  return "standard";
}

function addBadSanitaerZuschlaege(
  min: number,
  max: number,
  state: FunnelState
): [number, number] {
  const fd = state.fachdetails?.sanitaer;
  let a = min;
  let b = max;

  const rohreNeu = fd?.rohre === "neu" || fd?.badRohreNeu === true;
  if (rohreNeu) {
    a += 2500;
    b += 4000;
  }

  /** Bei `badWas === "wanne_dusche"` steckt der Umbau im Basis-Band — kein zweiter Posten über `badBadewanne`. */
  const duscheZuschlag =
    fd?.badBadewanne === "dusche" && fd?.badWas !== "wanne_dusche";
  if (duscheZuschlag) {
    a += 1200;
    b += 1800;
  }

  if (fd?.badHeizkoerper === "handtuchwaermer") {
    const n = Math.max(1, fd.badHeizkoerperAnzahl ?? 1);
    a += 450 * n;
    b += 750 * n;
  }

  return [a, b];
}

/** Komplettbad: Pauschale + optional m²-Zuschlag ab 8 m² + Zuschläge + GU-Marge (vor PLZ). */
export function computeKomplettBadPrice(state: FunnelState): {
  min: number;
  max: number;
} {
  const aus = getBadAusstattungStufe(state);
  const g = state.groesse ?? 6;
  const typeKey = getBadPriceTypeKey(state);
  const basis = PREISE.bad[typeKey as keyof typeof PREISE.bad];
  let min: number = basis.min;
  let max: number = basis.max;

  if (g > 8) {
    const extra = (g - 8) * BAD_OVERFLOW_PRO_QM[aus];
    min += extra;
    max += extra;
  }

  const zz = addBadSanitaerZuschlaege(min, max, state);
  min = zz[0];
  max = zz[1];

  return {
    min: min * GU_MARGE,
    max: max * GU_MARGE,
  };
}

/**
 * Teilsanierung Bad (fliesen / objekte / leitungen / wanne_dusche): ohne große Komplettpauschale.
 * Ergebnis inkl. GU-Marge, vor PLZ-Faktor — siehe {@link calculatePrice}.
 */
export function calculatePartialBadPrice(state: FunnelState): {
  min: number;
  max: number;
} {
  const fd = state.fachdetails?.sanitaer;
  const bw = fd?.badWas ?? "";
  const g = Math.max(state.groesse ?? 1, 1);
  const fliesen = PREISE.boden.fliesen;
  const leit = PREISE.elektro.leitungen;

  let min = 1500;
  let max = 3500;

  switch (bw) {
    case "fliesen":
      min = g * fliesen.min;
      max = g * fliesen.max;
      break;
    case "objekte":
    case "sanitaer":
      min = 1500;
      max = 3500;
      break;
    case "leitungen":
      min = g * leit.min;
      max = g * leit.max;
      break;
    case "wanne_dusche":
      min = 2700;
      max = 5300;
      break;
    default:
      min = 1500;
      max = 3500;
  }

  /* Doppelkalkulation verhindert zentral `addBadSanitaerZuschlaege` (badWas !== wanne_dusche). */
  const [a, b] = addBadSanitaerZuschlaege(min, max, state);

  return {
    min: a * GU_MARGE,
    max: b * GU_MARGE,
  };
}

/** Legacy-Konstante (nur noch für UI-Hinweise); Preis nutzt {@link getPlzFaktor}. */
export const FAKTOREN = {
  plz: {
    innenstadt: 1.0,
    stadt: 1.0,
    umland: 1.03,
  },
} as const;

type PreisServiceKey = keyof typeof PREISE;

/** Preis-Mapping aus dem Funnel; `null` = kein automatisches Mapping */
export type BwPriceMapping = {
  service: PreisServiceKey;
  type: string;
  /** Kalkulierter Min/Max-Rahmen (z. B. Bad) inkl. GU — danach PLZ/Notdienst in {@link computePriceCore} */
  customPriceRange?: { min: number; max: number };
};

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
// Mapping Funnel → Service / Typ (Preiszeile)
// ═══════════════════════════════════════════════════════════════════════════

function getHeizungGroesseTyp(
  groesse: number | null
): "klein" | "mittel" | "gross" {
  const g = groesse ?? 80;
  if (g < 100) return "klein";
  if (g < 200) return "mittel";
  return "gross";
}

function getPflegeByGroesse(
  groesse: number | null
): "pflege_klein" | "pflege_mittel" | "pflege_gross" {
  const g = groesse ?? 100;
  if (g < 100) return "pflege_klein";
  if (g < 300) return "pflege_mittel";
  return "pflege_gross";
}

/** Schlüssel in PREISE.bad: {klein|mittel|gross}_{standard|komfort|gehoben} */
export function getBadPriceTypeKey(state: FunnelState): string {
  const g = state.groesse ?? 6;
  const aus = state.badAusstattung ?? "standard";
  const tier = g < 5 ? "klein" : g < 8 ? "mittel" : "gross";
  return `${tier}_${aus}`;
}

function mapSanitaerFromFachdetails(
  state: FunnelState
): { service: "sanitaer"; type: string } | null {
  const fd = state.fachdetails;
  const b = state.bereiche;
  if (!b.includes("wasser") && !b.includes("sanitaer") && !b.includes("bad"))
    return null;
  if (state.situation === "notfall" && fd?.sanitaer?.notfallSchwere) {
    return { service: "sanitaer", type: "leck" };
  }
  if (
    state.situation === "erneuern" &&
    b.includes("bad") &&
    fd?.sanitaer?.badWas &&
    fd.sanitaer.badWas !== "wanne_dusche"
  ) {
    const w = fd.sanitaer.badWas;
    if (w === "fliesen") return { service: "sanitaer", type: "armatur" };
    if (w === "objekte") return { service: "sanitaer", type: "armatur" };
    if (w === "komplett") return { service: "sanitaer", type: "leck" };
    return { service: "sanitaer", type: "armatur" };
  }
  const lage = fd?.sanitaer?.lage;
  if (lage === "wand" || lage === "keller") return { service: "sanitaer", type: "leck" };
  if (lage === "sichtbar") return { service: "sanitaer", type: "armatur" };
  if (lage) return { service: "sanitaer", type: "verstopfung" };
  return null;
}

function mapElektroFromFachdetails(
  state: FunnelState
): { service: "elektro"; type: string } | null {
  const fd = state.fachdetails;
  const ep = fd?.elektro?.problem;
  if (!ep) return null;
  const b = state.bereiche;
  if (
    !b.includes("strom") &&
    !b.includes("elektrik") &&
    !b.includes("elektro")
  ) {
    return null;
  }

  const situation = state.situation;

  if (situation === "erneuern") {
    switch (ep) {
      case "sicherungskasten":
        return { service: "elektro", type: "sicherungskasten" };
      case "leitungen":
      case "neue_leitungen":
        return { service: "elektro", type: "leitungen" };
      case "echeck":
        return { service: "elektro", type: "echeck" };
      default:
        return { service: "elektro", type: "fehlersuche" };
    }
  }

  if (situation === "kaputt") {
    switch (ep) {
      case "sicherung":
        return { service: "elektro", type: "fi_schalter" };
      case "strom_weg":
      case "fehlersuche":
        return { service: "elektro", type: "fehlersuche" };
      case "steckdose":
        return { service: "elektro", type: "steckdose" };
      default:
        return { service: "elektro", type: "fehlersuche" };
    }
  }

  switch (ep) {
    case "sicherungskasten":
      return { service: "elektro", type: "sicherungskasten" };
    case "echeck":
      return { service: "elektro", type: "echeck" };
    case "leitungen":
    case "neue_leitungen":
      return { service: "elektro", type: "leitungen" };
    case "steckdose":
      return { service: "elektro", type: "steckdose" };
    case "sicherung":
      return { service: "elektro", type: "fi_schalter" };
    case "strom_weg":
    case "fehlersuche":
      return { service: "elektro", type: "fehlersuche" };
    default:
      return { service: "elektro", type: "fehlersuche" };
  }
}

export function mapToPrice(state: FunnelState): BwPriceMapping | null {
  const { situation, bereiche } = state;
  const fd = state.fachdetails;
  const b = (k: string) => bereiche.includes(k);

  if (situation === "gewerbe") {
    return null;
  }

  if (situation === "notfall") {
    if (bereiche.includes("heizung")) {
      return { service: "heizung_notfall", type: "ausfall" };
    }
    if (bereiche.includes("strom")) {
      return { service: "elektro", type: "fehlersuche" };
    }
    if (bereiche.includes("wasser")) {
      return { service: "sanitaer", type: "leck" };
    }
  }

  if (b("fassade_daemmung")) {
    return null;
  }

  if (b("boden")) {
    const aktuell = fd?.boden?.aktuell;
    if (!aktuell) return { service: "boden", type: "laminat" };
    if (aktuell === "balkon_belag") return { service: "boden", type: "balkon_belag" };
    if (aktuell === "fliesen") return { service: "boden", type: "fliesen" };
    if (aktuell === "parkett_schleifen") {
      return { service: "boden", type: "parkett_schleifen" };
    }
    if (aktuell === "laminat") return { service: "boden", type: "laminat" };
    if (aktuell === "parkett") return { service: "boden", type: "parkett" };
    if (aktuell === "teppich") return { service: "boden", type: "teppich" };
    return { service: "boden", type: "vinyl" };
  }

  if (
    b("maler") ||
    b("streichen") ||
    b("waende") ||
    b("waende_boeden") ||
    (b("feuchtigkeit_schimmel") && fd?.maler?.was)
  ) {
    const was = fd?.maler?.was;
    if (was === "fassade") {
      const sub = fd?.maler?.fassade;
      if (sub === "daemmung") return null;
      if (sub === "klinker") return { service: "fassade", type: "klinker" };
      return { service: "fassade", type: "anstrich" };
    }
    if (was === "komplett") return { service: "maler", type: "komplett" };
    if (was === "waende_decke") return { service: "maler", type: "waende_decke" };
    if (was === "tapezieren") return { service: "maler", type: "tapezieren" };
    return { service: "maler", type: "waende" };
  }

  if (b("heizung") && fd?.heizung?.typ) {
    const typ = fd.heizung.typ;
    if (typ === "wartung") return { service: "heizung", type: "wartung" };
    if (typ === "heizkoerper") return { service: "heizung", type: "heizkoerper" };
    if (typ === "waermepumpe") return null;
    if (fd?.heizung?.vorhaben === "wartung") {
      return { service: "heizung", type: "wartung" };
    }
    return {
      service: "heizung",
      type: getHeizungGroesseTyp(state.groesse),
    };
  }

  if (b("dach") && fd?.dach?.vorhaben) {
    const v = fd.dach.vorhaben;
    if (v === "ziegel_wenige" || v === "ziegel_bereich") {
      return { service: "dach", type: v };
    }
    if (v === "dachfenster") return { service: "dach", type: "dachfenster" };
    if (v === "regenrinne") return { service: "dach", type: "regenrinne" };
    if (v === "daemmung") return { service: "dach", type: "daemmung" };
    return { service: "dach", type: "komplett" };
  }

  if (
    (b("garten") ||
      b("gestaltung") ||
      b("baum") ||
      b("baumarbeiten")) &&
    fd?.garten?.was
  ) {
    const w = fd.garten.was;
    if (w === "pflege") {
      return { service: "garten", type: getPflegeByGroesse(state.groesse) };
    }
    if (w === "hecke") return { service: "garten", type: "hecke" };
    if (w === "pflaster") return { service: "garten", type: "pflaster" };
    if (w === "gestaltung") return { service: "garten", type: "gestaltung" };
    if (w === "baum") {
      return {
        service: "garten",
        type: fd.garten.baumgroesse === "gross" ? "baum_gross" : "baum_klein",
      };
    }
    return { service: "garten", type: "pflege_mittel" };
  }

  if (b("bad") && state.groesse != null) {
    const bw = fd?.sanitaer?.badWas;

    if (
      bw === "fliesen" ||
      bw === "objekte" ||
      bw === "leitungen" ||
      bw === "sanitaer"
    ) {
      return {
        service: "bad",
        type: `teil_${bw}`,
        customPriceRange: calculatePartialBadPrice(state),
      };
    }

    if (bw === "wanne_dusche") {
      return {
        service: "bad",
        type: "teil_wanne_dusche",
        customPriceRange: calculatePartialBadPrice(state),
      };
    }

    return {
      service: "bad",
      type: getBadPriceTypeKey(state),
      customPriceRange: computeKomplettBadPrice(state),
    };
  }

  const elektroMapped = mapElektroFromFachdetails(state);
  if (elektroMapped && (b("strom") || b("elektrik") || b("elektro"))) {
    return elektroMapped;
  }

  const sanMap = mapSanitaerFromFachdetails(state);
  if (sanMap) return sanMap;

  if (
    b("fenster_tuer") &&
    situation === "kaputt" &&
    fd?.fenster?.defekt
  ) {
    return { service: "fenster", type: "standard" };
  }

  if ((b("fenster") || b("fenster_tueren")) && fd?.fenster?.ausstattung) {
    const a = fd.fenster.ausstattung;
    return {
      service: "fenster",
      type: a === "premium" ? "premium" : "standard",
    };
  }

  if (b("reinigung")) {
    if (state.umfang === "einmalig") {
      return { service: "reinigung", type: "einmalig" };
    }
    return { service: "reinigung", type: "regelmaessig" };
  }

  if ((situation === "erneuern" || situation === "kaputt") && b("elektrik")) {
    const em = mapElektroFromFachdetails(state);
    if (em) return em;
    return { service: "elektro", type: "fi_schalter" };
  }

  if (situation === "erneuern" && b("garten")) {
    return { service: "garten", type: getPflegeByGroesse(state.groesse) };
  }

  if (situation === "neubauen" && b("terrasse") && fd?.neubauen?.terrasse) {
    const mat = fd.neubauen.terrasse;
    if (mat === "holz" || mat === "stein" || mat === "beton") {
      return { service: "terrasse", type: mat };
    }
  }

  if (
    situation === "neubauen" &&
    b("umbau") &&
    fd?.neubauen?.innen === "trennwand"
  ) {
    return { service: "trockenbau", type: "wand" };
  }

  if (
    situation === "neubauen" &&
    (b("keller_dg") || (b("umbau") && fd?.neubauen?.innen !== "trennwand"))
  ) {
    return { service: "trockenbau", type: "wand" };
  }

  if (situation === "betreuung") {
    if (b("gestaltung")) return { service: "garten", type: "pflaster" };
    if (b("garten")) {
      return { service: "garten", type: getPflegeByGroesse(state.groesse) };
    }
    if (b("winter")) {
      return {
        service: "winterdienst",
        type: "saison",
      };
    }
    if (b("reinigung")) return { service: "reinigung", type: "regelmaessig" };
    if (b("hausmeister")) {
      const u = state.umfang;
      if (u === "nach_bedarf" || u === "jahresvertrag") {
        return { service: "hausmeister", type: u };
      }
      return { service: "hausmeister", type: "monatlich" };
    }
  }

  if (b("fassade")) return { service: "fassade", type: "anstrich" };

  if (b("fenster") || b("fenster_tueren") || b("fenster_tuer")) {
    return { service: "fenster", type: "standard" };
  }

  return null;
}

/** @deprecated Bevorzugt {@link mapToPrice} */
export const mapToServiceType = mapToPrice;

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
  terrasse: "Terrasse / Außenfläche",
  abriss: "Abriss",
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
    fi_schalter: "Sicherung / FI (Einsatz)",
    fehlersuche: "Fehlersuche",
    leitungen: "Leitungen",
    sicherungskasten: "Sicherungskasten modernisieren",
    echeck: "E-Check / Sicherheitsprüfung",
  },
  garten: {
    rasen: "Rasenpflege",
    pflege_klein: "Gartenpflege (klein)",
    pflege_mittel: "Gartenpflege (mittel)",
    pflege_gross: "Gartenpflege (groß)",
    hecke: "Hecke",
    pflaster: "Pflaster / Terrasse",
    gestaltung: "Gartengestaltung",
    baum_klein: "Baumpflege (klein)",
    baum_gross: "Baumpflege (groß)",
  },
  maler: {
    waende: "Wände streichen",
    waende_decke: "Wände + Decke",
    komplett: "Komplett (Wände + Decke)",
    fassade: "Fassade",
    tapezieren: "Tapezieren",
  },
  boden: {
    laminat: "Laminat",
    parkett: "Parkett verlegen",
    parkett_schleifen: "Parkett abschleifen & versiegeln",
    vinyl: "Vinyl",
    fliesen: "Fliesen",
    balkon_belag: "Balkon / Terrasse Belag",
    teppich: "Teppich",
  },
  heizung: {
    klein: "Heizungssanierung (klein)",
    mittel: "Heizungssanierung (mittel)",
    gross: "Heizungssanierung (groß)",
    wartung: "Heizung Wartung",
    heizkoerper: "Heizkörper tauschen",
  },
  dach: {
    ziegel_wenige: "Dach — wenige Ziegel",
    ziegel_bereich: "Dach — größerer Ziegelbereich",
    daemmung: "Dachdämmung",
    komplett: "Dach komplett",
    dachfenster: "Dachfenster",
    regenrinne: "Regenrinne",
  },
  fassade: {
    anstrich: "Fassade Anstrich",
    klinker: "Klinker / Verblendung",
  },
  fenster: {
    standard: "Fenster Standard",
    premium: "Fenster Premium",
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
  hausmeister: {
    monatlich: "Hausmeister monatlich",
    nach_bedarf: "Hausmeister nach Bedarf",
    jahresvertrag: "Hausmeister Jahresvertrag",
  },
  terrasse: {
    holz: "Terrasse Holz / WPC",
    stein: "Terrasse Naturstein / Fliesen",
    beton: "Terrasse Betonplatten",
  },
  heizung_notfall: { ausfall: "Notfall Heizung / Wasser" },
  abriss: {
    innen: "Abriss innen",
    komplett: "Abriss komplett",
  },
  trockenbau: { wand: "Trockenbau Wand", decke: "Trockenbau Decke" },
  bad: {
    teil_fliesen: "Bad — Fliesen erneuern",
    teil_objekte: "Bad — Sanitärobjekte tauschen",
    teil_leitungen: "Bad — Leitungen / Anschlüsse",
    teil_sanitaer: "Bad — Sanitärobjekte (Teilsanierung)",
    teil_wanne_dusche: "Bad — Wanne zu Dusche",
  },
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

export function getNotdienstGebuehr(state: FunnelState): number {
  if (state.situation !== "notfall") return 0;
  switch (state.dringlichkeit) {
    case "sofort":
      return 150;
    case "heute":
      return 100;
    case "diese_woche":
    default:
      return 0;
  }
}

/** Frühe Szenarien ohne Preis — blendet z. B. Zustand/Zugänglichkeit aus. */
export function getBwResultModus(state: FunnelState): "normal" | "zu_komplex" {
  if (state.bereiche.includes("fassade_daemmung")) {
    return "zu_komplex";
  }
  if (
    state.fachdetails?.maler?.was === "fassade" &&
    state.fachdetails?.maler?.fassade === "daemmung"
  ) {
    return "zu_komplex";
  }
  if (state.situation === "gewerbe") {
    return "zu_komplex";
  }
  if (
    state.situation === "neubauen" &&
    state.bereiche.includes("anbau")
  ) {
    return "zu_komplex";
  }
  if (state.situation === "neubauen" && state.bereiche.includes("terrasse")) {
    return "zu_komplex";
  }
  const nb = state.fachdetails?.neubauen;
  if (state.situation === "neubauen" && state.bereiche.includes("keller_dg")) {
    if (nb?.rohbau === "nein" || nb?.deckenhoehe === "niedrig") {
      return "zu_komplex";
    }
  }
  if (
    state.situation === "neubauen" &&
    state.bereiche.includes("umbau") &&
    (nb?.innen === "durchbruch" || nb?.innen === "grundriss")
  ) {
    return "zu_komplex";
  }
  if (state.fachdetails?.heizung?.vorhaben === "neu") {
    return "zu_komplex";
  }
  if (state.fachdetails?.heizung?.typ === "waermepumpe") {
    return "zu_komplex";
  }
  if (state.fachdetails?.heizung?.alter === "ueber20") {
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
  if (plzF <= 1.001) parts.push("München Stadt (80/81)");
  else if (plzF <= 1.035) parts.push("Umland nah");
  else parts.push("Umland weiter");
  if (state.situation === "notfall" && getNotdienstGebuehr(state) > 0) {
    parts.push("Notdienst-Pauschale");
  }
  const z = state.zeitraum;
  if (z === "sofort") parts.push("Sehr zeitnaher Startwunsch");
  if (z === "diese_woche" || z === "heute")
    parts.push("Kurzfristiger Startwunsch");
  if (z === "vier_wochen" || z === "woche")
    parts.push("Termin innerhalb weniger Wochen");
  if (z === "naechster_monat") parts.push("Start im nächsten Monat geplant");
  if (z === "zwei_monate") parts.push("Start in 1–2 Monaten geplant");
  if (z === "sechs_monate" || z === "naechste_saison")
    parts.push("Mittelfristige Planung");
  if (z === "naechstes_jahr") parts.push("Langfristige Planung");
  return parts.length > 0 ? parts.join(" · ") : "Standardrahmen München";
}

function getBwAnzeigeModus(
  state: FunnelState,
  result: { mitte: number; min: number; max: number }
): BwResultModus {
  if (state.situation === "notfall" && state.dringlichkeit === "sofort") {
    return "notfall_akut";
  }
  if (state.bereiche.includes("fassade_daemmung")) {
    return "zu_komplex";
  }
  if (
    state.fachdetails?.maler?.was === "fassade" &&
    state.fachdetails?.maler?.fassade === "daemmung"
  ) {
    return "zu_komplex";
  }
  if (state.situation === "gewerbe") {
    return "zu_komplex";
  }
  if (
    state.situation === "neubauen" &&
    state.bereiche.includes("anbau")
  ) {
    return "zu_komplex";
  }
  if (state.situation === "neubauen" && state.bereiche.includes("terrasse")) {
    return "zu_komplex";
  }
  const nb2 = state.fachdetails?.neubauen;
  if (state.situation === "neubauen" && state.bereiche.includes("keller_dg")) {
    if (nb2?.rohbau === "nein" || nb2?.deckenhoehe === "niedrig") {
      return "zu_komplex";
    }
  }
  if (
    state.situation === "neubauen" &&
    state.bereiche.includes("umbau") &&
    (nb2?.innen === "durchbruch" || nb2?.innen === "grundriss")
  ) {
    return "zu_komplex";
  }
  if (state.fachdetails?.heizung?.vorhaben === "neu") {
    return "zu_komplex";
  }
  if (state.fachdetails?.heizung?.typ === "waermepumpe") {
    return "zu_komplex";
  }
  if (state.fachdetails?.heizung?.alter === "ueber20") {
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
  resultModus: BwResultModus;
  schwellenwertAusgeloest: boolean;
  istFallback: boolean;
  komplexReason: string | null;
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
  const mapped = mapToPrice(state);
  if (!mapped) return null;
  const { service, type, customPriceRange } = mapped;

  let basis: BasisEintrag | null = null;

  if (service === "bad" && customPriceRange) {
    basis = {
      min: customPriceRange.min,
      max: customPriceRange.max,
      einheit: "pauschal",
    };
  } else {
    basis =
      service === "bad"
        ? (PREISE.bad[type as keyof typeof PREISE.bad] as BasisEintrag | undefined) ??
          null
        : getBasis(service, type, state.groesse);
  }
  if (!basis) return null;

  const groesse = state.groesse ?? 1;
  const einheit = basis.einheit;
  let multiplier = 1;
  if (
    einheit.includes("m²") &&
    !einheit.includes("Monat") &&
    !einheit.includes("Besuch")
  ) {
    multiplier = groesse;
  } else if (einheit.includes("Stück") && state.groesseEinheit === "stueck") {
    multiplier = Math.max(1, groesse);
  } else if (
    service === "elektro" &&
    type === "steckdose" &&
    einheit.includes("Punkt")
  ) {
    const f = state.fachdetails?.elektro?.folge;
    if (f === "einzeln") multiplier = 1.5;
    else if (f === "mehrere") multiplier = 4;
    else if (f === "viele") multiplier = 6;
  }

  const rawMin = basis.min * multiplier;
  const rawMax = basis.max * multiplier;
  const mitte0 = (rawMin + rawMax) / 2;
  const halbSpanne = (rawMax - rawMin) / 2;

  const plzFaktor = getPlzFaktor(state.plz ?? "");
  const notdienst = getNotdienstGebuehr(state);
  const mitteAdjustiert = mitte0 * plzFaktor + notdienst;
  const spanPlz = halbSpanne * plzFaktor;

  const roundEuro =
    service === "bad"
      ? roundTo50
      : (n: number) => Math.round(n / 100) * 100;

  let mindestauftragAktiv = false;
  let finalMin = roundEuro(mitteAdjustiert - spanPlz);
  let finalMax = roundEuro(mitteAdjustiert + spanPlz);

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

function applyEmptyBreakdownAsZuKomplex(
  state: FunnelState,
  result: BwCalculatePriceResult,
  options?: BwCalculatePriceOptions
): BwCalculatePriceResult {
  const preview = options?.preview === true;
  const base: BwCalculatePriceResult = {
    ...result,
    istFallback: false,
  };

  const emptyPrice =
    (base.breakdown?.length ?? 0) === 0 || base.min <= 0;

  if (emptyPrice && base.komplexReason === "no_mapping_found") {
    return {
      min: 0,
      max: 0,
      mitte: 0,
      breakdown: [],
      mindestauftragAktiv: false,
      plzFaktor: getPlzFaktor(state.plz ?? ""),
      resultModus: "zu_komplex",
      schwellenwertAusgeloest: false,
      istFallback: false,
      komplexReason: "no_mapping_found",
    };
  }

  if (emptyPrice) {
    if (!state.situation) {
      return {
        ...base,
        resultModus: "zu_komplex",
        komplexReason: "no_mapping_found",
      };
    }
    if (!preview) {
      if (state.situation === "notfall" && state.dringlichkeit === "sofort") {
        return { ...base, komplexReason: null };
      }
      if (getBwResultModus(state) === "zu_komplex") {
        return { ...base, komplexReason: null };
      }
    }
    if (base.schwellenwertAusgeloest && base.resultModus === "zu_komplex") {
      return { ...base, komplexReason: null };
    }
    if (
      base.resultModus === "zu_komplex" &&
      base.schwellenwertAusgeloest &&
      base.min <= 0
    ) {
      return { ...base, komplexReason: null };
    }
    return {
      min: 0,
      max: 0,
      mitte: 0,
      breakdown: [],
      mindestauftragAktiv: false,
      plzFaktor: getPlzFaktor(state.plz ?? ""),
      resultModus: "zu_komplex",
      schwellenwertAusgeloest: false,
      istFallback: false,
      komplexReason: "no_mapping_found",
    };
  }

  if (!state.situation) {
    return { ...base, komplexReason: null };
  }
  if (!preview) {
    if (state.situation === "notfall" && state.dringlichkeit === "sofort") {
      return { ...base, komplexReason: null };
    }
    if (getBwResultModus(state) === "zu_komplex") {
      return { ...base, komplexReason: null };
    }
  }
  if (base.schwellenwertAusgeloest && base.resultModus === "zu_komplex") {
    return { ...base, komplexReason: null };
  }
  if (
    base.resultModus === "zu_komplex" &&
    base.schwellenwertAusgeloest &&
    base.min <= 0
  ) {
    return { ...base, komplexReason: null };
  }
  return { ...base, komplexReason: null };
}

export function calculatePrice(
  state: FunnelState,
  options?: BwCalculatePriceOptions
): BwCalculatePriceResult {
  const preview = options?.preview === true;

  const noResult = (komplexReason: string | null): BwCalculatePriceResult => ({
    min: 0,
    max: 0,
    mitte: 0,
    breakdown: [],
    mindestauftragAktiv: false,
    plzFaktor: 1,
    resultModus:
      state.situation === "notfall" && state.dringlichkeit === "sofort"
        ? "notfall_akut"
        : "zu_komplex",
    schwellenwertAusgeloest: false,
    istFallback: false,
    komplexReason,
  });

  if (!state.situation) {
    return noResult(null);
  }

  if (!preview && state.situation === "notfall" && state.dringlichkeit === "sofort") {
    return noResult(null);
  }

  if (!preview && getBwResultModus(state) === "zu_komplex") {
    return noResult(null);
  }

  const core = computePriceCore(state);
  if (!core) {
    const plzFaktor = getPlzFaktor(state.plz ?? "");
    return applyEmptyBreakdownAsZuKomplex(
      state,
      {
        min: 0,
        max: 0,
        mitte: 0,
        breakdown: [],
        mindestauftragAktiv: false,
        plzFaktor,
        resultModus: "zu_komplex",
        schwellenwertAusgeloest: false,
        istFallback: false,
        komplexReason: "no_mapping_found",
      },
      options
    );
  }

  let { min: finalMin, max: finalMax, breakdown } = core;
  const { plzFaktor, istFallback, mindestauftragAktiv } = core;
  const mitte = core.mitte;

  const resultModus = getBwAnzeigeModus(state, {
    mitte,
    min: finalMin,
    max: finalMax,
  });
  const schwellenwertAusgeloest =
    resultModus === "zu_komplex" && mitte > 15000;

  if (resultModus === "zu_komplex" && mitte > 15000 && !preview) {
    finalMin = 0;
    finalMax = 0;
    breakdown = [];
  }

  if (
    preview &&
    state.situation === "notfall" &&
    state.dringlichkeit === "sofort" &&
    breakdown.length === 0
  ) {
    return {
      min: 150,
      max: 600,
      mitte: 375,
      breakdown: [],
      mindestauftragAktiv: false,
      plzFaktor: getPlzFaktor(state.plz ?? ""),
      resultModus: "preisrahmen",
      schwellenwertAusgeloest: false,
      istFallback: false,
      komplexReason: null,
    };
  }

  return applyEmptyBreakdownAsZuKomplex(
    state,
    {
      min: finalMin,
      max: finalMax,
      mitte,
      breakdown,
      mindestauftragAktiv,
      plzFaktor,
      resultModus,
      schwellenwertAusgeloest,
      istFallback,
      komplexReason: null,
    },
    options
  );
}
