export type Situation =
  | "renovieren"
  | "sanieren"
  | "notfall"
  | "neubauen"
  | "betreuung"
  | "gewerbe"
  | "gastro";

export type Kundentyp =
  | "eigentuemer"
  | "mieter"
  | "hausverwaltung";

/** Gewünschter Start / Dringlichkeit (PLZ-Schritt) */
export type Zeitraum = "sofort" | "heute" | "woche" | "flexibel";

export type Zugaenglichkeit = "einfach" | "mittel" | "schwer";

export type ObjektZustand = "gut" | "mittel" | "schlecht";

export type BudgetCheck = "ok" | "zu_hoch" | null;

/** Detailantworten Schritt „fachdetails“ (Elektro / Sanitär / Heizung / weitere Gewerke) */
export type FachdetailsState = {
  elektro?: {
    problem?: string;
    folge?: string;
  };
  sanitaer?: {
    lage?: string;
    badWas?: string;
    badObjekte?: string[];
    rohre?: string;
  };
  heizung?: {
    typ?: string;
    alter?: string;
    vorhaben?: string;
  };
  maler?: {
    was?: string;
    zustand?: string;
    fassade?: string;
  };
  boden?: {
    aktuell?: string;
    verlegung?: string;
  };
  dach?: {
    vorhaben?: string;
    alter?: string;
  };
  garten?: {
    was?: string;
    haeufigkeit?: string;
    baumgroesse?: string;
    gestaltung?: string[];
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
  plz: string;
  zeitraum: Zeitraum | null;
  priceMin: number;
  priceMax: number;
  breakdown: PriceLineItem[];
  budgetCheck: BudgetCheck;
  dringlichkeit: "akut" | "stabil" | "nutzbar" | "keine_eile" | null;
  zugaenglichkeit: Zugaenglichkeit | null;
  zustand: ObjektZustand | null;
  fachdetails: FachdetailsState;
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
  priceTag?: string;
  /** Multiplikator für Preislogik (optional) */
  faktor?: number;
  infoText?: string;
  warnText?: string;
  triggerGewerke?: string[];
  /** Für Größen-Tiles: repräsentativer Zahlenwert (z. B. m², Stück, Laufmeter) */
  groesse?: number;
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
