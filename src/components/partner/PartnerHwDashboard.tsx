"use client";

import type { ReactNode } from "react";

import { PortalScreenDashboard } from "@/components/shared/PortalScreenDashboard";
import type { PortalDashboardActionSlide } from "@/lib/portal2/dashboard-actions/types";
import { partnerStatusChipStyle } from "@/lib/partner/partner-list-mappers";

export type PartnerHwDashboardKpis = {
  neueAnfragen: number;
  inAusfuehrung: number;
  erledigt: number;
};

export type PartnerHwRecentItem = {
  id: string;
  titel: string;
  objekt: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
};

const KPI_DEFS: Array<{
  id: keyof PartnerHwDashboardKpis;
  label: string;
}> = [
  { id: "neueAnfragen", label: "Neue Anfragen" },
  { id: "inAusfuehrung", label: "In Arbeit" },
  { id: "erledigt", label: "Erledigt" },
];

type Props = {
  firmName: string;
  kpis: PartnerHwDashboardKpis;
  recent: PartnerHwRecentItem[];
  actionSlides?: PortalDashboardActionSlide[];
  onActionRefresh?: () => void | Promise<void>;
  onOpenAll: () => void;
  onOpenItem: (id: string) => void;
  onKpiClick?: (id: keyof PartnerHwDashboardKpis) => void;
  heroImageUrl?: string | null;
  beforeTiles?: ReactNode;
};

/** Deep Green Handwerker-Dashboard. */
export function PartnerHwDashboard({
  firmName,
  kpis,
  recent,
  actionSlides = [],
  onActionRefresh,
  onOpenAll,
  onOpenItem,
  onKpiClick,
  heroImageUrl,
  beforeTiles,
}: Props) {
  return (
    <PortalScreenDashboard
      roleLabel="Handwerker"
      hello={firmName}
      avatarName={firmName}
      brandSubline={firmName}
      heroImageUrl={heroImageUrl}
      beforeTiles={beforeTiles}
      tiles={KPI_DEFS.map((def) => ({
        id: def.id,
        label: def.label,
        value: kpis[def.id],
        onClick: onKpiClick ? () => onKpiClick(def.id) : undefined,
      }))}
      actionSlides={actionSlides}
      onOpenActionItem={onOpenItem}
      onActionRefresh={onActionRefresh ?? (() => {})}
      recent={recent.slice(0, 4).map((v) => ({
        id: v.id,
        titel: v.titel,
        objekt: v.objekt,
        statusLabel: v.statusLabel,
        statusColor: v.statusColor,
      }))}
      onOpenAll={onOpenAll}
      onOpenItem={onOpenItem}
      recentTitle="Zuletzt"
      recentAllLabel="Alle ansehen"
      recentEmpty="Noch keine Vorgänge — neue Anfragen erscheinen hier."
    />
  );
}

/** Fallback-Farben wenn kein Mock-STATUS — dezent wie Partner-Pills. */
export function partnerDashboardStatusColors(key: string): {
  color: string;
  bg: string;
} {
  const style = partnerStatusChipStyle(key);
  return { color: style.color, bg: style.backgroundColor };
}
