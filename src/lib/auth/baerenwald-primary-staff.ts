/** Primary Team-Login (CRM + Partner + optional Hausmeister). */

export const BAERENWALD_PRIMARY_STAFF_EMAIL = "info@baerenwald-muenchen.de";

export function isBaerenwaldPrimaryStaffEmail(
  email: string | null | undefined
): boolean {
  return email?.trim().toLowerCase() === BAERENWALD_PRIMARY_STAFF_EMAIL;
}
