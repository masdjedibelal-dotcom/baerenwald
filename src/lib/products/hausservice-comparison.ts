import {
  HAUSSERVICE_EMPFOHLEN_STUFE,
  HAUSSERVICE_STUFE_LABELS,
  HAUSSERVICE_STUFE_TAGLINES,
} from "@/lib/leistungen/converter-copy";
import {
  computeHausserviceMonatPreis,
  type HausservicePreisInput,
} from "@/lib/products/hausservice-preis";
import { buildHausserviceVergleich } from "@/lib/products/plan-vergleich";
import { formatProduktPreisRange } from "@/lib/products/produkt-preis";
import type {
  ComparisonColumn,
  ComparisonFeatureRow,
  ComparisonInputRow,
  ComparisonRow,
  QmBand,
} from "@/lib/products/plan-comparison-table-types";
import type { HausserviceStufe } from "./types";

export type { QmBand };

export const WOHNFLAECHE_BANDS: QmBand[] = [
  { id: "wf-60", label: "40 – 80 m²", value: 60 },
  { id: "wf-100", label: "80 – 120 m²", value: 100 },
  { id: "wf-160", label: "120 – 200 m²", value: 160 },
  { id: "wf-275", label: "200 – 350 m²", value: 275 },
];

export const GARTENFLAECHE_BANDS: QmBand[] = [
  { id: "g-0", label: "Kein Garten", value: 0 },
  { id: "g-80", label: "0 – 80 m²", value: 80 },
  { id: "g-120", label: "80 – 200 m²", value: 120 },
  { id: "g-275", label: "200 – 350 m²", value: 275 },
];

const STUFEN: HausserviceStufe[] = ["basis", "komfort", "premium"];

export function bandForValue(bands: QmBand[], value: number): QmBand {
  return bands.reduce((best, band) =>
    Math.abs(band.value - value) < Math.abs(best.value - value) ? band : best
  );
}

export function buildHausserviceComparisonRows(
  input: HausservicePreisInput,
  onWohnflaeche: (v: number) => void,
  onGarten: (v: number) => void
): ComparisonRow[] {
  const vergleich = buildHausserviceVergleich(STUFEN, {
    basis: "S",
    komfort: "M",
    premium: "L",
  });

  const inputRows: ComparisonInputRow[] = [
    {
      kind: "input-band",
      id: "wohnflaeche",
      label: "Wohnfläche",
      bands: WOHNFLAECHE_BANDS,
      value: bandForValue(WOHNFLAECHE_BANDS, input.wohnflaeche).value,
      onChange: onWohnflaeche,
    },
    {
      kind: "input-band",
      id: "garten",
      label: "Gartenfläche",
      bands: GARTENFLAECHE_BANDS,
      value: bandForValue(GARTENFLAECHE_BANDS, input.gartenQm).value,
      onChange: onGarten,
    },
  ];

  const featureRows: ComparisonFeatureRow[] = vergleich.rows.map((row) => ({
    kind: "feature",
    id: row.id,
    label: row.label,
    detail: row.detail,
    values: Object.fromEntries(
      STUFEN.map((s) => [s, row.values[s] === "yes" ? "yes" : "no"] as const)
    ) as Record<string, "yes" | "no">,
  }));

  return [...inputRows, ...featureRows];
}

export function buildHausserviceComparisonColumns(
  input: HausservicePreisInput
): ComparisonColumn[] {
  return STUFEN.map((stufe) => {
    const band = computeHausserviceMonatPreis(stufe, input);
    return {
      id: stufe,
      slug: `hausservice-${stufe}`,
      name: HAUSSERVICE_STUFE_LABELS[stufe],
      subtitle: HAUSSERVICE_STUFE_TAGLINES[stufe],
      priceLabel: formatProduktPreisRange(band.min, band.max),
      empfohlen: stufe === HAUSSERVICE_EMPFOHLEN_STUFE,
    };
  });
}
