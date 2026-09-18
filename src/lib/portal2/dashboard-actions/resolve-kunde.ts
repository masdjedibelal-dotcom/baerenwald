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

/** Privat / Gewerbe / Mieter (PortalClient) — Angebot annehmen, Auftragsänderungen. */
export function resolveKundeDashboardActions(
  items: KundePortalDetailItem[]
): PortalDashboardActionSlide[] {
  const slides: PortalDashboardActionSlide[] = [];

  for (const item of items) {
    if (!item.needsAction) continue;

    if (item.isAngebotDetail) {
      slides.push({
        openId: item.id,
        leadId: item.leadId ?? item.id,
        kicker: item.actionHint?.trim() || "Angebot liegt vor",
        kickerTone: "sand",
        title: item.title,
        subtitle: item.cardSubtitle?.trim() || undefined,
        sortTs: itemSortTs(item),
        kind: "kunde_angebot",
        buttons: [
          {
            id: "ablehnen",
            label: "Ablehnen",
            variant: "secondary",
            mode: "inline",
          },
          {
            id: "annehmen",
            label: "Angebot annehmen",
            variant: "primary",
            mode: "inline",
          },
        ],
        payload: { angebotId: item.id },
      });
      continue;
    }

    if (item.isAuftragDetail) {
      slides.push({
        openId: item.id,
        leadId: item.leadId ?? item.id,
        kicker: "Leistungsänderung",
        kickerTone: "sand",
        title: item.title,
        subtitle: item.cardSubtitle?.trim() || undefined,
        sortTs: itemSortTs(item),
        kind: "kunde_auftrag_aenderung",
        buttons: [
          {
            id: "annehmen",
            label: "Änderungen annehmen",
            variant: "primary",
            mode: "inline",
          },
        ],
        payload: { auftragId: item.id },
      });
    }
  }

  return sortDashboardActionSlides(slides);
}
