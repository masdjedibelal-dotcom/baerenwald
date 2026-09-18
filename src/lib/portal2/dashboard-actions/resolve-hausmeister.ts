import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";
import type { PortalDashboardActionSlide } from "@/lib/portal2/dashboard-actions/types";
import { sortDashboardActionSlides } from "@/lib/portal2/dashboard-actions/sort";

function itemSortTs(item: KundePortalDetailItem): number {
  if (item.date) {
    const t = new Date(item.date).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

/** Hausmeister — Prüfauftrag (Detail-Aktionen über Deep-Link). */
export function resolveHausmeisterDashboardActions(
  items: KundePortalDetailItem[]
): PortalDashboardActionSlide[] {
  const slides: PortalDashboardActionSlide[] = [];

  for (const item of items) {
    const st = (item.hvMeldungStatus ?? "").trim().toLowerCase();
    if (st !== "hm_pruefung") continue;

    slides.push({
      openId: item.leadId ?? item.id,
      leadId: item.leadId ?? item.id,
      kicker: "Prüfauftrag offen",
      kickerTone: "green",
      title: item.title,
      subtitle: item.cardSubtitle?.trim() || undefined,
      sortTs: itemSortTs(item),
      kind: "hm_pruefung",
      buttons: [
        {
          id: "ablehnen",
          label: "Ablehnen",
          variant: "secondary",
          mode: "open",
        },
        {
          id: "befund",
          label: "Prüfung abschließen",
          variant: "primary",
          mode: "open",
        },
      ],
      payload: { leadId: item.leadId ?? item.id },
    });
  }

  return sortDashboardActionSlides(slides);
}
