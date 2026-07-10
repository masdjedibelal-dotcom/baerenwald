import type { OrganisationLead } from "@/lib/org/types";
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

export function countOrgFreigabe(
  eingang: OrganisationLead[],
  leads: OrganisationLead[]
): number {
  const neueMeldungen = eingang.filter(
    (l) => (l.hv_meldung_status ?? "neu") === "neu"
  ).length;
  const angebotFreigabe = [...eingang, ...leads].filter(
    (l) => l.org_freigabe_status === "ausstehend"
  ).length;
  return neueMeldungen + angebotFreigabe;
}

export function buildOrgVorgangFilterCounts(
  eingang: OrganisationLead[],
  leads: OrganisationLead[],
  vorgaengeItems: ReturnType<typeof buildKundeVorgaenge>
): Record<OrgVorgangFilter, number> {
  const vorgangCounts = countKundeVorgaengeFilter(vorgaengeItems);
  return {
    freigabe: countOrgFreigabe(eingang, leads),
    aktiv: vorgangCounts.aktiv,
    erledigt: vorgangCounts.erledigt,
  };
}

export function orgSectionFromParam(raw: string | null): OrgVorgangFilter | null {
  if (raw === "freigabe" || raw === "meldungen" || raw === "eingang") return "freigabe";
  if (raw === "aktiv" || raw === "auftraege" || raw === "vorgaenge") return "aktiv";
  if (raw === "erledigt") return "erledigt";
  return null;
}
