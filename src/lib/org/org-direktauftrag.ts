/**
 * HV-Portal: Sofortmaßnahme / Direktauftrag — Info statt Freigabe-CTAs.
 */

import { leadIstMeldeDirektauftrag } from "@/lib/funnel/melde-direktauftrag";
import { hvFreigabeEntfaellt } from "@/lib/org/freigabe-bypass";
import type { OrganisationKunde, OrganisationLead, OrganisationObjekt } from "@/lib/org/types";

export function effektiveNotfallDirekt(
  kunde: Pick<OrganisationKunde, "notfall_direkt">,
  objekt?: Pick<OrganisationObjekt, "notfall_direkt"> | null
): boolean {
  if (objekt?.notfall_direkt != null) return Boolean(objekt.notfall_direkt);
  return kunde.notfall_direkt !== false;
}

/**
 * Keine Freigeben-/Ablehnen-Buttons (Liste & Detail).
 * Bypass-Grund aus CRM hat Vorrang — auch wenn Org-Toggle aus ist.
 */
export function isHvDirektauftragInfoOnly(
  lead: Pick<
    OrganisationLead,
    | "funnel_daten"
    | "freigabe_bypass_grund"
    | "kunde_objekt_id"
    | "org_freigabe_status"
  >,
  kunde: Pick<OrganisationKunde, "notfall_direkt">,
  objekte?: Array<Pick<OrganisationObjekt, "id" | "notfall_direkt">>
): boolean {
  const funnelDa =
    lead.funnel_daten &&
    typeof lead.funnel_daten === "object" &&
    !Array.isArray(lead.funnel_daten)
      ? (lead.funnel_daten as { direktauftrag?: unknown }).direktauftrag === true
      : false;

  if (
    hvFreigabeEntfaellt({
      orgFreigabeStatus: lead.org_freigabe_status,
      bypassGrund: lead.freigabe_bypass_grund,
      funnelDirektauftrag: funnelDa,
    })
  ) {
    return true;
  }

  if (!leadIstMeldeDirektauftrag(lead)) return false;
  const objekt = lead.kunde_objekt_id
    ? objekte?.find((o) => o.id === lead.kunde_objekt_id)
    : null;
  return effektiveNotfallDirekt(kunde, objekt);
}
