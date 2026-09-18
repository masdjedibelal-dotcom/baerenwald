"use client";

import { PortalScreenDashboard } from "@/components/shared/PortalScreenDashboard";
import { PortalServiceVersprechenStrip } from "@/components/shared/PortalDashboardFocusCard";
import {
  HV_DASHBOARD_EMPTY_RECENT,
  HV_DASHBOARD_KPI_DEFS,
  HV_DASHBOARD_RECENT_ALL,
  HV_DASHBOARD_RECENT_TITLE,
  HV_DASHBOARD_ROLE_LABEL,
  type HvDashboardKpiValues,
} from "@/lib/portal2/hv-dashboard";
import type { PortalDashboardActionSlide } from "@/lib/portal2/dashboard-actions/types";
import { portalListeStatusColor, portalListeStatusLabel } from "@/lib/portal2/liste-status";
import type { PortalMockStatusId } from "@/lib/portal2/status";
import type { OrgVorgangFilter } from "@/lib/org/org-vorgang-filter";

export type HvDashboardRecentItem = {
  id: string;
  titel: string;
  objekt: string;
  flowStatus: PortalMockStatusId;
  notfall?: boolean;
};

type Props = {
  orgName: string;
  kpis: HvDashboardKpiValues;
  recent: HvDashboardRecentItem[];
  actionSlides?: PortalDashboardActionSlide[];
  onActionRefresh?: () => void | Promise<void>;
  onOpenFilter: (filter: OrgVorgangFilter) => void;
  onOpenItem: (id: string) => void;
  heroImageUrl?: string | null;
};

/** Deep Green HV-Dashboard. */
export function OrganisationHvDashboard({
  orgName,
  kpis,
  recent,
  actionSlides = [],
  onActionRefresh,
  onOpenFilter,
  onOpenItem,
  heroImageUrl,
}: Props) {
  return (
    <PortalScreenDashboard
      roleLabel={HV_DASHBOARD_ROLE_LABEL}
      hello={orgName}
      avatarName={orgName}
      brandSubline={orgName}
      heroImageUrl={heroImageUrl}
      tiles={HV_DASHBOARD_KPI_DEFS.map((def) => ({
        id: def.id,
        label: def.label,
        value: kpis[def.id],
        onClick: () => onOpenFilter(def.filter),
      }))}
      actionSlides={actionSlides}
      onOpenActionItem={onOpenItem}
      onActionRefresh={onActionRefresh ?? (() => {})}
      afterFocus={<PortalServiceVersprechenStrip />}
      recent={recent.slice(0, 4).map((v) => ({
        id: v.id,
        titel: v.titel,
        objekt: v.objekt,
        statusLabel: portalListeStatusLabel(v.flowStatus, "hv"),
        statusColor: portalListeStatusColor(v.flowStatus, "hv"),
        notfall: v.notfall,
      }))}
      onOpenAll={() => onOpenFilter("alle")}
      onOpenItem={onOpenItem}
      recentTitle={HV_DASHBOARD_RECENT_TITLE}
      recentAllLabel={HV_DASHBOARD_RECENT_ALL}
      recentEmpty={HV_DASHBOARD_EMPTY_RECENT}
    />
  );
}
