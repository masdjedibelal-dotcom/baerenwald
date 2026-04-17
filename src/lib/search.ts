import type { Situation } from "@/lib/funnel/types";
import { LEISTUNGEN } from "@/lib/routes";

const SEARCH_MAP: Record<string, Situation> = {
  /** Legacy-/Umgangssprache → gleicher Rechner-Flow wie „Zuhause erneuern“ */
  renovieren: "erneuern",
  sanieren: "erneuern",
  streichen: "erneuern",
  tapezieren: "erneuern",
  farbe: "erneuern",
  wand: "erneuern",
  bad: "erneuern",
  badezimmer: "erneuern",
  boden: "erneuern",
  parkett: "erneuern",
  laminat: "erneuern",
  küche: "erneuern",
  kuche: "erneuern",
  fenster: "erneuern",
  renovier: "erneuern",
  heizung: "erneuern",
  wärmepumpe: "erneuern",
  waermepumpe: "erneuern",
  dach: "erneuern",
  dämmung: "erneuern",
  daemmung: "erneuern",
  elektrik: "erneuern",
  leitungen: "erneuern",
  kaputt: "notfall",
  defekt: "notfall",
  notfall: "notfall",
  dringend: "notfall",
  rohr: "notfall",
  wasser: "notfall",
  "strom weg": "notfall",
  garten: "betreuung",
  mähen: "betreuung",
  maehen: "betreuung",
  schneiden: "betreuung",
  winterdienst: "betreuung",
  hausmeister: "betreuung",
  reinigung: "betreuung",
  anbau: "neubauen",
  umbau: "neubauen",
  terrasse: "neubauen",
  ausbauen: "neubauen",
  "wand einziehen": "neubauen",
  büro: "gewerbe",
  buero: "gewerbe",
  praxis: "gewerbe",
  laden: "gewerbe",
  gewerbe: "gewerbe",
  restaurant: "gastro",
  gastronomie: "gastro",
  gastro: "gastro",
  cafe: "gastro",
  hotel: "gastro",
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function findSituation(query: string): Situation | null {
  const q = normalize(query.trim());
  if (!q) return null;
  const entries = Object.entries(SEARCH_MAP).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [keyword, situation] of entries) {
    if (q.includes(normalize(keyword))) return situation;
  }
  return null;
}

export function findLeistungSlug(query: string): string | null {
  const q = normalize(query.trim());
  if (q.length < 2) return null;
  const sorted = [...LEISTUNGEN].sort(
    (a, b) => b.label.length + b.kurz.length - (a.label.length + a.kurz.length)
  );
  for (const l of sorted) {
    const slugNorm = normalize(l.slug.replace(/-/g, " "));
    if (slugNorm.length >= 3 && q.includes(slugNorm)) return l.slug;
    const labelN = normalize(l.label);
    if (labelN.length >= 3 && q.includes(labelN)) return l.slug;
    const kurzN = normalize(l.kurz);
    if (kurzN.length >= 4 && q.includes(kurzN)) return l.slug;
  }
  return null;
}

export function buildSearchUrl(query: string): string {
  const raw = query.trim().slice(0, 80);
  if (!raw) return "/rechner";
  const situation = findSituation(raw);
  if (situation) {
    return `/rechner?situation=${situation}&q=${encodeURIComponent(raw)}`;
  }
  const leistung = findLeistungSlug(raw);
  if (leistung) {
    return `/rechner?leistung=${encodeURIComponent(leistung)}&q=${encodeURIComponent(raw)}`;
  }
  return `/rechner?q=${encodeURIComponent(raw)}`;
}

/** Ein Eintrag für die Hero-Suchvorschläge (Leistungen). */
export interface HeroSearchSuggestion {
  slug: string;
  label: string;
  emoji: string;
}

const DEFAULT_HERO_SUGGESTION_SLUGS: string[] = [
  "badezimmer-sanierung",
  "malerarbeiten",
  "heizung-sanitaer",
  "elektroarbeiten",
  "bodenbelag",
];

/**
 * Bis zu `max` Vorschläge für die Landing-Suche: bei leerem Feld beliebte Leistungen,
 * sonst Filter nach Label, Slug, Kurztext und Hint.
 */
export function getHeroSearchSuggestions(
  query: string,
  max = 5
): HeroSearchSuggestion[] {
  const q = normalize(query.trim());
  if (!q) {
    const out: HeroSearchSuggestion[] = [];
    for (const slug of DEFAULT_HERO_SUGGESTION_SLUGS) {
      const l = LEISTUNGEN.find((x) => x.slug === slug);
      if (l) out.push({ slug: l.slug, label: l.label, emoji: l.icon });
      if (out.length >= max) break;
    }
    return out;
  }

  const scored: { l: (typeof LEISTUNGEN)[number]; score: number }[] = [];

  for (const l of LEISTUNGEN) {
    const labelN = normalize(l.label);
    const kurzN = normalize(l.kurz);
    const hintN = normalize(l.hint);
    const slugN = normalize(l.slug.replace(/-/g, " "));
    const firstWord = labelN.split(/[^a-z0-9]+/)[0] || labelN;
    const slugFirst = slugN.split(/[^a-z0-9]+/)[0] || "";

    let score = 0;
    if (labelN.startsWith(q)) score += 120;
    else if (firstWord.startsWith(q)) score += 105;
    else if (slugFirst.startsWith(q)) score += 95;
    else if (labelN.includes(q)) score += 70;
    else if (slugN.includes(q)) score += 55;

    if (q.length >= 2) {
      if (kurzN.includes(q)) score += 30;
      if (hintN.includes(q)) score += 12;
    }

    if (score > 0) scored.push({ l, score });
  }

  scored.sort(
    (a, b) => b.score - a.score || a.l.label.localeCompare(b.l.label, "de")
  );

  return scored.slice(0, max).map(({ l }) => ({
    slug: l.slug,
    label: l.label,
    emoji: l.icon,
  }));
}
