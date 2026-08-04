export type FixSlug =
  | "fix-armatur"
  | "fix-verstopfung"
  | "fix-steckdose"
  | "fix-fi";

export type FixMatrixRow = {
  id: string;
  label: string;
  primary?: boolean;
  "fix-armatur": string;
  "fix-verstopfung": string;
  "fix-steckdose": string;
  "fix-fi": string;
};

export const FIX_PAKET_FEATURE_MATRIX: FixMatrixRow[] = [
  {
    id: "gewerk",
    label: "Gewerk",
    primary: true,
    "fix-armatur": "Sanitär",
    "fix-verstopfung": "Sanitär",
    "fix-steckdose": "Elektro",
    "fix-fi": "Elektro",
  },
  {
    id: "diagnose",
    label: "Vor-Ort-Diagnose",
    "fix-armatur": "yes",
    "fix-verstopfung": "yes",
    "fix-steckdose": "yes",
    "fix-fi": "yes",
  },
  {
    id: "material",
    label: "Material (Armatur / Ersatzteil)",
    primary: true,
    "fix-armatur": "optional",
    "fix-verstopfung": "—",
    "fix-steckdose": "optional",
    "fix-fi": "optional",
  },
  {
    id: "notfall",
    label: "Typischer Einsatz",
    primary: true,
    "fix-armatur": "Geplant",
    "fix-verstopfung": "Dringend",
    "fix-steckdose": "Geplant",
    "fix-fi": "Dringend",
  },
  {
    id: "pruefung",
    label: "Sicherheits- / Dichtheitsprüfung",
    primary: true,
    "fix-armatur": "yes",
    "fix-verstopfung": "yes",
    "fix-steckdose": "VDE",
    "fix-fi": "VDE",
  },
  {
    id: "doku",
    label: "Dokumentation auf Wunsch",
    "fix-armatur": "yes",
    "fix-verstopfung": "yes",
    "fix-steckdose": "yes",
    "fix-fi": "Prüfprotokoll",
  },
  {
    id: "entsorgung",
    label: "Entsorgung Alt-Teile / Ablagerungen",
    "fix-armatur": "yes",
    "fix-verstopfung": "yes",
    "fix-steckdose": "yes",
    "fix-fi": "—",
  },
];

export const FIX_PAKET_LABELS: Record<FixSlug, string> = {
  "fix-armatur": "Armatur",
  "fix-verstopfung": "Verstopfung",
  "fix-steckdose": "Steckdose",
  "fix-fi": "FI / Sicherung",
};

export function getFixFeatureValue(row: FixMatrixRow, slug: FixSlug): string {
  return row[slug];
}
