import { SITE_CONFIG } from "@/lib/config";

export function portalRegisterUrl(nextPath?: string): string {
  const next = nextPath?.startsWith("http")
    ? nextPath
    : `${SITE_CONFIG.url}${nextPath ?? "/portal"}`;
  return `${SITE_CONFIG.url}/portal/registrieren?next=${encodeURIComponent(next)}`;
}

/** Nach Registrierung zurück zum GPT (Rechner KI-Modus). */
export function portalRegisterForGptUrl(): string {
  return portalRegisterUrl("/portal-tools/rechner?modus=ki");
}
