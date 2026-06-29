import type { PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import {
  partnerAuftragListenStatusLabel,
  partnerAuftragListenStatusPillKey,
} from "@/lib/partner/partner-auftrag-list-status";
import {
  vorgangStateLabel,
  vorgangStatePillKey,
  type VorgangState,
} from "@/lib/partner/vorgang-state";

export function resolvePartnerVorgangListenStatus(
  vorgangState: VorgangState | undefined,
  item: Pick<PartnerAuftragItem, "status" | "bautagebuchAnfrageOffen">
): { label: string; pillKey: string } {
  if (
    item.bautagebuchAnfrageOffen &&
    (!vorgangState || vorgangState === "in_bearbeitung")
  ) {
    return { label: "Tagebuch offen", pillKey: "bautagebuch" };
  }
  if (vorgangState) {
    return {
      label: vorgangStateLabel(vorgangState),
      pillKey: vorgangStatePillKey(vorgangState),
    };
  }
  return {
    label: partnerAuftragListenStatusLabel(item.status),
    pillKey: partnerAuftragListenStatusPillKey(item.status),
  };
}
