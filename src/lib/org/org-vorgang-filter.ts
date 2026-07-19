import type { OrganisationLead } from "@/lib/org/types";
import {
  countOrgFreigabeLeads,
  filterOrgFreigabeLeads,
} from "@/lib/org/org-freigabe-queue";
import {
  countKundeVorgaengeFilter,
  type KundeVorgangFilter,
} from "@/lib/portal/kunde-vorgang-filter";
import type { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";

export type OrgVorgangFilter = "freigabe" | KundeVorgangFilter;

export const ORG_VORGANG_FILTER_LABELS: Record<OrgVorgangFilter, string> = {
  freigabe: "Zur Freigabe",
  aktiv: "Aktiv",
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

export function buildOrgVorgangFilterCounts(
  eingang: OrganisationLead[],
  leads: OrganisationLead[],
  vorgaengeItems: ReturnType<typeof buildKundeVorgaenge>,
  auftragByLeadId: Record<string, string> = {}
): Record<OrgVorgangFilter, number> {
  const vorgangCounts = countKundeVorgaengeFilter(vorgaengeItems);
  return {
    freigabe: countOrgFreigabe(eingang, leads, auftragByLeadId),
    aktiv: vorgangCounts.aktiv,
    erledigt: vorgangCounts.erledigt,
  };
}

export function filterOrgFreigabeEingang(
  eingang: OrganisationLead[],
  auftragByLeadId: Record<string, string>
): OrganisationLead[] {
  return filterOrgFreigabeLeads(eingang, auftragByLeadId);
}

export function orgSectionFromParam(raw: string | null): OrgVorgangFilter | null {
  if (raw === "freigabe" || raw === "meldungen" || raw === "eingang") return "freigabe";
  if (raw === "aktiv" || raw === "auftraege" || raw === "vorgaenge") return "aktiv";
  if (raw === "erledigt") return "erledigt";
  return null;
}
