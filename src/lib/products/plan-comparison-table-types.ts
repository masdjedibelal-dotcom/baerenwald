export type QmBand = {
  id: string;
  label: string;
  value: number;
};

export type ComparisonColumn = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  priceLabel: string;
  empfohlen?: boolean;
};

export type ComparisonInputRow = {
  kind: "input-band";
  id: string;
  label: string;
  bands: QmBand[];
  value: number;
  onChange: (value: number) => void;
};

export type ComparisonFeatureValue = "yes" | "no" | (string & {});

export type ComparisonFeatureRow = {
  kind: "feature";
  id: string;
  label: string;
  detail?: string;
  values: Record<string, ComparisonFeatureValue>;
};

export type ComparisonRow = ComparisonInputRow | ComparisonFeatureRow;
