import { SITE_CONFIG } from "@/lib/config";

const portalCallbackBase = () => `${SITE_CONFIG.url}/portal/auth/callback`;

/** Nach Sign-up / E-Mail-Bestätigung → Standard: Dashboard */
export function portalAuthCallbackUrl(nextPath = "/portal"): string {
  const base = portalCallbackBase();
  if (nextPath === "/portal") return base;
  return `${base}?next=${encodeURIComponent(nextPath)}`;
}

/** Nach Passwort-Reset-Link → direkt auf Passwort-Seite (Session im Browser) */
export function portalPasswordResetCallbackUrl(): string {
  return `${SITE_CONFIG.url}/portal/passwort-neu`;
}
