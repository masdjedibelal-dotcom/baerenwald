import type { PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import { isAuftragAbgeschlossen } from "@/lib/partner/handwerker-bewertung-display";

export type PartnerAuftragListFilterId = "aktiv" | "erledigt";

export const PARTNER_AUFTRAG_LIST_FILTER_LABELS: Record<
  PartnerAuftragListFilterId,
  string
> = {
  aktiv: "Ausführung",
  erledigt: "Erledigt",
};

export function isPartnerAuftragListItemAktiv(item: PartnerAuftragItem): boolean {
  const s = item.status.toLowerCase();
  if (s === "storniert") return false;
  if (isAuftragAbgeschlossen(item.status)) return false;
  if (item.fortschritt != null && item.fortschritt >= 100) return false;
  return true;
}

/** @deprecated Alias */
export const isPartnerAuftragListItemOffen = isPartnerAuftragListItemAktiv;

export function countPartnerAuftraegeFilter(
  auftraege: PartnerAuftragItem[]
): Record<PartnerAuftragListFilterId, number> {
  const aktiv = auftraege.filter(isPartnerAuftragListItemAktiv).length;
  return { aktiv, erledigt: auftraege.length - aktiv };
}
