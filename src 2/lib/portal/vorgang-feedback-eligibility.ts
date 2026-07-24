export {
  allePositionenPortalErledigt,
  filterAktivePortalPositionen,
  isVorgangPortalErledigt,
  positionPortalErledigt,
  type PortalAuftragKontext,
  type PortalPositionErledigtInput,
  portalErledigtFromLeadAndAuftrag,
} from "@/lib/portal/vorgang-erledigt";

import { isVorgangPortalErledigt } from "@/lib/portal/vorgang-erledigt";

/** Feedback / Mängelmeldung im Portal möglich. */
export function vorgangFeedbackBereit(input: {
  leadVorgangPhase?: string | null;
  hv_meldung_status?: string | null;
  auftragStatus?: string | null;
  auftragFortschritt?: number | null;
  positionen?: Array<{
    handwerker_id?: string | null;
    handwerker_status?: string | null;
    leistung_status?: string | null;
  }> | null;
}): boolean {
  return isVorgangPortalErledigt(input);
}
