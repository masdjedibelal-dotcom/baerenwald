export type HandwerkerBewertungKategorieKey =
  | "qualitaet"
  | "termintreue"
  | "sauberkeit"
  | "kommunikation"
  | "preis_leistung";

export type HandwerkerBewertungScores = Record<HandwerkerBewertungKategorieKey, number>;

export const HANDWERKER_BEWERTUNG_KATEGORIEN: ReadonlyArray<{
  key: HandwerkerBewertungKategorieKey;
  label: string;
}> = [
  { key: "qualitaet", label: "Qualität der Arbeit" },
  { key: "termintreue", label: "Termintreue" },
  { key: "sauberkeit", label: "Sauberkeit & Ordnung" },
  { key: "kommunikation", label: "Kommunikation" },
  { key: "preis_leistung", label: "Preis-Leistung" },
] as const;

export type PartnerAuftragBewertung = HandwerkerBewertungScores & {
  updated_at?: string | null;
};

export type PartnerHandwerkerBewertungProfil = {
  bewertung_gesamt: number | null;
  bewertung_qualitaet: number | null;
  bewertung_termintreue: number | null;
  bewertung_sauberkeit: number | null;
  bewertung_kommunikation: number | null;
  bewertung_preis_leistung: number | null;
  bewertung_anzahl: number;
};

export function durchschnittAusBewertung(scores: HandwerkerBewertungScores): number {
  const sum = HANDWERKER_BEWERTUNG_KATEGORIEN.reduce(
    (acc, k) => acc + (scores[k.key] ?? 0),
    0
  );
  return sum / HANDWERKER_BEWERTUNG_KATEGORIEN.length;
}

/** Wie formatHandwerkerBewertung im CRM — 1 Dezimalstelle, de-DE. */
export function formatHandwerkerBewertung(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function isAuftragAbgeschlossen(status: string): boolean {
  const s = status.toLowerCase();
  return s === "abgeschlossen" || s.includes("abgeschlossen");
}
