import handwerkerContent from "@/data/handwerker-content.json";
import {
  HANDWERKER_LEISTUNG_LABELS,
  HANDWERKER_RECHNER_SLUGS,
} from "@/lib/handwerker-config";
import type { HandwerkerContentItem } from "@/lib/handwerker-types";

const allEntries = handwerkerContent as HandwerkerContentItem[];

/** Leistungsseiten-Slug (ohne `-muenchen`) → {@link HandwerkerContentItem.leistung} */
const LEISTUNG_SLUG_TO_HANDWERKER: Record<string, string> = {
  malerarbeiten: "maler",
  "bad-sanieren": "badsanierung",
  "boden-verlegen": "bodenleger",
  "heizung-defekt": "heizung",
  rohrbruch: "sanitaer",
  stromausfall: "elektriker",
  dachschaden: "dachdecker",
};

export function handwerkerLeistungKeysFromRechnerSlug(
  rechnerSlug: string
): string[] {
  return Object.entries(HANDWERKER_RECHNER_SLUGS)
    .filter(([, slug]) => slug === rechnerSlug)
    .map(([key]) => key);
}

export function handwerkerLeistungKeysFromLeistungSlug(
  leistungSlug: string
): string[] {
  const direct = LEISTUNG_SLUG_TO_HANDWERKER[leistungSlug];
  if (direct) return [direct];
  const fromRechner = handwerkerLeistungKeysFromRechnerSlug(leistungSlug);
  if (fromRechner.length > 0) return fromRechner;
  return [];
}

export function getStadtteilLinks(
  handwerkerLeistungKeys: string[]
): HandwerkerContentItem[] {
  if (handwerkerLeistungKeys.length === 0) return [];
  const keys = new Set(handwerkerLeistungKeys);
  return allEntries
    .filter((c) => keys.has(c.leistung))
    .sort((a, b) => a.h1.localeCompare(b.h1, "de"));
}

export function stadtteilSectionLabel(
  handwerkerLeistungKeys: string[],
  fallbackLabel?: string
): string {
  if (fallbackLabel?.trim()) return fallbackLabel.trim();
  const key = handwerkerLeistungKeys[0];
  if (!key) return "Handwerker";
  return HANDWERKER_LEISTUNG_LABELS[key] ?? key;
}
