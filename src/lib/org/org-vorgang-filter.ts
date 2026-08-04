import type { OrganisationLead } from "@/lib/org/types";
import {
  countOrgFreigabeLeads,
  filterOrgFreigabeLeads,
} from "@/lib/org/org-freigabe-queue";
import {
  countLeadsByPortalFlow,
  type HvDashboardAngebotSlice,
  type HvDashboardAuftragSlice,
  type HvDashboardLeadSlice,
  type HvFlowCountMap,
} from "@/lib/portal2/hv-dashboard";
import type { KundeVorgangFilter } from "@/lib/portal/kunde-vorgang-filter";
import type { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";

/** Alle · Offen · In Arbeit · Erledigt (Flow-Chips). */
export type OrgVorgangFilter = "alle" | "offen" | "in_arbeit" | "erledigt";

export const ORG_VORGANG_FILTER_LABELS: Record<OrgVorgangFilter, string> = {
  alle: "Alle",
  offen: "Offen",
  in_arbeit: "In Arbeit",
  erledigt: "Erledigt",
};

export { buildAuftragByLeadId, isInOrgFreigabeQueue } from "@/lib/org/org-freigabe-queue";

export function countOrgFreigabe(
  eingang: OrganisationLead[],
  leads: OrganisationLead[],
  auftragByLeadId: Record<string, string> = {}
): number {
  return countOrgFreigabeLeads(eingang, leads, auftragByLeadId);
}

export function buildOrgVorgangFilterCountsFromFlow(
  flow: HvFlowCountMap,
  alle: number
): Record<OrgVorgangFilter, number> {
  return {
    alle,
    /** Neu / wartet auf Freigabe. */
    offen: flow.gemeldet,
    /** Ab Handwerker-Anfrage bis aktiver Auftrag. */
    in_arbeit:
      flow.freigegeben + flow.angefragt + flow.angebot + flow.auftrag,
    erledigt: flow.abschluss + flow.rechnung + flow.bezahlt,
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

export function filterOrgFreigabeEingang(
  eingang: OrganisationLead[],
  auftragByLeadId: Record<string, string>
): OrganisationLead[] {
  return filterOrgFreigabeLeads(eingang, auftragByLeadId);
}

/** URL/Filter-Param → Chip (Legacy: freigabe/aktiv/meldungen → offen). */
export function orgSectionFromParam(raw: string | null): OrgVorgangFilter | null {
  if (raw === "alle") return "alle";
  if (
    raw === "offen" ||
    raw === "freigabe" ||
    raw === "aktiv" ||
    raw === "meldungen" ||
    raw === "eingang" ||
    raw === "auftraege" ||
    raw === "vorgaenge"
  ) {
    return "offen";
  }
  if (raw === "in_arbeit" || raw === "arbeit") return "in_arbeit";
  if (raw === "erledigt") return "erledigt";
  return null;
}

/**
 * Legacy-Bridge für PortalClient `KundeVorgangFilter`.
 * „In Arbeit“ hat kein 1:1-Mapping — HV filtert per Flow (`hvListeChipMatches`).
 */
export function orgFilterToKundeFilter(
  filter: OrgVorgangFilter
): KundeVorgangFilter {
  if (filter === "erledigt") return "erledigt";
  if (filter === "offen" || filter === "in_arbeit") return "aktiv";
  return "alle";
}
