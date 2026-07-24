"use client";

import { PortalScreenDashboard } from "@/components/shared/PortalScreenDashboard";
import {
  HV_DASHBOARD_EMPTY_RECENT,
  HV_DASHBOARD_KPI_DEFS,
  HV_DASHBOARD_RECENT_ALL,
  HV_DASHBOARD_RECENT_TITLE,
  HV_DASHBOARD_ROLE_LABEL,
  type HvDashboardKpiValues,
} from "@/lib/portal2/hv-dashboard";
import { PORTAL_STATUS, type PortalMockStatusId } from "@/lib/portal2/status";
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
  onOpenFilter: (filter: OrgVorgangFilter) => void;
  onOpenItem: (id: string) => void;
  heroImageUrl?: string | null;
};

/** Mock `screenDashboard` HV — 1:1 über `PortalScreenDashboard`. */
export function OrganisationHvDashboard({
  orgName,
  kpis,
  recent,
  onOpenFilter,
  onOpenItem,
  heroImageUrl,
}: Props) {
  return (
    <PortalScreenDashboard
      roleLabel={HV_DASHBOARD_ROLE_LABEL}
      hello={orgName}
      avatarName={orgName}
      heroImageUrl={heroImageUrl}
      tiles={HV_DASHBOARD_KPI_DEFS.map((def) => ({
        id: def.id,
        label: def.label,
        value: kpis[def.id],
        onClick: () => onOpenFilter(def.filter),
      }))}
      recent={recent.slice(0, 4).map((v) => {
        const st = PORTAL_STATUS[v.flowStatus];
        return {
          id: v.id,
          titel: v.titel,
          objekt: v.objekt,
          statusLabel: st.label,
          statusColor: st.color,
          statusBg: st.bg,
          notfall: v.notfall,
        };
      })}
      onOpenAll={() => onOpenFilter("offen")}
      onOpenItem={onOpenItem}
      recentTitle={HV_DASHBOARD_RECENT_TITLE}
      recentAllLabel={HV_DASHBOARD_RECENT_ALL}
      recentEmpty={HV_DASHBOARD_EMPTY_RECENT}
    />
  );
}
