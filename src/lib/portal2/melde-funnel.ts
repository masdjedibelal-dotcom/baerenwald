/**
 * Portal 2.0 TEIL C — gemeinsamer Meldeweg (`screenCreate` + Spec-Reihenfolge).
 *
 * Spec-Schrittfolge (verbindlich für Live):
 * objekt → einheiten → bereich → kategorie → fachdetail → notfall → medien →
 * beschreibung → stamm → verwaltung → regeln → termin → fertig
 *
 * Pflichtlogik erweitert aus Mock `createStepValid` / `createNext`
 * (Mock-Demo hatte nur objekt/kategorie/beschreibung/notfall).
 */

import {
  fachfragenComplete,
  getFachfragenForBereich,
} from "@/lib/portal2/fachfragen";
import type { MeldeBereichId } from "@/lib/org/melde-bereiche";
import type { MeldeKategorie } from "@/lib/org/types";

export const MELDE_FUNNEL_INTRO = {
  title: "Vorgang melden",
  sub: "Gleicher Meldeweg für Kunde, Eigentümer und Mieter.",
} as const;

export type MeldeFunnelStepId =
  | "objekt"
  | "einheiten"
  | "bereich"
  | "kategorie"
  | "fachdetail"
  | "notfall"
  | "medien"
  | "beschreibung"
  | "stamm"
  | "verwaltung"
  | "regeln"
  | "termin"
  | "fertig";

export type MeldeFunnelStep = readonly [MeldeFunnelStepId, string];

/** Spec TEIL C — feste Reihenfolge. */
export const MELDE_FUNNEL_STEPS: MeldeFunnelStep[] = [
  ["objekt", "Objekt"],
  ["einheiten", "Einheit"],
  ["bereich", "Bereich"],
  ["kategorie", "Kategorie"],
  ["fachdetail", "Details"],
  ["notfall", "Dringlichkeit"],
  ["medien", "Fotos"],
  ["beschreibung", "Beschreibung"],
  ["stamm", "Kontakt"],
  ["verwaltung", "Verwaltung"],
  ["regeln", "Regeln"],
  ["termin", "Terminwunsch"],
  ["fertig", "Absenden"],
];

export type MeldeFunnelDraft = {
  objekt?: string;
  einheit?: string;
  bereichId?: MeldeBereichId | null;
  kategorie?: MeldeKategorie | null;
  fachdetailAnswers?: Record<string, string>;
  /** Mock `notfall`: true = Akut */
  notfall?: boolean;
  beschreibung?: string;
  name?: string;
  email?: string;
  telefon?: string;
  regelnAccepted?: boolean;
  /** MELDE_SLOTS-Zeile oder qualitativ (`sofort`/`diese_woche`/`flexibel`) */
  terminwunsch?: string | null;
};

export const MELDE_FUNNEL_TITLES: Record<
  MeldeFunnelStepId,
  { de: string; en: string }
> = {
  objekt: { de: "Welches Objekt?", en: "Which property?" },
  einheiten: { de: "Welche Einheit?", en: "Which unit?" },
  bereich: { de: "Was ist betroffen?", en: "What is affected?" },
  kategorie: { de: "Welche Kategorie?", en: "Which category?" },
  fachdetail: { de: "Kurz nachgefragt", en: "A few details" },
  notfall: { de: "Wie dringend ist es?", en: "How urgent is it?" },
  medien: { de: "Fotos hinzufügen", en: "Add photos" },
  beschreibung: {
    de: "Beschreiben Sie das Anliegen",
    en: "Describe the issue",
  },
  stamm: { de: "Ihre Kontaktdaten", en: "Your contact details" },
  verwaltung: {
    de: "Ihre Hausverwaltung",
    en: "Your property management",
  },
  regeln: { de: "Hinweise & Einwilligung", en: "Notes & consent" },
  termin: { de: "Terminwunsch", en: "Preferred appointment" },
  fertig: { de: "Prüfen & absenden", en: "Review & submit" },
};

export const MELDE_FUNNEL_ERRORS: Record<string, { de: string; en: string }> = {
  objekt: {
    de: "Bitte ein Objekt auswählen.",
    en: "Please select a property.",
  },
  kategorie: {
    de: "Bitte eine Kategorie auswählen.",
    en: "Please select a category.",
  },
  bereich: {
    de: "Bitte einen Bereich auswählen.",
    en: "Please select an area.",
  },
  fachdetail: {
    de: "Bitte alle Fragen mit Ja oder Nein beantworten.",
    en: "Please answer all questions with Yes or No.",
  },
  beschreibung: {
    de: "Bitte mindestens 10 Zeichen beschreiben.",
    en: "Please describe with at least 10 characters.",
  },
  notfall: {
    de: "Bitte die Dringlichkeit wählen.",
    en: "Please choose urgency.",
  },
  stamm: {
    de: "Bitte Name und E-Mail angeben.",
    en: "Please enter name and email.",
  },
  regeln: {
    de: "Bitte der Verarbeitung zustimmen.",
    en: "Please accept data processing.",
  },
  termin: {
    de: "Bitte einen Terminwunsch wählen.",
    en: "Please choose a preferred slot.",
  },
};

/** Mock Notfall-Optionen (`screenCreate` notfall-Schritt). */
export const MELDE_NOTFALL_OPTIONS = [
  {
    id: "normal" as const,
    akut: false,
    de: { title: "Normal", sub: "Wird regulär eingeplant" },
    en: { title: "Normal", sub: "Scheduled as usual" },
  },
  {
    id: "akut" as const,
    akut: true,
    de: {
      title: "Akut / Notfall",
      sub: "Direkte Handwerker-Anfrage ohne Freigabe-Wartezeit",
    },
    en: {
      title: "Urgent / Emergency",
      sub: "Direct contractor request without approval wait",
    },
  },
] as const;

/**
 * Mock `createStepValid` + Spec-Erweiterungen.
 * Schritte ohne Pflicht → `true`.
 */
export function createStepValid(
  step: MeldeFunnelStepId,
  d: MeldeFunnelDraft
): boolean {
  if (step === "objekt") return !!d.objekt?.trim();
  if (step === "einheiten") return true;
  if (step === "bereich") return !!d.bereichId;
  if (step === "kategorie") return !!d.kategorie;
  if (step === "fachdetail") {
    const qs = getFachfragenForBereich(d.bereichId ?? "sonstiges");
    return fachfragenComplete(qs, d.fachdetailAnswers ?? {});
  }
  if (step === "notfall") return d.notfall !== undefined;
  if (step === "medien") return true;
  if (step === "beschreibung")
    return (d.beschreibung || "").trim().length >= 10;
  if (step === "stamm")
    return !!(d.name?.trim() && d.email?.trim());
  if (step === "verwaltung") return true;
  if (step === "regeln") return d.regelnAccepted === true;
  if (step === "termin") return !!d.terminwunsch?.trim();
  if (step === "fertig") return true;
  return true;
}

export function createStepError(
  step: MeldeFunnelStepId,
  lang: "de" | "en" = "de"
): string | null {
  const msg = MELDE_FUNNEL_ERRORS[step];
  if (!msg) return null;
  return lang === "en" ? msg.en : msg.de;
}

/**
 * Mock `createNext`: bei ungültig → Fehlertext; sonst Index+1 oder `done`.
 */
export function createNext(
  steps: MeldeFunnelStep[],
  createStep: number,
  d: MeldeFunnelDraft
):
  | { ok: false; error: string }
  | { ok: true; createStep: number; done: boolean } {
  const step = steps[createStep]?.[0];
  if (!step) {
    return { ok: false, error: "Ungültiger Schritt." };
  }
  if (!createStepValid(step, d)) {
    return {
      ok: false,
      error: createStepError(step, "de") ?? "Bitte Angaben prüfen.",
    };
  }
  if (createStep < steps.length - 1) {
    return { ok: true, createStep: createStep + 1, done: false };
  }
  return { ok: true, createStep, done: true };
}

export function meldeFunnelTitle(
  step: MeldeFunnelStepId,
  lang: "de" | "en"
): string {
  const t = MELDE_FUNNEL_TITLES[step];
  return lang === "en" ? t.en : t.de;
}
