/** Nur lokal/Preview — niemals in Produktion aktivieren. */
export function isTestAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.TEST_AUTH_BYPASS === "true"
  );
}

export type DevPortalRole = "org" | "partner" | "privat";

export function getDevPortalCredentials(
  role: DevPortalRole
): { email: string; password: string } | null {
  const map: Record<DevPortalRole, [string | undefined, string | undefined]> = {
    org: [process.env.E2E_ORG_EMAIL, process.env.E2E_ORG_PASSWORD],
    partner: [process.env.E2E_PARTNER_EMAIL, process.env.E2E_PARTNER_PASSWORD],
    privat: [process.env.E2E_PRIVAT_EMAIL, process.env.E2E_PRIVAT_PASSWORD],
  };
  const [email, password] = map[role];
  if (!email?.trim() || !password) return null;
  return { email: email.trim(), password };
}
