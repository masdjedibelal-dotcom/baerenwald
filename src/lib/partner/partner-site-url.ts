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
  return `${SITE_CONFIG.url}/partner?section=anfragen&id=${encodeURIComponent(id)}`;
}

export function partnerLoginForAnfrageUrl(anfrageId: string): string {
  const next = partnerAnfragePortalUrl(anfrageId);
  return `${partnerLoginUrl()}?next=${encodeURIComponent(next)}`;
}

/** Direktlink: Angebote-Tab (nach Annahme Preis + PDF einreichen). */
export function partnerAngebotPortalUrl(anfrageId: string): string {
  const id = anfrageId.trim();
  return `${SITE_CONFIG.url}/partner?section=angebote&id=${encodeURIComponent(id)}`;
}

export function partnerLoginForAngebotUrl(anfrageId: string): string {
  const next = partnerAngebotPortalUrl(anfrageId);
  return `${partnerLoginUrl()}?next=${encodeURIComponent(next)}`;
}

/** Login → Auftrags-Anfrage (Zuweisung, HW soll annehmen/ablehnen). */
export function partnerLoginForAuftragAnfrageUrl(auftragId: string): string {
  const next = partnerAuftragAnfragePortalUrl(auftragId);
  return `${partnerLoginUrl()}?next=${encodeURIComponent(next)}`;
}

/** Login → laufender Auftrag (Tab Aufträge). */
export function partnerLoginForAuftragUrl(auftragId: string): string {
  const next = partnerAuftragPortalUrl(auftragId);
  return `${partnerLoginUrl()}?next=${encodeURIComponent(next)}`;
}

/** Login → Partner-Übersicht (Startscreen). */
export function partnerLoginForDashboardUrl(): string {
  const next = partnerDashboardUrl();
  return `${partnerLoginUrl()}?next=${encodeURIComponent(next)}`;
}
