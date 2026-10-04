/**
 * Melde-/HV-kaputt-Flow: realistische Bereiche, dynamische Fachfragen, Auto-Akut.
 * Website-Rechner (`web` / privat) bleibt unverändert detailliert.
 */

import {
  getMeldeDynamicQuestions,type MeldeAnswers
} from "@/lib/funnel/melde-dynamic-questions";
import {
  applyMeldeFrageVoice,
  type MeldeFrageVoice,
} from "@/lib/funnel/melde-frage-voice";
import type { FunnelChannel } from "@/lib/funnel/funnel-variant";
import {
  MELDE_BEREICHE,type MeldeBereichOption
} from "@/lib/org/melde-bereiche";
import type { MeldeFachfrageUi } from "@/lib/org/melde-fachdetails";

export type { MeldeFrageVoice };

/**
 * Kanäle mit vereinfachtem Melde-kaputt-Flow (kein Dringlichkeits-Schritt,
 * dynamische Fachfragen). Website-Rechner (`web`) bleibt unverändert.
 */
export function isMeldeKaputtChannel(channel: FunnelChannel): boolean {
  return (
    channel === "melde_anon" ||
    channel === "portal_hv" ||
    channel === "portal_privat"
  );
}

/** Melde-Bereiche für Kaputt-UI (Baum/Sturm liegt unter Sonstiges). */
export const MELDE_KAPUTT_BEREICH_OPTIONS: MeldeBereichOption[] = MELDE_BEREICHE;

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
