/**
 * Melde-/HV-kaputt-Flow: realistische Bereiche, dynamische Fachfragen, Auto-Akut.
 * Website-Rechner (`web` / privat) bleibt unverändert detailliert.
 */

import { kaputtBereichToMeldeId } from "@/lib/funnel/melde-bereich-map";
import {
  getMeldeDynamicQuestions,
  meldeDynamicQuestionsComplete,
  type MeldeAnswers,
} from "@/lib/funnel/melde-dynamic-questions";
import {
  applyMeldeFrageVoice,
  type MeldeFrageVoice,
} from "@/lib/funnel/melde-frage-voice";
import type { FunnelChannel } from "@/lib/funnel/funnel-variant";
import {
  MELDE_BEREICHE,
  type MeldeBereichId,
  type MeldeBereichOption,
} from "@/lib/org/melde-bereiche";
import type { MeldeKategorie } from "@/lib/org/types";
import type { MeldeFachfrageUi } from "@/lib/org/melde-fachdetails";

export type { MeldeFrageVoice };

/**
 * Kanäle mit vereinfachtem Melde-kaputt-Flow (kein Dringlichkeits-Schritt,
 * dynamische Fachfragen). Website-Rechner (`web`) bleibt unverändert.
 */
export function isMeldeKaputtChannel(channel: FunnelChannel): boolean {
  return (
    channel === "melde_anon" ||
    channel === "portal_mieter" ||
    channel === "portal_hv" ||
    channel === "portal_privat" ||
    channel === "portal_eigentuemer"
  );
}

/**
 * @deprecated Bereich allein entscheidet nicht mehr über Sofortmaßnahmen.
 * Nutze `isMeldeDirektauftrag` (Fachfragen). Liste leer gehalten für Imports.
 */
export const MELDE_AKUT_BEREICH_IDS: readonly MeldeBereichId[] = [] as const;

export function isMeldeAkutBereich(_id: MeldeBereichId): boolean {
  return false;
}

/** Melde-Bereiche für Kaputt-UI (Baum/Sturm liegt unter Sonstiges). */
export const MELDE_KAPUTT_BEREICH_OPTIONS: MeldeBereichOption[] = MELDE_BEREICHE;

/** @deprecated Nutze meldeKategorieForDirektauftragFlow + isMeldeDirektauftrag. */
export function meldeKategorieForBereich(
  bereichId: MeldeBereichId
): MeldeKategorie {
  if (
    bereichId === "wasser" ||
    bereichId === "dach" ||
    bereichId === "schimmel"
  ) {
    return "schaden";
  }
  return "reparatur";
}

/** Funnel-Bereichswert → Kategorie für Persistenz (ohne Auto-Notfall). */
export function meldeKategorieFromFunnelBereich(
  bereich: string | null | undefined
): MeldeKategorie {
  return meldeKategorieForBereich(
    kaputtBereichToMeldeId(bereich ?? "sonstiges")
  );
}

export function meldeDringlichkeitFromBereich(
  _bereichId: MeldeBereichId
): "sofort" | "diese_woche" {
  return "diese_woche";
}

/** Dynamische Fachfragen — Folgefragen nur wenn nötig. */
export function getMeldeKaputtFachfragen(
  bereichFunnelValue: string,
  answers?: MeldeAnswers,
  voice: MeldeFrageVoice = "mieter"
): MeldeFachfrageUi[] {
  return applyMeldeFrageVoice(
    getMeldeDynamicQuestions(bereichFunnelValue, answers),
    voice
  );
}

export function meldeFachfragenComplete(
  answers: Record<string, string | string[]> | undefined,
  questions: MeldeFachfrageUi[]
): boolean {
  return meldeDynamicQuestionsComplete(questions, answers);
}
