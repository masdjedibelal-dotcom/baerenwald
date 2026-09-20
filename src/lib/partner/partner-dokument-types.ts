/**
 * Typen + Nummern-Helfer für Partner-Dokumente (PDF läuft über CRM O5).
 */

export type PartnerDocPosition = {
  titel: string;
  beschreibung?: string | null;
  menge?: number | null;
  einheit?: string | null;
  netto: number;
  mwstSatz: number;
};

export type PartnerDocAbsender = {
  firma: string;
  inhaber?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
  adresse?: string | null;
  telefon?: string | null;
  email?: string | null;
  steuernummer?: string | null;
  ustid?: string | null;
  handelsregister?: string | null;
  iban?: string | null;
  bic?: string | null;
  bank?: string | null;
  kleinunternehmer?: boolean;
};

export function sumPartnerDocNetto(positionen: PartnerDocPosition[]): number {
  return positionen.reduce((s, p) => s + (Number.isFinite(p.netto) ? p.netto : 0), 0);
}

export function formatPartnerRechnungsNr(year: number, seq: number): string {
  return `${year}-${String(seq).padStart(4, "0")}`;
}

export function formatPartnerAngebotsNr(prefix: string, isoDate: string): string {
  const d = isoDate.slice(0, 10).replace(/-/g, "");
  const short = prefix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() || "HW";
  return `A-${short}-${d}`;
}
