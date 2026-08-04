"use client";

import { PortalScreenDashboard } from "@/components/shared/PortalScreenDashboard";
import {
  GEWERBE_DASHBOARD_ROLE_LABEL,
  PRIVAT_DASHBOARD_EMPTY_RECENT,
  PRIVAT_DASHBOARD_KPI_DEFS,
  PRIVAT_DASHBOARD_KPI_SECTION,
  PRIVAT_DASHBOARD_RECENT_ALL,
  PRIVAT_DASHBOARD_RECENT_TITLE,
  PRIVAT_DASHBOARD_ROLE_LABEL,
  type PrivatDashboardKpiId,
} from "@/lib/portal2/kunde-dashboard";
import type { PortalKundeTyp } from "@/lib/portal2/kunde-typ";
import { PORTAL_STATUS, portalMieterStatusLabel, type PortalMockStatusId } from "@/lib/portal2/status";

export type PrivatDashboardRecentItem = {
  id: string;
  titel: string;
  objekt: string;
  flowStatus: PortalMockStatusId;
  notfall?: boolean;
  /** HV-Mieter: eigenes Label statt PORTAL_STATUS. */
  hvMieterView?: boolean;
  statusLabel?: string;
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
  onKpiClick?: (id: PrivatDashboardKpiId) => void;
  heroImageUrl?: string | null;
  /** Name für Avatar/Kurve; Default = `hello`. */
  profileName?: string | null;
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
  onKpiClick,
  heroImageUrl,
  profileName,
}: Props) {
  const roleLabel =
    roleLabelProp?.trim() ||
    (kundeTyp === "gewerbe"
      ? GEWERBE_DASHBOARD_ROLE_LABEL
      : PRIVAT_DASHBOARD_ROLE_LABEL);

  const nameForProfile = profileName?.trim() || hello;

  return (
    <PortalScreenDashboard
      roleLabel={roleLabel}
      hello={hello}
      avatarName={nameForProfile}
      heroImageUrl={heroImageUrl}
      tiles={PRIVAT_DASHBOARD_KPI_DEFS.map((def) => ({
        id: def.id,
        label: def.label,
        value: kpis[def.id],
        onClick: onKpiClick ? () => onKpiClick(def.id) : undefined,
      }))}
      tilesTitle={PRIVAT_DASHBOARD_KPI_SECTION}
      recent={recent.slice(0, 4).map((v) => {
        const st = PORTAL_STATUS[v.flowStatus];
        const statusLabel = v.hvMieterView
          ? v.statusLabel?.trim() || portalMieterStatusLabel(v.flowStatus)
          : st.label;
        return {
          id: v.id,
          titel: v.titel,
          objekt: v.objekt,
          statusLabel,
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
