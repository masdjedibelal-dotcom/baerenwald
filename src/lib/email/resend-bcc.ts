import { SITE_CONFIG } from "@/lib/config";
import { MARKE } from "@/lib/marke";

/** BCC bei allen automatischen Kunden-Bestätigungsmails (z. B. Anfrage eingegangen). */
export const AUTOMATED_CUSTOMER_EMAIL_BCC = SITE_CONFIG.email;

/** Servus TEO: Kopie jeder Mail an die Inhaber (wie CRM `MARKE_MAIL_BCC_IMMER`). */
const MARKE_MAIL_BCC_IMMER: readonly string[] =
  MARKE.id === "teo" ? ["info@baerenwald-muenchen.de", "belal.masdjedi@yahoo.de"] : [];

/** BCC für Mails an die Verwaltung — wie im CRM: internes Postfach (+ TEO-Inhaber), ohne den Empfänger selbst. */
export function hvMailBcc(empfaenger: string): string[] {
  const an = empfaenger.trim().toLowerCase();
  return [MARKE.infoEmail, ...MARKE_MAIL_BCC_IMMER].filter(
    (x, i, arr) => x && x.toLowerCase() !== an && arr.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i
  );
}
