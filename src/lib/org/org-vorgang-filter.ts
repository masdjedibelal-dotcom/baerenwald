import type { OrganisationLead } from "@/lib/org/types";
import {
  countLeadsByPortalFlow,
  type HvDashboardAngebotSlice,
  type HvDashboardAuftragSlice,
  type HvDashboardLeadSlice,
  type HvFlowCountMap,
} from "@/lib/portal2/hv-dashboard";
import type { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";

/** Alle · Offen · In Arbeit · Erledigt (Flow-Chips). */
export type OrgVorgangFilter = "alle" | "offen" | "in_arbeit" | "erledigt";

export { buildAuftragByLeadId, isInOrgFreigabeQueue } from "@/lib/org/org-freigabe-queue";

export function buildOrgVorgangFilterCountsFromFlow(
  flow: HvFlowCountMap,
  alle: number
): Record<OrgVorgangFilter, number> {
  return {
    alle,
    /** Neu / Angebotsfreigabe — wartet auf HV. */
    offen: flow.gemeldet + flow.angebot,
    /** Freigegeben / HW angefragt / aktiver Auftrag. */
    in_arbeit: flow.freigegeben + flow.angefragt + flow.auftrag,
    erledigt:
      flow.abschluss + flow.rechnung + flow.bezahlt + flow.abgelehnt,
  };
}

export function buildOrgVorgangFilterCounts(
  eingang: OrganisationLead[],
  leads: OrganisationLead[],
  vorgaengeItems: ReturnType<typeof buildKundeVorgaenge>,
  _auftragByLeadId: Record<string, string> = {},
  opts?: {
    angebote?: HvDashboardAngebotSlice[];
    auftraege?: HvDashboardAuftragSlice[];
  }
): Record<OrgVorgangFilter, number> {
  const byId = new Map<string, OrganisationLead>();
  for (const l of [...leads, ...eingang]) {
    if (l?.id) byId.set(l.id, l);
  }
  const flow = countLeadsByPortalFlow({
    leads: Array.from(byId.values()) as HvDashboardLeadSlice[],
    angebote: opts?.angebote,
    auftraege: opts?.auftraege,
  });
  return buildOrgVorgangFilterCountsFromFlow(flow, vorgaengeItems.length);
}
