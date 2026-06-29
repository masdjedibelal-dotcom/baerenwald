import { SITE_CONFIG } from "@/lib/config";

export function portalLoginUrl(): string {
  return `${SITE_CONFIG.url}/portal/login`;
}

export function portalRegisterUrl(nextPath?: string): string {
  const next = nextPath?.startsWith("http")
    ? nextPath
    : `${SITE_CONFIG.url}${nextPath ?? "/portal"}`;
  return `${SITE_CONFIG.url}/portal/registrieren?next=${encodeURIComponent(next)}`;
}

/** Nach Registrierung zurück zum GPT (Rechner KI-Modus). */
export function portalRegisterForGptUrl(): string {
  return portalRegisterUrl("/rechner?modus=ki");
}

export function portalAnfrageUrl(leadId: string): string {
  const id = leadId.trim();
  return `${SITE_CONFIG.url}/portal?section=vorgaenge&id=${encodeURIComponent(id)}`;
}

export function portalAngebotUrl(angebotId: string): string {
  const id = angebotId.trim();
  return `${SITE_CONFIG.url}/portal?section=vorgaenge&id=${encodeURIComponent(id)}`;
}

export function portalAuftragUrl(auftragId: string): string {
  const id = auftragId.trim();
  return `${SITE_CONFIG.url}/portal?section=vorgaenge&id=${encodeURIComponent(id)}`;
}

/** @deprecated Alias — ein Tab „Vorgänge“. */
export function portalVorgangUrl(vorgangId: string): string {
  const id = vorgangId.trim();
  return `${SITE_CONFIG.url}/portal?section=vorgaenge&id=${encodeURIComponent(id)}`;
}

export function portalLoginForAnfrageUrl(leadId: string): string {
  return `${portalLoginUrl()}?next=${encodeURIComponent(portalAnfrageUrl(leadId))}`;
}

export function portalLoginForAngebotUrl(angebotId: string): string {
  return `${portalLoginUrl()}?next=${encodeURIComponent(portalAngebotUrl(angebotId))}`;
}

export function portalLoginForAuftragUrl(auftragId: string): string {
  return `${portalLoginUrl()}?next=${encodeURIComponent(portalAuftragUrl(auftragId))}`;
}
