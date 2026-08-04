/** Keys = {@link HandwerkerContentItem.leistung} aus handwerker-content.json */

export const HANDWERKER_PREISE: Record<
  string,
  { von: number; bis: number; einheit: string }
> = {
  maler: {
    von: 12,
    bis: 22,
    einheit: "pro m² Wandfläche",
  },
  elektriker: {
    von: 85,
    bis: 140,
    einheit: "pro Punkt",
  },
  sanitaer: {
    von: 80,
    bis: 180,
    einheit: "pro Stunde",
  },
  bodenleger: {
    von: 35,
    bis: 140,
    einheit: "pro m²",
  },
  fliesenleger: {
    von: 45,
    bis: 120,
    einheit: "pro m²",
  },
  heizung: {
    von: 8000,
    bis: 22000,
    einheit: "pauschal",
  },
  dachdecker: {
    von: 80,
    bis: 180,
    einheit: "pro m²",
  },
  badsanierung: {
    von: 6500,
    bis: 20000,
    einheit: "pauschal",
  },
};

export const HANDWERKER_RECHNER_SLUGS: Record<string, string> = {
  maler: "malerarbeiten",
  elektriker: "elektroarbeiten",
  sanitaer: "heizung-sanitaer",
  bodenleger: "bodenbelag",
  fliesenleger: "badezimmer-sanierung",
  heizung: "heizung-sanitaer",
  dachdecker: "dacharbeiten",
  badsanierung: "badezimmer-sanierung",
};

export const HANDWERKER_LEISTUNG_LABELS: Record<string, string> = {
  maler: "Malerarbeiten",
  elektriker: "Elektroarbeiten",
  sanitaer: "Sanitär",
  bodenleger: "Bodenleger",
  fliesenleger: "Fliesenleger",
  heizung: "Heizung",
  dachdecker: "Dacharbeiten",
  badsanierung: "Badsanierung",
};
