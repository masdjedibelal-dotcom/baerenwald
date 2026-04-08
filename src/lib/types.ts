export type Situation =
  | "renovierung"
  | "neubau"
  | "akut"
  | "pflege"
  | "b2b";

export type Mode = "single" | "multi";

export type Dringlichkeit =
  | "notfall"
  | "dringend"
  | "diese_woche"
  | "irgendwann";

export interface PriceLineItem {
  gewerk: string;
  beschreibung: string;
  min: number;
  max: number;
  einheit: string;
  note?: string;
}

/** Antwort für Schritt `shared_plz` (PLZ + Zeitraum-Chip) */
export interface PlzZeitraumAnswer {
  plz: string;
  zeitraum: string;
}

export type StepAnswerValue =
  | string
  | string[]
  | number
  | PlzZeitraumAnswer;

export interface SelectedSlot {
  dateISO: string;
  time: string;
}

export interface FunnelState {
  situation: Situation | null;
  mode: Mode | null;
  answers: Record<string, StepAnswerValue>;
  gewerke: string[];
  flaeche: number;
  zustand: string;
  frequenz: string;
  dringlichkeit: Dringlichkeit | null;
  plz: string;
  zeitraum: string;
  priceMin: number;
  priceMax: number;
  priceBreakdown: PriceLineItem[];
  photos: File[];
  name: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  anmerkungen: string;
  selectedSlot: SelectedSlot | null;
  beratung: boolean;
  entscheider: boolean;
  b2bPrio: string;
  skipCalendar: boolean;
}

export type FunnelInputType =
  | "tiles-single"
  | "tiles-multi"
  | "chips-single"
  | "chips-multi"
  | "slider"
  | "text"
  | "plz"
  | "plz-zeitraum";

export interface StepOption {
  value: string;
  label: string;
  hint?: string;
  priceTag?: string;
  infoExpand?: string;
  triggerGewerke?: string[];
  triggerMode?: Mode;
  warnText?: string;
}

export interface FunnelStep {
  id: string;
  question: string;
  subtext?: string;
  inputType: FunnelInputType;
  options?: StepOption[];
  sliderConfig?: {
    min: number;
    max: number;
    step: number;
    unit: string;
    defaultValue: number;
  };
  infoText?: string;
  showFor?: Partial<FunnelState>;
}

/** Lead-Übermittlung (API / Formular) */
export interface LeadPayload {
  name: string;
  email: string;
  telefon?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

/** Chips / Auswahl-Komponenten */
export interface ChipOption {
  value: string;
  label: string;
  hint?: string;
}

export interface FakeTimeSlot {
  id: string;
  label: string;
  isoStart: string;
}
