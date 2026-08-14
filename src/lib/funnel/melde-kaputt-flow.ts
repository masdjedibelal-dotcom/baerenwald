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
import type { FunnelChannel } from "@/lib/funnel/funnel-variant";
import {
  MELDE_BEREICHE,
  type MeldeBereichId,
  type MeldeBereichOption,
} from "@/lib/org/melde-bereiche";
import type { MeldeKategorie } from "@/lib/org/types";
import type { MeldeFachfrageUi } from "@/lib/org/melde-fachdetails";

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
 * Akut automatisch (Schadenminderung / Wohnungsnotlage) —
 * ohne Nutzer-Frage zur Dringlichkeit.
 */
export const MELDE_AKUT_BEREICH_IDS: readonly MeldeBereichId[] = [
  "wasser",
  "schimmel",
  "heizung",
  "strom",
  "dach",
] as const;

export function isMeldeAkutBereich(id: MeldeBereichId): boolean {
  return (MELDE_AKUT_BEREICH_IDS as readonly string[]).includes(id);
}

/** Melde-Bereiche ohne untypische Outdoor-Fälle (Baum/Sturm → Sonstiges/HV-Freitext). */
export const MELDE_KAPUTT_BEREICH_OPTIONS: MeldeBereichOption[] =
  MELDE_BEREICHE.filter((o) => o.id !== "baum_notfall");

export function meldeKategorieForBereich(
  bereichId: MeldeBereichId
): MeldeKategorie {
  return isMeldeAkutBereich(bereichId) ? "notfall" : "reparatur";
}

/** Funnel-Bereichswert → Kategorie für Persistenz. */
export function meldeKategorieFromFunnelBereich(
  bereich: string | null | undefined
): MeldeKategorie {
  return meldeKategorieForBereich(
    kaputtBereichToMeldeId(bereich ?? "sonstiges")
  );
}

export function meldeDringlichkeitFromBereich(
  bereichId: MeldeBereichId
): "sofort" | "diese_woche" {
  return isMeldeAkutBereich(bereichId) ? "sofort" : "diese_woche";
}

/** Dynamische Fachfragen — Folgefragen nur wenn nötig. */
export function getMeldeKaputtFachfragen(
  bereichFunnelValue: string,
  answers?: MeldeAnswers
): MeldeFachfrageUi[] {
  return getMeldeDynamicQuestions(bereichFunnelValue, answers);
}

export function meldeFachfragenComplete(
  answers: Record<string, string | string[]> | undefined,
  questions: MeldeFachfrageUi[]
): boolean {
  return meldeDynamicQuestionsComplete(questions, answers);
}
