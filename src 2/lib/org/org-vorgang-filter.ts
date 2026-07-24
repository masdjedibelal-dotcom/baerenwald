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

/** Alle = komplette Liste; Offen = nicht erledigt; Erledigt = abgeschlossen. */
export type OrgVorgangFilter = "alle" | "offen" | "erledigt";

export const ORG_VORGANG_FILTER_LABELS: Record<OrgVorgangFilter, string> = {
  alle: "Alle",
  offen: "Offen",
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
  _auftragByLeadId: Record<string, string> = {}
): Record<OrgVorgangFilter, number> {
  const vorgangCounts = countKundeVorgaengeFilter(vorgaengeItems);
  return {
    alle: vorgangCounts.alle,
    offen: vorgangCounts.aktiv,
    erledigt: vorgangCounts.erledigt,
  };
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
  if (raw === "erledigt") return "erledigt";
  return null;
}

/** Für PortalClient-Liste. */
export function orgFilterToKundeFilter(
  filter: OrgVorgangFilter
): KundeVorgangFilter {
  if (filter === "erledigt") return "erledigt";
  if (filter === "offen") return "aktiv";
  return "alle";
}
