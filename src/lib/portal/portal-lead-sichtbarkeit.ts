import { isAngebotPortalSichtbar } from "@/lib/portal/portal-angebot-sichtbarkeit";

/** `funnel_daten.quelle` — z. B. `crm_direkt_angebot`. */
export function leadFunnelQuelle(funnel_daten: unknown): string {
  if (!funnel_daten || typeof funnel_daten !== "object" || Array.isArray(funnel_daten)) {
    return "";
  }
  return String((funnel_daten as { quelle?: unknown }).quelle ?? "").trim();
}

/** CRM-Flow „Angebot direkt für Kunde“ (Lead-Träger für Wizard). */
export function isCrmDirektAngebotLead(lead: { funnel_daten?: unknown }): boolean {
  return leadFunnelQuelle(lead.funnel_daten) === "crm_direkt_angebot";
}

/**
 * Schadenakte / Versicherungsakte-Tab nur bei Melde-/Anfrage-Vorgängen.
 * CRM-Direkt-Angebot (und Direkt-Rechnung ohne Lead) haben keinen Hergang.
 */
export function isVersicherungsakteEligibleLead(lead: {
  funnel_daten?: unknown;
}): boolean {
  return !isCrmDirektAngebotLead(lead);
}

export type PortalLeadListbarAngebot = {
  lead_id?: string | null;
  status?: string | null;
  status_einfach?: string | null;
  gesendet_am?: string | null;
  gesendet_kunde_at?: string | null;
  pdf_url?: string | null;
  angebotsnr?: string | null;
};

export type PortalLeadListbarAuftrag = {
  lead_id?: string | null;
  status?: string | null;
};

function isActivePortalAuftrag(a: PortalLeadListbarAuftrag): boolean {
  const st = String(a.status ?? "")
    .toLowerCase()
    .trim();
  return Boolean(st) && st !== "storniert" && st !== "abgelehnt";
}

/**
 * Lead im Portal listen (HV/Mieter/Eigentümer).
 * Echte Meldungen: immer sichtbar.
 * `crm_direkt_angebot`: nur mit versendetem Angebot oder aktivem Auftrag —
 * Entwürfe und abgebrochene Stubs wie im CRM unsichtbar.
 * Lead-Status „angebot“ ohne sichtbares Angebot/Auftrag: Waisen-Stub (z. B.
 * abgebrochener Direktangebot-Versuch) — nicht listen.
 */
export function isLeadPortalListbar(
  lead: {
    id?: string | null;
    status?: string | null;
    funnel_daten?: unknown;
    geloescht_am?: string | null;
  },
  ctx: {
    angebote?: PortalLeadListbarAngebot[];
    auftraege?: PortalLeadListbarAuftrag[];
  }
): boolean {
  if (lead.geloescht_am) return false;

  const leadId = String(lead.id ?? "").trim();
  if (!leadId) return false;

  let hasVisibleAngebot = false;
  for (const a of ctx.angebote ?? []) {
    if (String(a.lead_id ?? "").trim() !== leadId) continue;
    if (isAngebotPortalSichtbar(a)) {
      hasVisibleAngebot = true;
      break;
    }
  }

  let hasActiveAuftrag = false;
  for (const a of ctx.auftraege ?? []) {
    if (String(a.lead_id ?? "").trim() !== leadId) continue;
    if (isActivePortalAuftrag(a)) {
      hasActiveAuftrag = true;
      break;
    }
  }

  if (isCrmDirektAngebotLead(lead)) {
    return hasVisibleAngebot || hasActiveAuftrag;
  }

  const st = String(lead.status ?? "")
    .toLowerCase()
    .trim();
  if (
    (st === "angebot" || st === "angeboten") &&
    !hasVisibleAngebot &&
    !hasActiveAuftrag
  ) {
    return false;
  }

  return true;
}

export function filterPortalListableLeads<
  T extends {
    id?: string | null;
    funnel_daten?: unknown;
    geloescht_am?: string | null;
  },
>(
  leads: T[],
  ctx: {
    angebote?: PortalLeadListbarAngebot[];
    auftraege?: PortalLeadListbarAuftrag[];
  }
): T[] {
  return leads.filter((lead) => isLeadPortalListbar(lead, ctx));
}
