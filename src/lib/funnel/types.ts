export type Situation =
  | "erneuern"
  | "kaputt"
  | "betreuung"
  | "gewerbe";

export function isB2B(s: Situation | null | undefined): boolean {
  return s === "gewerbe";
}

/** Notfall Schritt 2 — Pauschale siehe {@link getNotdienstGebuehr} */
export type NotfallDringlichkeit = "sofort" | "heute" | "diese_woche";

export function isReparatur(s: Situation | null | undefined): boolean {
  return s === "kaputt";
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
  /** Flache Antworten je Frage-ID (`fachdetail_<id>`); parallel zu den Legacy-Feldern unten. */
  fachdetailAnswers?: Record<string, string | string[] | undefined>;
  /** Ausbau & Umbau (Situation „Zuhause erneuern“) — Durchbruch, Terrasse, Projektdetails. */
  projekt?: {
    /** Anzahl Durchbrüche (1, 2, 3+ abgebildet als 3) */
    durchbruchAnzahl?: number;
    /** `true` = tragende Wand, `false` = nicht tragend */
    durchbruchTragend?: boolean;
    terrasseMaterial?: "holz" | "stein";
    /** UI-Wert `ja` | `nein` — „Unterbau erforderlich?“ */
    terrasseUnterbau?: "ja" | "nein";
    /** Gartengestaltung: Auffrischung vs. komplette Neuanlage — bestimmt €/m²-Band */
    gartenLeistung?: "auffrischung" | "neuanlage";
    /** „Zuhause erneuern“ → Gartengestaltung (GU-Paket) */
    gartenZaun?: "ja" | "nein";
    gartenZugaenglichkeit?: "einfach" | "schwer";
    /** Kellerausbau / DG: Rohbau vorhanden — Preis nur bei „ja“ + ausreichender Höhe */
    ausbauRohbau?: "ja" | "nein";
    /** Geschosshöhe nach Rohbau (DG/Keller) */
    ausbauDeckenhoehe?: "niedrig" | "mittel" | "hoch";
  };
  elektro?: {
    problem?: string;
    folge?: string;
    freitext?: string | null;
  };
  sanitaer?: {
    lage?: string;
    badWas?: string;
    /** Checkboxen Waschbecken / WC / Armaturen bei `badWas` „objekte“ (Legacy: „sanitaer“). */
    objektListe?: string[];
    rohre?: string;
    /** Explizite komplette Rohrernneuerung (falls nicht über `rohre === "neu"` abgebildet). */
    badRohreNeu?: boolean;
    /** Notfall-Flow: nur Schwere, ohne Lage/Rohre */
    notfallSchwere?: string;
    freitext?: string | null;
  };
  heizung?: {
    typ?: string;
    /** Nur „Zuhause erneuern“ + Heizung: Ziel nach aktueller Anlage (Fachdetail `heizung_ziel`). */
    ziel?: "waermepumpe" | "hybrid" | "gas_brennwert" | "beratung";
    alter?: string;
    vorhaben?: string;
    /** Nur Heizkörper tauschen: Anzahl Stück (multipliziert den Stückpreis). */
    anzahl?: number;
    freitext?: string | null;
  };
  /** Gewerk „fassade“ — Weiche über `fassade_art`. */
  fassade?: {
    art?: "anstrich" | "daemmung" | "bekleidung" | "klinker";
  };
  maler?: {
    was?: string;
    zustand?: string;
    /** @deprecated Früher Maler→Fassade; nur noch in alten Saves */
    fassade?: string;
    freitext?: string | null;
  };
  boden?: {
    aktuell?: string;
    /** Gewünschter neuer Bodenbelag (z. B. Parkett/Laminat/Vinyl/Fliesen/Teppich). */
    ziel?: string;
    /** @deprecated Nur alte Saves — UI-Frage „Belag zu behandeln“ entfernt. */
    zustand?: string;
    /** Verlegeart/Rückbau (Follow-up Fliesen/Laminat/Parkett) — Basis für Abriss-Zuschlag. */
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
    /** Erneuern: auch tuer / balkon_tuer (balkon → Preis wie premium). */
    ausstattung?: "standard" | "premium" | "tuer" | "balkon_tuer";
    /** Kaputt: „Was ist defekt?“ */
    defekt?: string;
    freitext?: string | null;
  };
  /**
   * Historisch: „Neubauen“-Pfad wurde entfernt und auf „erneuern“ umgestellt.
   * Optional, damit alte gespeicherte Funnel-Daten und optional übrige
   * Typkompatibilität bei alten Saves / noch vorhandenen Hilfsmodulen im Repo.
   */
  neubauen?: Record<string, unknown>;
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
  /** @deprecated Kein Fallback-Preis mehr — immer false */
  istFallback: boolean;
  /** z. B. `no_mapping_found` wenn kein Preis-Mapping */
  komplexReason?: string | null;
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
  return step.startsWith("fachdetail_") || step.startsWith("fachdetails_");
}

/** Frage-ID aus Screen `fachdetail_<id>` (ohne Gewerk — nur für Logging). */
export function getFachdetailGewerk(step: string): string {
  return step.replace(/^fachdetail_/, "").replace(/^fachdetails_/, "");
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
