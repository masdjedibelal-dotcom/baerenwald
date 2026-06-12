import type { HausserviceStufe } from "./types";

export type HausserviceMatrixRow = {
  id: string;
  label: string;
  detail?: string;
  primary?: boolean;
  basis: string;
  komfort: string;
  premium: string;
};

export const HAUSSERVICE_FEATURE_MATRIX: HausserviceMatrixRow[] = [
  {
    id: "hausmeister",
    label: "Hausmeister",
    detail:
      "Ansprechpartner vor Ort: Technik-Checks, Koordination, Kleinmängel melden, Schlüssel & Zugang. Monatliche Pauschale, skaliert mit Wohnfläche. Besuchsfrequenz nach Vereinbarung.",
    primary: true,
    basis: "yes",
    komfort: "yes",
    premium: "yes",
  },
  {
    id: "reinigung",
    label: "Reinigung",
    detail:
      "Regelmäßige Grundreinigung — Umfang und Häufigkeit (z. B. wöchentlich oder monatlich) legen wir nach Objektgröße fest. Basis ca. 1,30–2,00 € pro m² und Monat. Endpreis nach Besichtigung.",
    primary: true,
    basis: "no",
    komfort: "yes",
    premium: "yes",
  },
  {
    id: "garten",
    label: "Gartenarbeiten",
    detail:
      "Rasen, Hecken, Beete — abhängig von Gartenfläche. Abrechnung pro Besuch (ca. 55–220 € je nach Größe). Typisch 2× pro Monat in der Saison (Apr–Okt), Frequenz individuell.",
    primary: true,
    basis: "no",
    komfort: "yes",
    premium: "yes",
  },
  {
    id: "winter",
    label: "Winterdienst",
    detail:
      "Räumen und Streuen Nov–März. Saisonpauschale oder anteilig nach Fläche — Frequenz wetterabhängig. Nur im Premium-Paket enthalten.",
    primary: true,
    basis: "no",
    komfort: "no",
    premium: "yes",
  },
];

export function getHausserviceFeatureValue(
  row: HausserviceMatrixRow,
  stufe: HausserviceStufe
): string {
  return row[stufe];
}
