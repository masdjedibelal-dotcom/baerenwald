export type Situation =
  | "erneuern"
  | "kaputt"
  | "notfall"
  | "neubauen"
  | "betreuung"
  | "gewerbe";

export function isB2B(s: Situation | null | undefined): boolean {
  return s === "gewerbe";
}

/** Notfall Schritt 2 — Pauschale siehe {@link getNotdienstGebuehr} */
export type NotfallDringlichkeit = "sofort" | "heute" | "diese_woche";

export function isReparatur(s: Situation | null | undefined): boolean {
  return s === "kaputt" || s === "notfall";
}

export type Kundentyp =
  | "eigentuemer"
  | "mieter"
  | "hausverwaltung";

/** Gewünschter Start (PLZ-Schritt) — je Situation unterschiedliche Optionen; `heute`/`woche` nur noch Legacy. */
export type Zeitraum =
  | "sofort"
  | "diese_woche"
  | "vier_wochen"
  | "zwei_monate"
  | "sechs_monate"
  | "naechstes_jahr"
  | "naechster_monat"
  | "naechste_saison"
  | "flexibel"
  | "heute"
  | "woche";

export type Zugaenglichkeit = "einfach" | "mittel" | "schwer" | "unknown";

export type ObjektZustand = "gut" | "mittel" | "schlecht" | "unknown";

export type BudgetCheck = "ok" | "zu_hoch" | null;

/** Detailantworten Schritt „fachdetails“ (Elektro / Sanitär / Heizung / weitere Gewerke) */
export type FachdetailsState = {
  /** Zusatzinfos zu Neubau/Ausbau (Keller, Terrasse, Innenumbau) */
  neubauen?: {
    rohbau?: "ja" | "nein";
    deckenhoehe?: "niedrig" | "mittel" | "hoch";
    terrasse?: "holz" | "stein" | "beton";
    innen?: "durchbruch" | "grundriss" | "trennwand";
  };
  elektro?: {
    problem?: string;
    folge?: string;
    freitext?: string | null;
  };
  sanitaer?: {
    lage?: string;
    badWas?: string;
    badObjekte?: string[];
    rohre?: string;
    /** Notfall-Flow: nur Schwere, ohne Lage/Rohre */
    notfallSchwere?: string;
    freitext?: string | null;
  };
  heizung?: {
    typ?: string;
    alter?: string;
    vorhaben?: string;
    freitext?: string | null;
  };
  maler?: {
    was?: string;
    zustand?: string;
    fassade?: string;
    freitext?: string | null;
  };
  boden?: {
    aktuell?: string;
    verlegung?: string;
    freitext?: string | null;
  };
  dach?: {
    vorhaben?: string;
    alter?: string;
    freitext?: string | null;
  };
  garten?: {
    was?: string;
    haeufigkeit?: string;
    baumgroesse?: string;
    gestaltung?: string[];
    freitext?: string | null;
  };
  fenster?: {
    ausstattung?: "standard" | "premium";
    /** Kaputt: „Was ist defekt?“ */
    defekt?: string;
    freitext?: string | null;
  };
};

export interface PriceLineItem {
  gewerk: string;
  beschreibung: string;
  min: number;
  max: number;
  einheit: string;
}

export interface FunnelState {
  situation: Situation | null;
  bereiche: string[];
  kundentyp: Kundentyp | null;
  umfang: string | null;
  umfangFaktor: number;
  groesse: number | null;
  groesseEinheit: "qm" | "stueck" | "meter" | null;
  /** Bad-Sanierung: Material-/Ausstattungsstufe (nach m², vor Fachdetails). Optional: fehlender Key = wie `null`. */
  badAusstattung?: "standard" | "komfort" | "gehoben" | null;
  plz: string;
  zeitraum: Zeitraum | null;
  priceMin: number;
  priceMax: number;
  breakdown: PriceLineItem[];
  /** Preis aus Fallback-Mapping (450–1800 €), kein Accordion */
  istFallback: boolean;
  budgetCheck: BudgetCheck;
  dringlichkeit: NotfallDringlichkeit | null;
  zugaenglichkeit: Zugaenglichkeit | null;
  zustand: ObjektZustand | null;
  fachdetails: FachdetailsState;
  /** Optionale Gesamtnotiz (z. B. Lead); Fachdetails haben eigene `freitext`-Felder. */
  freitext?: string | null;
  /** Mehr als zwei Fachdetail-Gewerke möglich — es werden nur zwei abgefragt */
  showOmitHint?: boolean;
  photos: File[];
  name: string;
  vorname: string;
  nachname: string;
  leadBeschreibung: string;
  email: string;
  telefon: string;
  selectedSlot: { date: string; time: string } | null;
  submitted: boolean;
}

export interface StepOption {
  value: string;
  label: string;
  hint?: string;
  /** Kachel-Icon (ersetzt SVG wo gesetzt) */
  emoji?: string;
  priceTag?: string;
  /** Multiplikator für Preislogik (optional) */
  faktor?: number;
  infoText?: string;
  warnText?: string;
  triggerGewerke?: string[];
  /** Für Größen-Tiles: repräsentativer Zahlenwert (z. B. m², Stück, Laufmeter) */
  groesse?: number;
  /** Optional: Abschnittsüberschrift vor dieser Kachel (Bereiche gruppiert) */
  section?: string;
  /** Sofort zur Beratung / Komplex — kein normaler Rechner-Flow */
  direktKomplex?: boolean;
}

/** Nur für Rechner-Navigation / Progress (nicht der Konfig-Schritt `FunnelStep`). */
/** Trust-Zwischenscreens im Bärenwald-Rechner (Navigation, kein Konfig-Schritt). */
export type BwTrustScreenId =
  | "trust_intro"
  | "trust_preis"
  | "trust_qualitaet";

export function isBwTrustScreenId(step: string): step is BwTrustScreenId {
  return (
    step === "trust_intro" ||
    step === "trust_preis" ||
    step === "trust_qualitaet"
  );
}

export function isFachdetailStep(step: string): boolean {
  return step.startsWith("fachdetails_");
}

export function getFachdetailGewerk(step: string): string {
  return step.replace(/^fachdetails_/, "");
}

export interface FunnelStep {
  id: string;
  question: string;
  subtext?: string;
  inputType:
    | "tiles-single"
    | "tiles-multi"
    | "chips-single"
    | "slider"
    | "plz"
    | "fachdetails";
  options?: StepOption[];
  sliderConfig?: {
    min: number;
    max: number;
    step: number;
    unit: string;
    defaultValue: number;
  };
}
