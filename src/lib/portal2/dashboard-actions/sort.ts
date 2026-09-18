import type { PortalDashboardActionSlide } from "@/lib/portal2/dashboard-actions/types";

export function sortDashboardActionSlides(
  slides: PortalDashboardActionSlide[]
): PortalDashboardActionSlide[] {
  return [...slides].sort((a, b) => b.sortTs - a.sortTs);
}

export function leadSortTs(lead: {
  updated_at?: string | null;
  created_at?: string | null;
}): number {
  for (const raw of [lead.updated_at, lead.created_at]) {
    if (!raw?.trim()) continue;
    const t = new Date(raw).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}
