import type { ProduktGroesse } from "./types";

export type GartenMatrixRow = {
  id: string;
  label: string;
  primary?: boolean;
  s: string;
  m: string;
  l: string;
};

export const GARTEN_PAKET_FEATURE_MATRIX: GartenMatrixRow[] = [
  {
    id: "rasen",
    label: "Rasen mähen & Kanten schneiden",
    s: "yes",
    m: "yes",
    l: "yes",
  },
  {
    id: "hecken",
    label: "Hecken & Sträucher",
    s: "yes",
    m: "yes",
    l: "yes",
  },
  {
    id: "unkraut",
    label: "Beete von Unkraut befreien",
    s: "yes",
    m: "yes",
    l: "yes",
  },
  {
    id: "entsorgung",
    label: "Laub, Schnittgut & Entsorgung",
    s: "yes",
    m: "yes",
    l: "yes",
  },
  {
    id: "team",
    label: "Fester Ansprechpartner — gleiches Team",
    s: "yes",
    m: "yes",
    l: "yes",
  },
  {
    id: "hecken_gross",
    label: "Größere Heckenpartien & Ecken",
    primary: true,
    s: "no",
    m: "yes",
    l: "yes",
  },
  {
    id: "terrassen",
    label: "Gehwege & Terrassen von Laub befreien",
    primary: true,
    s: "no",
    m: "yes",
    l: "yes",
  },
  {
    id: "hang",
    label: "Hanglagen & schwer zugängliche Flächen",
    primary: true,
    s: "no",
    m: "no",
    l: "nach Absprache",
  },
  {
    id: "saison",
    label: "Saisonale Extras (z. B. Laubmassen Herbst)",
    primary: true,
    s: "no",
    m: "no",
    l: "yes",
  },
];

export const GARTEN_GROESSE_QM: Record<ProduktGroesse, number> = {
  s: 80,
  m: 200,
  l: 350,
};

export function getGartenFeatureValue(
  row: GartenMatrixRow,
  groesse: ProduktGroesse
): string {
  return row[groesse];
}
