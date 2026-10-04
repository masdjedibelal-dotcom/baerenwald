import { SITE_CONFIG } from "@/lib/config";

/** Nach Passwort-Reset-Link → direkt auf Passwort-Seite (Session im Browser) */
export function portalPasswordResetCallbackUrl(): string {
  return `${SITE_CONFIG.url}/portal/passwort-neu`;
}
