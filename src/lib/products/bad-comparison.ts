import {
  PAKET_EMPFOHLEN_STUFE,
  PAKET_GROESSE_LABELS,
  PAKET_STUFE_LABELS,
  PAKET_STUFE_TAGLINES,
} from "@/lib/leistungen/converter-copy";
import {
  BAD_PAKET_FEATURE_MATRIX,
  getBadFeatureValue,
} from "@/lib/products/bad-feature-matrix";
import { formatProduktPreisRange, produktPreis } from "@/lib/products/produkt-preis";
import type {
  ComparisonColumn,
  ComparisonFeatureRow,
  ComparisonInputRow,
  ComparisonRow,
  QmBand,
} from "@/lib/products/plan-comparison-table-types";
import type { BadAusstattungStufe, ProduktGroesse } from "./types";

const STUFEN: BadAusstattungStufe[] = ["standard", "komfort", "gehoben"];

const GROESSE_QM: Record<ProduktGroesse, number> = {
  s: 4,
  m: 6,
  l: 10,
};

export const BAD_GROESSE_BANDS: QmBand[] = (
  ["s", "m", "l"] as ProduktGroesse[]
).map((g) => ({
  id: `bad-${g}`,
  label: PAKET_GROESSE_LABELS[g].hint,
  value: GROESSE_QM[g],
}));

export function groesseFromQm(qm: number): ProduktGroesse {
  return (["s", "m", "l"] as ProduktGroesse[]).reduce((best, g) =>
    Math.abs(GROESSE_QM[g] - qm) < Math.abs(GROESSE_QM[best] - qm) ? g : best
  );
}

export function bandForGroesseQm(qm: number): QmBand {
  return BAD_GROESSE_BANDS.reduce((best, band) =>
    Math.abs(band.value - qm) < Math.abs(best.value - qm) ? band : best
  );
}

function slugForBad(groesse: ProduktGroesse, stufe: BadAusstattungStufe): string {
  return `bad-${groesse}-${stufe}`;
}

export function buildBadComparisonRows(
  groesseQm: number,
  onGroesseQm: (qm: number) => void
): ComparisonRow[] {
  const inputRows: ComparisonInputRow[] = [
    {
      kind: "input-band",
      id: "badgroesse",
      label: "Badgröße",
      bands: BAD_GROESSE_BANDS,
      value: bandForGroesseQm(groesseQm).value,
      onChange: onGroesseQm,
    },
  ];

  const featureRows: ComparisonFeatureRow[] = BAD_PAKET_FEATURE_MATRIX.filter(
    (row) => row.primary
  ).map((row) => ({
    kind: "feature",
    id: row.id,
    label: row.label,
    detail: row.tooltip,
    values: Object.fromEntries(
      STUFEN.map((s) => [s, getBadFeatureValue(row, s)])
    ),
  }));

  return [...inputRows, ...featureRows];
}

export function buildBadComparisonColumns(groesse: ProduktGroesse): ComparisonColumn[] {
  return STUFEN.map((stufe) => {
    const slug = slugForBad(groesse, stufe);
    const preis = produktPreis(slug);
    const priceLabel =
      preis && preis.min > 0
        ? formatProduktPreisRange(preis.min, preis.max)
        : "—";

    return {
      id: stufe,
      slug,
      name: PAKET_STUFE_LABELS[stufe],
      subtitle: PAKET_STUFE_TAGLINES[stufe],
      priceLabel,
      empfohlen: stufe === PAKET_EMPFOHLEN_STUFE,
    };
  });
}
