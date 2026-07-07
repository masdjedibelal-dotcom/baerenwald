import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";

export type KundeVorgangFilter = "aktiv" | "erledigt";

function isErledigt(item: KundePortalDetailItem): boolean {
  return item.vorgangPhase === "abgeschlossen" || item.vorgangPhase === "abgelehnt";
}

export function filterKundeVorgaenge(
  items: KundePortalDetailItem[],
  filter: KundeVorgangFilter
): KundePortalDetailItem[] {
  if (filter === "erledigt") return items.filter(isErledigt);
  return items.filter((item) => !isErledigt(item));
}

export function countKundeVorgaengeFilter(
  items: KundePortalDetailItem[]
): Record<KundeVorgangFilter, number> {
  const erledigt = items.filter(isErledigt).length;
  return {
    aktiv: items.length - erledigt,
    erledigt,
  };
}

export function countKundeVorgaengeNeedsAction(items: KundePortalDetailItem[]): number {
  return items.filter((item) => item.needsAction).length;
}
