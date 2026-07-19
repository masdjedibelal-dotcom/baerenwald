import {
  BAD_PAKET_FEATURE_MATRIX,
  getBadFeatureValue,
} from "./bad-feature-matrix";
import {
  GARTEN_PAKET_FEATURE_MATRIX,
  getGartenFeatureValue,
} from "./garten-feature-matrix";
import {
  HAUSSERVICE_FEATURE_MATRIX,
  getHausserviceFeatureValue,
} from "./hausservice-feature-matrix";
import type {
  BadAusstattungStufe,
  HausserviceStufe,
  ProduktGroesse,
} from "./types";

export type VergleichColumn = {
  id: string;
  label: string;
};

export type VergleichRow = {
  id: string;
  label: string;
  detail?: string;
  values: Record<string, string>;
};

export function buildBadVergleich(
  stufen: BadAusstattungStufe[],
  columnLabels: Record<BadAusstattungStufe, string>
): { columns: VergleichColumn[]; rows: VergleichRow[] } {
  const columns = stufen.map((s) => ({
    id: s,
    label: columnLabels[s],
  }));

  const rows = BAD_PAKET_FEATURE_MATRIX.filter((row) => row.primary).map((row) => ({
    id: row.id,
    label: row.label,
    values: Object.fromEntries(
      stufen.map((s) => [s, getBadFeatureValue(row, s)])
    ),
  }));

  return { columns, rows };
}

export function buildGartenVergleich(
  groessen: ProduktGroesse[],
  columnLabels: Record<ProduktGroesse, string>
): { columns: VergleichColumn[]; rows: VergleichRow[] } {
  const columns = groessen.map((g) => ({
    id: g,
    label: columnLabels[g],
  }));

  const rows = GARTEN_PAKET_FEATURE_MATRIX.filter((row) => row.primary).map((row) => ({
    id: row.id,
    label: row.label,
    values: Object.fromEntries(
      groessen.map((g) => [g, getGartenFeatureValue(row, g)])
    ),
  }));

  return { columns, rows };
}

export function buildHausserviceVergleich(
  stufen: HausserviceStufe[],
  columnLabels: Record<HausserviceStufe, string>
): { columns: VergleichColumn[]; rows: VergleichRow[] } {
  const columns = stufen.map((s) => ({
    id: s,
    label: columnLabels[s],
  }));

  const rows = HAUSSERVICE_FEATURE_MATRIX.filter((row) => row.primary).map(
    (row) => ({
      id: row.id,
      label: row.label,
      detail: row.detail,
      values: Object.fromEntries(
        stufen.map((s) => [s, getHausserviceFeatureValue(row, s)])
      ),
    })
  );

  return { columns, rows };
}
