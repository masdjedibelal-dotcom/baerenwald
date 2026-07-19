"use client";

import { PortalScreenDashboard } from "@/components/shared/PortalScreenDashboard";
import {
  GEWERBE_DASHBOARD_ROLE_LABEL,
  PRIVAT_DASHBOARD_EMPTY_RECENT,
  PRIVAT_DASHBOARD_KPI_DEFS,
  PRIVAT_DASHBOARD_RECENT_ALL,
  PRIVAT_DASHBOARD_RECENT_TITLE,
  PRIVAT_DASHBOARD_ROLE_LABEL,
  type PrivatDashboardKpiId,
} from "@/lib/portal2/kunde-dashboard";
import type { PortalKundeTyp } from "@/lib/portal2/kunde-typ";
import { PORTAL_STATUS, type PortalMockStatusId } from "@/lib/portal2/status";

export type PrivatDashboardRecentItem = {
  id: string;
  titel: string;
  objekt: string;
  flowStatus: PortalMockStatusId;
  notfall?: boolean;
};

type Props = {
  hello: string;
  kundeTyp: Exclude<PortalKundeTyp, "hv">;
  /** D8: z. B. „Eigentümer“ statt Privatkunde/Gewerbe */
  roleLabel?: string;
  kpis: Record<PrivatDashboardKpiId, number>;
  recent: PrivatDashboardRecentItem[];
  onOpenAll: () => void;
  onOpenItem: (id: string) => void;
  heroImageUrl?: string | null;
};

/** Mock `screenDashboard` Privat/Gewerbe/Eigentümer — 1:1. */
export function PortalKundePrivatDashboard({
  hello,
  kundeTyp,
  roleLabel: roleLabelProp,
  kpis,
  recent,
  onOpenAll,
  onOpenItem,
  heroImageUrl,
}: Props) {
  const roleLabel =
    roleLabelProp?.trim() ||
    (kundeTyp === "gewerbe"
      ? GEWERBE_DASHBOARD_ROLE_LABEL
      : PRIVAT_DASHBOARD_ROLE_LABEL);

  return (
    <PortalScreenDashboard
      roleLabel={roleLabel}
      hello={hello}
      heroImageUrl={heroImageUrl}
      tiles={PRIVAT_DASHBOARD_KPI_DEFS.map((def) => ({
        id: def.id,
        label: def.label,
        value: kpis[def.id],
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
      onOpenAll={onOpenAll}
      onOpenItem={onOpenItem}
      recentTitle={PRIVAT_DASHBOARD_RECENT_TITLE}
      recentAllLabel={PRIVAT_DASHBOARD_RECENT_ALL}
      recentEmpty={PRIVAT_DASHBOARD_EMPTY_RECENT}
    />
  );
}
