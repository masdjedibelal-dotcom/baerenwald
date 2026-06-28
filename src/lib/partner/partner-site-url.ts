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
 * Auftrags-Zuweisung (CRM: Auftrag noch „offen“) — Bestätigung unter Tab Offen.
 * Listen-ID im Portal: `auftrag:{auftragId}`.
 */
export function partnerAuftragAnfragePortalUrl(auftragId: string): string {
  const id = auftragId.trim();
  return `${SITE_CONFIG.url}/partner?section=offen&id=${encodeURIComponent(`auftrag:${id}`)}`;
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

/** Listen-Ansicht ohne Detail-Deep-Link. */
export function partnerSectionListPath(
  section: "offen" | "auftraege" | "anfragen" | "angebote"
): string {
  if (section === "anfragen" || section === "angebote") {
    return `/partner?section=offen`;
  }
  return `/partner?section=${section}`;
}

/** Relativer Pfad — Tab Offen, eine HW-Anfrage (ersetzt Anfragen/Angebote-Deep-Links). */
export function partnerOffenPortalPath(anfrageId: string): string {
  const id = anfrageId.trim();
  return `/partner?section=offen&id=${encodeURIComponent(id)}`;
}

/** @deprecated Nutzt Tab Offen — Alias für Mail-Links und Legacy-CRM. */
export function partnerAnfragePortalPath(anfrageId: string): string {
  return partnerOffenPortalPath(anfrageId);
}

/** E-Mail-Deep-Link — direkt ins Portal (Middleware → Login mit next inkl. Query). */
export function partnerLoginForAnfrageUrl(anfrageId: string): string {
  return partnerAnfragePortalUrl(anfrageId);
}

/** @deprecated Nutzt Tab Offen — Alias für Mail-Links und Legacy-CRM. */
export function partnerAngebotPortalPath(anfrageId: string): string {
  return partnerOffenPortalPath(anfrageId);
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
