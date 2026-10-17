/** Primary Team-Login (CRM + Partner + optional Hausmeister). */

import { istTeo, MARKE } from "@/lib/marke";
export const BAERENWALD_PRIMARY_STAFF_EMAIL = MARKE.infoEmail;

/** Häufige Tippfehler / Alt-Adressen → kanonisch baerenwald-muenchen.de */
export const BAERENWALD_PRIMARY_STAFF_EMAIL_ALIASES = [
  BAERENWALD_PRIMARY_STAFF_EMAIL,
  ...(istTeo ? [] : ["info@baerenwaldmuenchen.de", "info@baerenwald.de"]),
];

export function isBaerenwaldPrimaryStaffEmail(
  email: string | null | undefined
): boolean {
  const e = email?.trim().toLowerCase() ?? "";
  if (!e) return false;
  return (BAERENWALD_PRIMARY_STAFF_EMAIL_ALIASES as readonly string[]).includes(
    e
  );
}

/** Alias → kanonische Staff-Mail, sonst null. */
export function canonicalBaerenwaldPrimaryStaffEmail(
  email: string | null | undefined
): string | null {
  if (!isBaerenwaldPrimaryStaffEmail(email)) return null;
  return BAERENWALD_PRIMARY_STAFF_EMAIL;
}
