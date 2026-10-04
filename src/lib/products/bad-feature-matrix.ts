import type { BadAusstattungStufe } from "./types";

export type PaketFeatureWert = "yes" | "no" | "text";

export type PaketFeatureRow = {
  id: string;
  label: string;
  tooltip?: string;
  /** Im Vergleich standardmäßig sichtbar (ohne Aufklappen). */
  primary?: boolean;
  standard: PaketFeatureWert | string;
  komfort: PaketFeatureWert | string;
  gehoben: PaketFeatureWert | string;
};

/** Vergleichsmatrix Bad — zeigt echte Unterschiede zwischen Stufen. */
export const BAD_PAKET_FEATURE_MATRIX: PaketFeatureRow[] = [
  {
    id: "demontage",
    label: "Demontage & Entsorgung altes Bad",
    standard: "yes",
    komfort: "yes",
    gehoben: "yes",
  },
  {
    id: "sanitaer",
    label: "Sanitärinstallation (Dusche, WC, Waschtisch)",
    standard: "yes",
    komfort: "yes",
    gehoben: "yes",
  },
  {
    id: "fliesen",
    label: "Fliesen Boden & Wände",
    standard: "yes",
    komfort: "yes",
    gehoben: "yes",
  },
  {
    id: "elektro",
    label: "Elektro & Beleuchtung",
    standard: "yes",
    komfort: "yes",
    gehoben: "yes",
  },
  {
    id: "abdichtung",
    label: "Abdichtung & Untergrundvorbereitung",
    standard: "yes",
    komfort: "yes",
    gehoben: "yes",
  },
  {
    id: "gu",
    label: "GU-Koordination — ein Ansprechpartner",
    standard: "yes",
    komfort: "yes",
    gehoben: "yes",
  },
  {
    id: "bodengleich",
    label: "Bodengleiche Dusche",
    primary: true,
    standard: "no",
    komfort: "yes",
    gehoben: "yes",
  },
  {
    id: "armaturen",
    label: "Armaturen & Sanitär",
    primary: true,
    standard: "Standard",
    komfort: "Hochwertig",
    gehoben: "Premium",
  },
  {
    id: "nischen",
    label: "Nischen & Ablagen in Fliesen",
    primary: true,
    standard: "no",
    komfort: "yes",
    gehoben: "yes",
  },
  {
    id: "fliesen_qual",
    label: "Fliesenqualität",
    primary: true,
    standard: "Standard",
    komfort: "Erweitert",
    gehoben: "Premium",
  },
  {
    id: "licht",
    label: "Indirekte Beleuchtung & Design-Spiegel",
    primary: true,
    standard: "no",
    komfort: "no",
    gehoben: "yes",
  },
  {
    id: "heizkoerper",
    label: "Heizkörper / Handtuchheizung",
    standard: "optional",
    komfort: "optional",
    gehoben: "optional",
  },
  {
    id: "lueftung",
    label: "Lüftung / Entlüftung",
    standard: "yes",
    komfort: "yes",
    gehoben: "yes",
  },
  {
    id: "spiegelschrank",
    label: "Spiegelschrank / Spiegel",
    standard: "Standard",
    komfort: "Erweitert",
    gehoben: "Design",
  },
  {
    id: "bauschutt",
    label: "Entsorgung Bauschutt & Altmaterial",
    standard: "yes",
    komfort: "yes",
    gehoben: "yes",
  },
  {
    id: "besichtigung",
    label: "Vor-Ort-Besichtigung vor Festpreis",
    standard: "yes",
    komfort: "yes",
    gehoben: "yes",
  },
  {
    id: "barrierefrei",
    label: "Barrierefreie Ausstattung",
    primary: true,
    tooltip:
      "Nach Besichtigung — abhängig von Anforderungen (z. B. bodengleicher Zugang, Haltegriffe).",
    standard: "no",
    komfort: "no",
    gehoben: "individuell",
  },
];

export function getBadFeatureValue(
  row: PaketFeatureRow,
  stufe: BadAusstattungStufe
): string {
  const v = row[stufe];
  if (v === "yes") return "yes";
  if (v === "no") return "no";
  return String(v);
}
