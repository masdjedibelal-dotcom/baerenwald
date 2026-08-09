import { hvFreigabeEntfaellt } from "@/lib/org/freigabe-bypass";
import type { OrganisationLead } from "@/lib/org/types";

type FreigabeLead = Pick<
  OrganisationLead,
  | "id"
  | "org_freigabe_status"
  | "hv_meldung_status"
  | "vorgang_phase"
  | "freigabe_bypass_grund"
  | "funnel_daten"
>;

/** Lead hat bereits einen CRM-Auftrag — gehört unter „Aktiv“, nicht „Zur Freigabe“. */
export function leadHasOrgAuftrag(
  leadId: string,
  auftragByLeadId: Record<string, string>
): boolean {
  return Boolean(auftragByLeadId[leadId]?.trim());
}

function funnelDirektauftragFlag(
  funnel: FreigabeLead["funnel_daten"]
): boolean {
  return Boolean(
    funnel &&
      typeof funnel === "object" &&
      !Array.isArray(funnel) &&
      (funnel as { direktauftrag?: unknown }).direktauftrag === true
  );
}

/** Wartet auf HV-Aktion (neue Meldung oder Angebotsfreigabe), ohne laufenden Auftrag. */
export function isInOrgFreigabeQueue(
  lead: FreigabeLead,
  auftragByLeadId: Record<string, string>
): boolean {
  if (leadHasOrgAuftrag(lead.id, auftragByLeadId)) return false;

  // Akut / unter Schwelle: nur Info, nie in Freigabe-Queue
  if (
    hvFreigabeEntfaellt({
      orgFreigabeStatus: lead.org_freigabe_status,
      bypassGrund: lead.freigabe_bypass_grund,
      funnelDirektauftrag: funnelDirektauftragFlag(lead.funnel_daten),
      hvMeldungStatus: lead.hv_meldung_status,
    })
  ) {
    return false;
  }

  const freigabe = (lead.org_freigabe_status ?? "").trim();
  if (
    freigabe === "freigegeben" ||
    freigabe === "abgelehnt" ||
    freigabe === "nicht_noetig"
  ) {
    return false;
  }

  const phase = (lead.vorgang_phase ?? "").trim();
  if (
    phase === "beauftragt" ||
    phase === "in_bearbeitung" ||
    phase === "abnahme" ||
    phase === "abgeschlossen"
  ) {
    return false;
  }

  if ((lead.hv_meldung_status ?? "neu") === "neu") return true;
  if (freigabe === "ausstehend" || freigabe === "angefordert") return true;

  return false;
}

export function buildAuftragByLeadId(
  auftraege: Array<{ id: string; lead_id?: string | null }>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of auftraege) {
    const leadId = a.lead_id != null ? String(a.lead_id).trim() : "";
    if (leadId) map[leadId] = String(a.id);
  }
  return map;
}

export function filterOrgFreigabeLeads<T extends FreigabeLead>(
  leads: T[],
  auftragByLeadId: Record<string, string>
): T[] {
  return leads.filter((l) => isInOrgFreigabeQueue(l, auftragByLeadId));
}

export function countOrgFreigabeLeads(
  eingang: FreigabeLead[],
  leads: FreigabeLead[],
  auftragByLeadId: Record<string, string>
): number {
  const ids = new Set<string>();
  for (const l of [...eingang, ...leads]) {
    if (isInOrgFreigabeQueue(l, auftragByLeadId)) ids.add(l.id);
  }
  return ids.size;
}
