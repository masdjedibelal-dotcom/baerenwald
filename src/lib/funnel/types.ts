export type Situation =
  | "renovieren"
  | "sanieren"
  | "notfall"
  | "neubauen"
  | "betreuung";

export type Zeitraum = "sofort" | "4wochen" | "1-3monate" | "offen";

export type BudgetCheck = "ok" | "zu_hoch" | null;

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
  photos: File[];
  name: string;
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
    | "plz";
  options?: StepOption[];
  sliderConfig?: {
    min: number;
    max: number;
    step: number;
    unit: string;
    defaultValue: number;
  };
}
