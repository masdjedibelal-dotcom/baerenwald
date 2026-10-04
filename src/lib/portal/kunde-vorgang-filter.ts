import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";

export type KundeVorgangFilter = "alle" | "aktiv" | "erledigt";

function isErledigt(item: KundePortalDetailItem): boolean {
  return item.vorgangPhase === "abgeschlossen" || item.vorgangPhase === "abgelehnt";
}

export function filterKundeVorgaenge(
  items: KundePortalDetailItem[],
  filter: KundeVorgangFilter
): KundePortalDetailItem[] {
  if (filter === "alle") return items;
  if (filter === "erledigt") return items.filter(isErledigt);
  return items.filter((item) => !isErledigt(item));
}

export function countKundeVorgaengeNeedsAction(items: KundePortalDetailItem[]): number {
  return items.filter((item) => item.needsAction).length;
}
