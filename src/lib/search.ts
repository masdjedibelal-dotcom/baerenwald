import type { Situation } from "@/lib/funnel/types";
import { LEISTUNGEN } from "@/lib/routes";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Suche: **nur exakte** Treffer (Label/Slug wie in den Chip-Vorschlägen) plus wenige feste Phrasen.
 * Kein Treffer → neutraler Start mit `?nf=1` und `q` (kurzer Hinweis auf dem Rechner).
 */
export type HeroSearchResolution =
  | { kind: "leistung"; slug: string }
  | { kind: "situation"; situation: Situation };

/** Chip-Texte aus HomeLanding ohne dedizierten Leistungs-Slug */
const EXTRA_SITUATION_PHRASES: [string, Situation][] = [
  ["wohnung streichen", "erneuern"],
  ["heizung tauschen", "erneuern"],
  ["dringend notfall", "notfall"],
  ["dringend — notfall", "notfall"],
  ["dringend - notfall", "notfall"],
];

export function resolveHeroSearchQuery(raw: string): HeroSearchResolution | null {
  const n = normalize(raw.trim().slice(0, 80));
  if (!n) return null;

  for (const l of LEISTUNGEN) {
    if (n === normalize(l.label)) return { kind: "leistung", slug: l.slug };
    const slugSpaced = normalize(l.slug.replace(/-/g, " "));
    const slugCompact = normalize(l.slug.replace(/-/g, ""));
    if (n === slugSpaced || n === slugCompact) {
      return { kind: "leistung", slug: l.slug };
    }
  }

  for (const [phrase, situation] of EXTRA_SITUATION_PHRASES) {
    if (n === normalize(phrase)) return { kind: "situation", situation };
  }

  return null;
}

export function buildSearchUrl(query: string): string {
  const raw = query.trim().slice(0, 80);
  if (!raw) return "/rechner";

  const res = resolveHeroSearchQuery(raw);
  if (!res) {
    const p = new URLSearchParams();
    p.set("nf", "1");
    p.set("q", raw);
    return `/rechner?${p.toString()}`;
  }

  const params = new URLSearchParams();
  params.set("q", raw);
  if (res.kind === "leistung") {
    params.set("leistung", res.slug);
    return `/rechner?${params.toString()}`;
  }
  params.set("situation", res.situation);
  return `/rechner?${params.toString()}`;
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
 * Bis zu `max` Vorschläge: gleiche Leistungen wie in der Navigation,
 * gefiltert nach getippter Zeichenfolge (Vervollständigung).
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
