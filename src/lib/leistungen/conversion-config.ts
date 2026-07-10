import type { ConversionMode } from "@/lib/products/types";

/** Konverter-Typ pro Leistungs-Basis-Slug. */
export const LEISTUNG_CONVERSION_MODE: Record<string, ConversionMode> = {
  "badezimmer-sanierung": { type: "paket" },
  "bad-sanieren": { type: "paket" },
  malerarbeiten: { type: "kurzflow" },
  bodenbelag: { type: "kurzflow" },
  "boden-verlegen": { type: "kurzflow" },
  "fenster-tueren": { type: "kurzflow" },
  trockenbau: { type: "kurzflow" },
  "heizung-sanitaer": { type: "kurzflow", karussellSlugs: ["heizung-sanitaer-notfall", "wasser-notfall"] },
  "heizung-defekt": { type: "notfall" },
  rohrbruch: { type: "notfall" },
  elektroarbeiten: { type: "kurzflow", karussellSlugs: ["elektro-notfall"] },
  stromausfall: { type: "notfall" },
  dacharbeiten: { type: "kurzflow" },
  dachschaden: { type: "notfall" },
  gartenpflege: { type: "paket" },
  gartengestaltung: { type: "rechner_only" },
  winterdienst: { type: "kurzflow" },
  hausmeisterservice: { type: "kurzflow" },
  gebauedereinigung: { type: "kurzflow" },
  wartung: { type: "kurzflow" },
  baumarbeiten: { type: "kurzflow" },
  dachbodenausbau: { type: "rechner_only" },
  kellerausbau: { type: "rechner_only" },
  wanddurchbruch: { type: "rechner_only" },
  terrassenbau: { type: "rechner_only" },
  fassadendaemmung: { type: "rechner_only" },
};

export function getConversionMode(leistungSlug: string): ConversionMode {
  const key = leistungSlug.endsWith("-muenchen")
    ? leistungSlug.slice(0, -"-muenchen".length)
    : leistungSlug;
  return LEISTUNG_CONVERSION_MODE[key] ?? { type: "kurzflow" };
}

export function isNotfallKarussellSlug(karussellSlug: string): boolean {
  return (
    karussellSlug === "heizung-sanitaer-notfall" ||
    karussellSlug === "wasser-notfall" ||
    karussellSlug === "elektro-notfall"
  );
}
