import type { Situation } from "@/lib/funnel/types";
import { LEISTUNGEN } from "@/lib/routes";

const SEARCH_MAP: Record<string, Situation> = {
  streichen: "renovieren",
  tapezieren: "renovieren",
  farbe: "renovieren",
  wand: "renovieren",
  bad: "renovieren",
  badezimmer: "renovieren",
  boden: "renovieren",
  parkett: "renovieren",
  laminat: "renovieren",
  küche: "renovieren",
  kuche: "renovieren",
  fenster: "renovieren",
  renovier: "renovieren",
  heizung: "sanieren",
  wärmepumpe: "sanieren",
  waermepumpe: "sanieren",
  dach: "sanieren",
  dämmung: "sanieren",
  daemmung: "sanieren",
  elektrik: "sanieren",
  leitungen: "sanieren",
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
