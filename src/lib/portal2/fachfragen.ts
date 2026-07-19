/**
 * Portal 2.0 TEIL C — Mock `FACHFRAGEN` (3 Ja/Nein pro Kategorie, de+en).
 */

import fachfragenData from "@/lib/portal2/fachfragen-data.json";
import type { MeldeBereichId } from "@/lib/org/melde-bereiche";

export type FachfragenLang = "de" | "en";

/** Mock-Keys in `FACHFRAGEN`. */
export type FachfragenBereichKey =
  | "wasser"
  | "heizung"
  | "strom"
  | "fenster"
  | "dach"
  | "schimmel"
  | "sonstiges";

export type FachfragePair = readonly [de: string, en: string];

export type FachfrageItem = {
  id: string;
  index: number;
  de: string;
  en: string;
};

/** Wortwörtlich aus Mock `FACHFRAGEN`. */
export const FACHFRAGEN = fachfragenData as unknown as Record<
  FachfragenBereichKey,
  FachfragePair[]
>;

const BEREICH_TO_FACH: Record<MeldeBereichId, FachfragenBereichKey> = {
  wasser: "wasser",
  heizung: "heizung",
  strom: "strom",
  fenster_tuer: "fenster",
  dach: "dach",
  schimmel: "schimmel",
  baum_notfall: "sonstiges",
  sonstiges: "sonstiges",
};

/** Mock-wl `bereich` → FACHFRAGEN-Key (fenster bleibt fenster). */
export function fachfragenKeyFromMeldeBereich(
  bereichId: MeldeBereichId | string | null | undefined
): FachfragenBereichKey {
  if (!bereichId) return "sonstiges";
  if (bereichId in BEREICH_TO_FACH) {
    return BEREICH_TO_FACH[bereichId as MeldeBereichId];
  }
  if (bereichId === "fenster") return "fenster";
  if (bereichId in FACHFRAGEN) return bereichId as FachfragenBereichKey;
  return "sonstiges";
}

export function getFachfragenForBereich(
  bereichId: MeldeBereichId | string | null | undefined
): FachfrageItem[] {
  const key = fachfragenKeyFromMeldeBereich(bereichId);
  const pairs = FACHFRAGEN[key] ?? FACHFRAGEN.sonstiges;
  return pairs.map(([de, en], index) => ({
    id: `ff_${key}_${index}`,
    index,
    de,
    en,
  }));
}

export function fachfrageLabel(
  item: FachfrageItem,
  lang: FachfragenLang
): string {
  return lang === "en" ? item.en : item.de;
}

/** Alle 3 Fragen beantwortet (ja/nein). */
export function fachfragenComplete(
  questions: FachfrageItem[],
  answers: Record<string, string | boolean | undefined>
): boolean {
  return questions.every((q) => {
    const v = answers[q.id];
    return v === "ja" || v === "nein" || v === true || v === false;
  });
}

/** Strukturierte Ablage am Lead (`funnel_daten.fachfragen`). */
export function buildFachfragenLeadPayload(
  bereichId: MeldeBereichId | string,
  answers: Record<string, string | boolean | undefined>
): {
  bereichKey: FachfragenBereichKey;
  items: Array<{
    id: string;
    index: number;
    de: string;
    en: string;
    answer: boolean;
  }>;
} {
  const bereichKey = fachfragenKeyFromMeldeBereich(bereichId);
  const questions = getFachfragenForBereich(bereichId);
  return {
    bereichKey,
    items: questions.map((q) => {
      const raw = answers[q.id];
      const answer = raw === true || raw === "ja";
      return {
        id: q.id,
        index: q.index,
        de: q.de,
        en: q.en,
        answer,
      };
    }),
  };
}
