export type HandwerkerBewertungKategorieKey =
  | "qualitaet"
  | "termintreue"
  | "sauberkeit"
  | "kommunikation"
  | "preis_leistung";

export type HandwerkerBewertungScores = Record<HandwerkerBewertungKategorieKey, number>;

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

/** Wie formatHandwerkerBewertung im CRM — 1 Dezimalstelle, de-DE. */
export function formatHandwerkerBewertung(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
