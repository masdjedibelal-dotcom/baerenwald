import { resolveLeadObjektId } from "@/lib/org/match-lead-objekt";
import type { OrganisationLead, OrganisationObjekt } from "@/lib/org/types";

/**
 * HV Vorgänge: Leads nach ausgewählten Objekten filtern.
 * `selectedIds` leer = alle Objekte.
 */
export function filterOrgLeadsByObjektIds(
  leads: OrganisationLead[],
  objekte: OrganisationObjekt[],
  selectedIds: string[]
): OrganisationLead[] {
  if (objekte.length <= 1) return leads;
  const cleaned = selectedIds.map((id) => id.trim()).filter(Boolean);
  if (cleaned.length === 0 || cleaned.length >= objekte.length) {
    return leads;
  }
  const set = new Set(cleaned);
  return leads.filter((lead) => {
    const oid = resolveLeadObjektId(lead, objekte);
    return oid != null && set.has(oid);
  });
}
