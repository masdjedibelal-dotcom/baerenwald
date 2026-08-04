import type { Situation } from "@/lib/funnel/types";
import { isErneuernProjektBereich } from "@/lib/funnel/projekt-erneuern";

/**
 * Einstieg über `?leistung=<slug>` oder `?situation=…&gewerk=…` — Situation + Gewerk-Kachel.
 */
export type LeistungRechnerPreset = {
  situation: Situation;
  /** Werte wie in {@link SITUATIONEN_CONFIG} (z. B. erneuern → `bad`) */
  bereiche: string[];
};

/** Slug aus URL (`bad-sanieren-muenchen`) → Preset-Key (`bad-sanieren`). */
export function normalizeLeistungPresetKey(slug: string): string {
  const t = slug.trim();
  return t.endsWith("-muenchen") ? t.slice(0, -"-muenchen".length) : t;
}

export const LEISTUNG_RECHNER_PRESET: Record<string, LeistungRechnerPreset> = {
  /* ── Master-Liste (Hero / Marketing) ── */
  dachbodenausbau: { situation: "erneuern", bereiche: ["ausbau_dg"] },
  kellerausbau: { situation: "erneuern", bereiche: ["ausbau_keller"] },
  wanddurchbruch: { situation: "erneuern", bereiche: ["grundriss_umbau"] },
  terrassenbau: { situation: "erneuern", bereiche: ["gartengestaltung"] },
  gartengestaltung: { situation: "erneuern", bereiche: ["gartengestaltung"] },
  "bad-sanieren": { situation: "erneuern", bereiche: ["bad"] },
  "boden-verlegen": { situation: "erneuern", bereiche: ["boden"] },
  fassadendaemmung: { situation: "erneuern", bereiche: ["fassade"] },
  "heizung-defekt": { situation: "kaputt", bereiche: ["heizung"] },
  rohrbruch: { situation: "kaputt", bereiche: ["sanitaer"] },
  stromausfall: { situation: "kaputt", bereiche: ["elektro"] },
  dachschaden: { situation: "kaputt", bereiche: ["dach"] },
  "baum-sturmschaden": { situation: "kaputt", bereiche: ["baum_notfall"] },
  winterdienst: { situation: "betreuung", bereiche: ["winter"] },
  gartenpflege: { situation: "betreuung", bereiche: ["garten"] },
  baumarbeiten: { situation: "betreuung", bereiche: ["baum"] },
  hausmeisterservice: { situation: "betreuung", bereiche: ["hausmeister"] },

  /* ── Legacy-Slugs (Bookmarks / externe Links) ── */
  malerarbeiten: { situation: "erneuern", bereiche: ["waende"] },
  "badezimmer-sanierung": { situation: "erneuern", bereiche: ["bad"] },
  bodenbelag: { situation: "erneuern", bereiche: ["boden"] },
  elektroarbeiten: { situation: "erneuern", bereiche: ["elektrik"] },
  "heizung-sanitaer": { situation: "erneuern", bereiche: ["heizung"] },
  "fenster-tueren": { situation: "erneuern", bereiche: ["fenster"] },
  trockenbau: { situation: "erneuern", bereiche: ["trockenbau"] },
  dacharbeiten: { situation: "kaputt", bereiche: ["dach"] },
};

export function getLeistungRechnerPreset(
  slug: string | null | undefined
): LeistungRechnerPreset | null {
  if (!slug) return null;
  const key = normalizeLeistungPresetKey(slug);
  return LEISTUNG_RECHNER_PRESET[key] ?? null;
}

/** Für Deep-Links: Projekt-GU-Kacheln unter „Zuhause erneuern“. */
export function heroPresetIsProjektGu(slug: string): boolean {
  const key = normalizeLeistungPresetKey(slug);
  const p = LEISTUNG_RECHNER_PRESET[key];
  return p ? isErneuernProjektBereich(p.bereiche) : false;
}

/** Prüft, ob `gewerk` als erste Kachel zu `situation` im Rechner vorkommt (Deep-Link). */
export function isRechnerDeepLinkPair(
  situation: Situation,
  gewerk: string
): boolean {
  return Object.values(LEISTUNG_RECHNER_PRESET).some(
    (p) => p.situation === situation && p.bereiche[0] === gewerk
  );
}
