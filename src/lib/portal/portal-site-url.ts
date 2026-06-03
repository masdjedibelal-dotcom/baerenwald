import { SITE_CONFIG } from "@/lib/config";

export function portalLoginUrl(): string {
  return `${SITE_CONFIG.url}/portal/login`;
}

export function portalAnfrageUrl(leadId: string): string {
  const id = leadId.trim();
  return `${SITE_CONFIG.url}/portal?section=anfragen&id=${encodeURIComponent(id)}`;
}

export function portalAngebotUrl(angebotId: string): string {
  const id = angebotId.trim();
  return `${SITE_CONFIG.url}/portal?section=angebote&id=${encodeURIComponent(id)}`;
}

export function portalAuftragUrl(auftragId: string): string {
  const id = auftragId.trim();
  return `${SITE_CONFIG.url}/portal?section=auftraege&id=${encodeURIComponent(id)}`;
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
