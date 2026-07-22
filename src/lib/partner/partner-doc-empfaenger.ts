/**
 * Empfänger für Partner-Angebote & -Rechnungen (Bärenwald Plattform).
 * Kann später aus Env/CRM überschrieben werden.
 */

export type PartnerDocEmpfaenger = {
  firma: string;
  strasse: string;
  plzOrt: string;
  email?: string;
};

export function getPartnerDocEmpfaenger(): PartnerDocEmpfaenger {
  return {
    firma:
      process.env.PARTNER_DOC_EMPFAENGER_FIRMA?.trim() ||
      "Bärenwald München GmbH",
    strasse:
      process.env.PARTNER_DOC_EMPFAENGER_STRASSE?.trim() || "Musterstraße 1",
    plzOrt:
      process.env.PARTNER_DOC_EMPFAENGER_PLZ_ORT?.trim() || "80331 München",
    email:
      process.env.PARTNER_DOC_EMPFAENGER_EMAIL?.trim() ||
      process.env.PARTNER_INTERNAL_MAIL_TO?.trim() ||
      undefined,
  };
}
