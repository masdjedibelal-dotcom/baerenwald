import { BW_FUNNEL_STEP1_OPTIONS } from "@/lib/funnel/situation-options";
import {
  BW_FUNNEL_STEP_BAD_AUSSTATTUNG,
  BW_FUNNEL_STEP_ZUGAENGLICHKEIT,
  BW_FUNNEL_STEP_ZUSTAND,
  getKundentypOptions,
  getZeitraumOptions,
  SITUATIONEN_CONFIG,
} from "@/lib/funnel/config";
import type { Situation } from "@/lib/funnel/types";

/** Bereichs-Kacheln (Slug → Anzeige) — Rechner + Kaputt-Pfade. */
export const BEREICH_LABELS: Record<string, string> = {
  heizung: "Heizung",
  elektrik: "Elektrik",
  elektro: "Elektrik",
  strom: "Elektrik",
  waende: "Wände / Anstrich",
  maler: "Wände / Anstrich",
  streichen: "Wände / Anstrich",
  waende_boeden: "Wände / Böden",
  bad: "Bad",
  boden: "Boden",
  trockenbau: "Trennwand / Umbau",
  fenster: "Fenster / Türen",
  fenster_tuer: "Fenster / Tür kaputt",
  fenster_tueren: "Fenster / Türen",
  dach: "Dach",
  fassade: "Fassade",
  gartengestaltung: "Gartengestaltung",
  garten: "Garten",
  baum: "Baum",
  baumarbeiten: "Baumarbeiten",
  baum_notfall: "Baum / Sturmschaden",
  ausbau_dg: "Dachausbau / DG",
  ausbau_keller: "Kellerausbau",
  grundriss_umbau: "Wanddurchbruch",
  anbau: "Anbau oder Garage",
  sanitaer: "Sanitär / Wasser",
  wasser: "Sanitär / Wasser",
  schimmel: "Schimmel / Feuchtigkeit",
  feuchtigkeit_schimmel: "Feuchte / Schimmel",
  reinigung: "Reinigung",
  winterdienst: "Winterdienst",
  hausmeister: "Hausmeister",
  terrasse: "Terrasse / Außen",
  terrasse_neu: "Terrasse neu",
  kaputt: "Reparatur",
};

function collectBereichLabelsFromConfig(): void {
  for (const sit of Object.values(SITUATIONEN_CONFIG)) {
    for (const step of sit.steps) {
      for (const opt of step.options ?? []) {
        if (opt.value && opt.label) {
          BEREICH_LABELS[opt.value] = opt.label;
        }
      }
    }
  }
}
collectBereichLabelsFromConfig();

/** Situation (Slug → Anzeige). */
export const SITUATION_LABELS: Record<string, string> =
  Object.fromEntries(
    BW_FUNNEL_STEP1_OPTIONS.map((o) => [o.id, o.label])
  );

/** Kundentyp — alle Situationen. */
const KUNDENTYP_LABELS: Record<string, string> = {};
for (const sit of [
  "erneuern",
  "kaputt",
  "betreuung",
  "gewerbe",
] as Situation[]) {
  for (const o of getKundentypOptions(sit)) {
    KUNDENTYP_LABELS[o.value] = o.label.replace(/^Ich bin /, "");
  }
}
KUNDENTYP_LABELS.eigentuemer = "Eigentümer";
KUNDENTYP_LABELS.mieter = "Mieter";
KUNDENTYP_LABELS.hausverwaltung = "Hausverwaltung";

/** Zeitraum — alle Situationen. */
const ZEITRAUM_LABELS: Record<string, string> = {};
for (const sit of [
  "erneuern",
  "kaputt",
  "betreuung",
  "gewerbe",
] as Situation[]) {
  for (const o of getZeitraumOptions(sit)) {
    ZEITRAUM_LABELS[o.value] = o.label;
  }
}
ZEITRAUM_LABELS.heute = "Heute";
ZEITRAUM_LABELS.woche = "Diese Woche";
ZEITRAUM_LABELS.naechstes_jahr = "Nächstes Jahr";
ZEITRAUM_LABELS.sechs_monate = "In 3–6 Monaten";

/** Dringlichkeit (Kaputt-Schritt). */
const DRINGLICHKEIT_LABELS: Record<string, string> = {};
for (const opt of SITUATIONEN_CONFIG.kaputt.steps.find(
  (s) => s.id === "kaputt_dringlichkeit"
)?.options ?? []) {
  DRINGLICHKEIT_LABELS[opt.value] = opt.label;
}

const ZUGAENGLICHKEIT_LABELS: Record<string, string> = Object.fromEntries(
  (BW_FUNNEL_STEP_ZUGAENGLICHKEIT.options ?? []).map((o) => [o.value, o.label])
);

const ZUSTAND_LABELS: Record<string, string> = Object.fromEntries(
  (BW_FUNNEL_STEP_ZUSTAND.options ?? []).map((o) => [o.value, o.label])
);

const BAD_AUSSTATTUNG_LABELS: Record<string, string> = Object.fromEntries(
  (BW_FUNNEL_STEP_BAD_AUSSTATTUNG.options ?? []).map((o) => [o.value, o.label])
);

/** Bereich → Gewerk-Schlüssel für Fachdetail-Zuordnung. */
export const FACHDETAIL_TO_LEISTUNG: Record<string, string> = {
  bad: "sanitaer",
  wasser: "sanitaer",
  sanitaer: "sanitaer",
  waende: "maler",
  maler: "maler",
  streichen: "maler",
  waende_boeden: "maler",
  elektrik: "elektro",
  elektro: "elektro",
  strom: "elektro",
  heizung: "heizung",
  boden: "boden",
  dach: "dach",
  fassade: "fassade",
  fenster: "fenster",
  fenster_tuer: "fenster",
  fenster_tueren: "fenster",
  garten: "garten",
  baum: "garten",
  baumarbeiten: "garten",
  baum_notfall: "garten",
  gartengestaltung: "garten",
};

export function labelBereich(slug: string | undefined): string {
  if (!slug?.trim()) return "—";
  return BEREICH_LABELS[slug.trim()] ?? slug.replace(/_/g, " ");
}

export function labelSituation(slug: string | undefined | null): string {
  if (!slug?.trim()) return "—";
  const k = slug.trim();
  return SITUATION_LABELS[k] ?? k.replace(/_/g, " ");
}

export function labelKundentyp(slug: string | undefined | null): string {
  if (!slug?.trim()) return "";
  return KUNDENTYP_LABELS[slug.trim()] ?? slug.replace(/_/g, " ");
}

export function labelZeitraum(slug: string | undefined | null): string {
  if (!slug?.trim()) return "";
  return ZEITRAUM_LABELS[slug.trim()] ?? slug.replace(/_/g, " ");
}

export function labelDringlichkeit(slug: string | undefined | null): string {
  if (!slug?.trim()) return "";
  return DRINGLICHKEIT_LABELS[slug.trim()] ?? labelZeitraum(slug);
}

export function labelZugaenglichkeit(slug: string | undefined | null): string {
  if (!slug?.trim()) return "";
  return ZUGAENGLICHKEIT_LABELS[slug.trim()] ?? slug.replace(/_/g, " ");
}

export function labelZustand(slug: string | undefined | null): string {
  if (!slug?.trim()) return "";
  return ZUSTAND_LABELS[slug.trim()] ?? slug.replace(/_/g, " ");
}

export function labelBadAusstattung(slug: string | undefined | null): string {
  if (!slug?.trim()) return "";
  return BAD_AUSSTATTUNG_LABELS[slug.trim()] ?? slug.replace(/_/g, " ");
}
