import type { Situation } from "@/lib/funnel/types";

/**
 * Einstieg über `?leistung=<slug>` (wie in routes LEISTUNGEN) — Situation + Gewerk-Kachel(n).
 * Einheitliche Quelle für Suche, Leistungsseiten und Deep-Links.
 */
export type LeistungRechnerPreset = {
  situation: Situation;
  /** Werte wie in {@link SITUATIONEN_CONFIG} (z. B. erneuern → `bad`) */
  bereiche: string[];
};

export const LEISTUNG_RECHNER_PRESET: Record<string, LeistungRechnerPreset> = {
  malerarbeiten: { situation: "erneuern", bereiche: ["waende"] },
  "badezimmer-sanierung": { situation: "erneuern", bereiche: ["bad"] },
  bodenbelag: { situation: "erneuern", bereiche: ["boden"] },
  elektroarbeiten: { situation: "erneuern", bereiche: ["elektrik"] },
  "heizung-sanitaer": { situation: "erneuern", bereiche: ["heizung"] },
  gartenpflege: { situation: "betreuung", bereiche: ["garten"] },
  gartengestaltung: { situation: "erneuern", bereiche: ["gartengestaltung"] },
  winterdienst: { situation: "betreuung", bereiche: ["winter"] },
  hausmeisterservice: { situation: "gewerbe", bereiche: [] },
  "fenster-tueren": { situation: "erneuern", bereiche: ["fenster"] },
  trockenbau: { situation: "erneuern", bereiche: ["trockenbau"] },
  /** Dach-Leistungsseite: Reparatur / Defekt passt zur Kachel „Dach-Problem“ */
  dacharbeiten: { situation: "kaputt", bereiche: ["dach"] },
};

export function getLeistungRechnerPreset(
  slug: string | null | undefined
): LeistungRechnerPreset | null {
  if (!slug) return null;
  const s = slug.trim();
  return LEISTUNG_RECHNER_PRESET[s] ?? null;
}
