import { SITE_CONFIG } from "@/lib/config";

export function partnerLoginUrl(): string {
  return `${SITE_CONFIG.url}/partner/login`;
}

export function partnerDashboardUrl(): string {
  return `${SITE_CONFIG.url}/partner`;
}

/**
 * Auftrags-Zuweisung (CRM: Auftrag noch „offen“) — Bestätigung unter Tab Offen.
 * Listen-ID im Portal: `auftrag:{auftragId}`.
 */
export function partnerAuftragAnfragePortalUrl(auftragId: string): string {
  const id = auftragId.trim();
  return `${SITE_CONFIG.url}/partner?section=vorgaenge&id=${encodeURIComponent(id)}`;
}

/** Direktlink: Anfragen-Tab, eine HW-Anfrage. */
export function partnerAnfragePortalUrl(anfrageId: string): string {
  const id = anfrageId.trim();
  return `${SITE_CONFIG.url}${partnerAnfragePortalPath(id)}`;
}

/** Tab Vorgänge — eine HW-Anfrage oder ein Auftrag. */
export function partnerVorgangPortalPath(
  vorgangId: string,
  opts?: {
    focus?: "bautagebuch" | "abnahme" | "ablehnen";
    anfrageId?: string | null;
    protokollId?: string | null;
  }
): string {
  const id = vorgangId.trim();
  const params = new URLSearchParams();
  params.set("section", "vorgaenge");
  params.set("id", id);
  if (
    opts?.focus === "bautagebuch" ||
    opts?.focus === "abnahme" ||
    opts?.focus === "ablehnen"
  ) {
    params.set("focus", opts.focus);
  }
  if (opts?.anfrageId?.trim()) {
    params.set("anfrage", opts.anfrageId.trim());
  }
  if (opts?.protokollId?.trim()) {
    params.set("protokoll", opts.protokollId.trim());
  }
  return `/partner?${params.toString()}`;
}

/**
 * Notification-/Mail-Link → relativer Portal-Pfad (pathname + query).
 * Akzeptiert `/partner?…`, volle URLs und bare IDs (Vorgang/Auftrag/Anfrage).
 */
export function resolvePartnerNotificationLink(
  link: string | null | undefined
): string | null {
  const raw = link?.trim();
  if (!raw) return null;

  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      return `${u.pathname}${u.search}`;
    }
    if (raw.startsWith("/")) return raw;
    if (raw.includes("section=") || raw.startsWith("?")) {
      return raw.startsWith("?") ? `/partner${raw}` : `/partner?${raw}`;
    }
    return partnerVorgangPortalPath(raw.replace(/^auftrag:/, ""));
  } catch {
    return partnerVorgangPortalPath(raw.replace(/^auftrag:/, ""));
  }
}

/** `id` aus Notification-Link — Auftrags- oder Anfrage-ID. */
export function partnerVorgangIdFromNotificationLink(
  link: string | null | undefined
): string | null {
  const path = resolvePartnerNotificationLink(link);
  if (!path) return null;
  const q = path.includes("?") ? path.slice(path.indexOf("?") + 1) : "";
  const id = new URLSearchParams(q).get("id")?.trim();
  return id ? id.replace(/^auftrag:/, "") : null;
}

/** Relativer Pfad — Tab Vorgänge (ersetzt Offen-Deep-Links). */
export function partnerOffenPortalPath(anfrageId: string): string {
  return partnerVorgangPortalPath(anfrageId);
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
