import { SITE_CONFIG } from "@/lib/config";

export function partnerLoginUrl(): string {
  return `${SITE_CONFIG.url}/partner/login`;
}

export function partnerDashboardUrl(): string {
  return `${SITE_CONFIG.url}/partner`;
}

export function partnerRegisterUrl(): string {
  return `${SITE_CONFIG.url}/partner/registrieren`;
}

/**
 * Auftrags-Zuweisung (CRM: Auftrag noch „offen“) — Annehmen/Ablehnen unter Anfragen.
 * Listen-ID im Portal: `auftrag:{auftragId}`.
 */
export function partnerAuftragAnfragePortalUrl(auftragId: string): string {
  const id = auftragId.trim();
  return `${SITE_CONFIG.url}/partner?section=anfragen&id=${encodeURIComponent(`auftrag:${id}`)}`;
}

/** Laufender Auftrag — Tab Aufträge. */
export function partnerAuftragPortalUrl(auftragId: string): string {
  const id = auftragId.trim();
  return `${SITE_CONFIG.url}/partner?section=auftraege&auftrag=${encodeURIComponent(id)}`;
}

/** Direktlink: Anfragen-Tab, eine HW-Anfrage. */
export function partnerAnfragePortalUrl(anfrageId: string): string {
  const id = anfrageId.trim();
  return `${SITE_CONFIG.url}${partnerAnfragePortalPath(id)}`;
}

/** Relativer Pfad — Client-Navigation im Partner-Portal (gleiche Origin). */
export function partnerAnfragePortalPath(anfrageId: string): string {
  const id = anfrageId.trim();
  return `/partner?section=anfragen&id=${encodeURIComponent(id)}`;
}

/** E-Mail-Deep-Link — direkt ins Portal (Middleware → Login mit next inkl. Query). */
export function partnerLoginForAnfrageUrl(anfrageId: string): string {
  return partnerAnfragePortalUrl(anfrageId);
}

/** Relativer Pfad — Client-Navigation im Partner-Portal (gleiche Origin). */
export function partnerAngebotPortalPath(anfrageId: string): string {
  const id = anfrageId.trim();
  return `/partner?section=angebote&id=${encodeURIComponent(id)}`;
}

/** Direktlink: Angebote-Tab (nach CRM-Übernahme, hw_status = uebernommen). */
export function partnerAngebotPortalUrl(anfrageId: string): string {
  return `${SITE_CONFIG.url}${partnerAngebotPortalPath(anfrageId)}`;
}

export function partnerLoginForAngebotUrl(anfrageId: string): string {
  return partnerAngebotPortalUrl(anfrageId);
}

/** Auftrags-Zuweisung — Annehmen/Ablehnen unter Anfragen. */
export function partnerLoginForAuftragAnfrageUrl(auftragId: string): string {
  return partnerAuftragAnfragePortalUrl(auftragId);
}

/** Laufender Auftrag — Tab Aufträge. */
export function partnerLoginForAuftragUrl(auftragId: string): string {
  return partnerAuftragPortalUrl(auftragId);
}

/** Partner-Portal-Startseite. */
export function partnerLoginForDashboardUrl(): string {
  return partnerDashboardUrl();
}
