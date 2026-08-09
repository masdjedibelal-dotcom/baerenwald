/**
 * HV-Portal: Sofortmaßnahme / Direktauftrag — Info statt Freigabe-CTAs.
 */

import { leadIstMeldeDirektauftrag } from "@/lib/funnel/melde-direktauftrag";
import type { OrganisationKunde, OrganisationLead, OrganisationObjekt } from "@/lib/org/types";

export function effektiveNotfallDirekt(
  kunde: Pick<OrganisationKunde, "notfall_direkt">,
  objekt?: Pick<OrganisationObjekt, "notfall_direkt"> | null
): boolean {
  if (objekt?.notfall_direkt != null) return Boolean(objekt.notfall_direkt);
  return kunde.notfall_direkt !== false;
}

/** Sofortmaßnahme und HV hat Direktbeauftragung freigeschaltet → nur Info. */
export function isHvDirektauftragInfoOnly(
  lead: Pick<
    OrganisationLead,
    "funnel_daten" | "freigabe_bypass_grund" | "kunde_objekt_id"
  >,
  kunde: Pick<OrganisationKunde, "notfall_direkt">,
  objekte?: Array<Pick<OrganisationObjekt, "id" | "notfall_direkt">>
): boolean {
  if (!leadIstMeldeDirektauftrag(lead)) return false;
  const objekt = lead.kunde_objekt_id
    ? objekte?.find((o) => o.id === lead.kunde_objekt_id)
    : null;
  return effektiveNotfallDirekt(kunde, objekt);
}
