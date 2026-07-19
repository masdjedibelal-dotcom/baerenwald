import type { Situation } from "@/lib/funnel/types";
import {
  getLeistungRechnerPreset,
  heroPresetIsProjektGu,
} from "@/lib/funnel/leistung-rechner-preset";
import { LEISTUNGEN, type LeistungKategorie } from "@/lib/routes";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Suche: **exakte** Treffer (Label/Slug) plus feste Phrasen.
 * Kein Treffer → `/rechner?q=…` (Auffang im Flow).
 */
export type HeroSearchResolution =
  | { kind: "leistung"; slug: string }
  | { kind: "situation"; situation: Situation };

const EXTRA_SITUATION_PHRASES: [string, Situation][] = [
  ["wohnung streichen", "erneuern"],
  ["heizung tauschen", "erneuern"],
  ["dringend notfall", "kaputt"],
  ["dringend — notfall", "kaputt"],
  ["dringend - notfall", "kaputt"],
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

/** Rechner-URL inkl. `situation`, `gewerk`, optional `projekt=1`, `q`. */
export function buildHeroRechnerLandingUrl(slug: string, label: string): string {
  const preset = getLeistungRechnerPreset(slug);
  const rawQ = label.trim().slice(0, 80);
  if (!preset) {
    const p = new URLSearchParams();
    if (rawQ) p.set("q", rawQ);
    return p.toString() ? `/rechner?${p.toString()}` : "/rechner";
  }
  const params = new URLSearchParams();
  params.set("situation", preset.situation);
  const g = preset.bereiche[0];
  if (g) params.set("gewerk", g);
  if (heroPresetIsProjektGu(slug)) params.set("projekt", "1");
  if (rawQ) params.set("q", rawQ);
  return `/rechner?${params.toString()}`;
}

export function buildSearchUrl(query: string): string {
  const raw = query.trim().slice(0, 80);
  if (!raw) return "/rechner";

  const res = resolveHeroSearchQuery(raw);
  if (!res) {
    const p = new URLSearchParams();
    p.set("q", raw);
    return `/rechner?${p.toString()}`;
  }

  if (res.kind === "leistung") {
    const l = LEISTUNGEN.find((x) => x.slug === res.slug);
    return buildHeroRechnerLandingUrl(res.slug, l?.label ?? raw);
  }

  const params = new URLSearchParams();
  params.set("q", raw);
  params.set("situation", res.situation);
  return `/rechner?${params.toString()}`;
}

export interface HeroSearchSuggestion {
  slug: string;
  label: string;
  category: LeistungKategorie;
}

/** Quick-Start bei leerem Feld: Bad, Dachausbau, Heizung, Wanddurchbruch, Garten */
export const HERO_QUICK_START_SLUGS: string[] = [
  "bad-sanieren",
  "dachbodenausbau",
  "heizung-defekt",
  "wanddurchbruch",
  "gartengestaltung",
];

export function getHeroSearchSuggestions(
  query: string,
  max = 5
): HeroSearchSuggestion[] {
  const q = normalize(query.trim());
  if (!q) {
    const out: HeroSearchSuggestion[] = [];
    for (const slug of HERO_QUICK_START_SLUGS) {
      const l = LEISTUNGEN.find((x) => x.slug === slug);
      if (l)
        out.push({
          slug: l.slug,
          label: l.label,
          category: l.category,
        });
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
    category: l.category,
  }));
}

export function heroKategorieLabel(c: LeistungKategorie): string {
  switch (c) {
    case "projekt":
      return "Projekt";
    case "reparatur":
      return "Reparatur";
    case "service":
      return "Service";
  }
}
