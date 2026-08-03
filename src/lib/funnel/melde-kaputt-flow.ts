/**
 * Melde-/HV-kaputt-Flow: realistische Bereiche, kurze Fachfragen, Auto-Akut.
 * Website-Rechner (`web` / privat) bleibt unverändert detailliert.
 */

import {
  kaputtBereichToMeldeId,
} from "@/lib/funnel/melde-bereich-map";
import type { FunnelChannel } from "@/lib/funnel/funnel-variant";
import {
  MELDE_BEREICHE,
  type MeldeBereichId,
  type MeldeBereichOption,
} from "@/lib/org/melde-bereiche";
import type { MeldeKategorie } from "@/lib/org/types";
import {
  getMeldeFachdetailQuestions,
  type MeldeFachfrageUi,
} from "@/lib/org/melde-fachdetails";

/** Kanäle mit vereinfachtem Melde-kaputt-Flow (kein Dringlichkeits-Schritt). */
export function isMeldeKaputtChannel(channel: FunnelChannel): boolean {
  return (
    channel === "melde_anon" ||
    channel === "portal_mieter" ||
    channel === "portal_hv"
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
  return meldeKategorieForBereich(kaputtBereichToMeldeId(bereich ?? "sonstiges"));
}

export function meldeDringlichkeitFromBereich(
  bereichId: MeldeBereichId
): "sofort" | "diese_woche" {
  return isMeldeAkutBereich(bereichId) ? "sofort" : "diese_woche";
}

export function getMeldeKaputtFachfragen(
  bereichFunnelValue: string
): MeldeFachfrageUi[] {
  const bereichId = kaputtBereichToMeldeId(bereichFunnelValue);
  return getMeldeFachdetailQuestions({
    kategorie: meldeKategorieForBereich(bereichId),
    bereichId,
    plz: "",
  });
}

export function meldeFachfragenComplete(
  answers: Record<string, string | string[]> | undefined,
  questions: MeldeFachfrageUi[]
): boolean {
  if (!questions.length) return true;
  const a = answers ?? {};
  return questions.every((q) => {
    const v = a[q.id];
    const s = Array.isArray(v) ? v[0] : v;
    return s === "ja" || s === "nein";
  });
}
