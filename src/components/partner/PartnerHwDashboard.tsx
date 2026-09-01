"use client";

import type { ReactNode } from "react";

import { PortalScreenDashboard } from "@/components/shared/PortalScreenDashboard";
import { buildPortalDashboardFocus } from "@/lib/portal2/dashboard-focus";
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
  onOpenAll,
  onOpenItem,
  onKpiClick,
  heroImageUrl,
  beforeTiles,
}: Props) {
  const top = recent[0];
  const focus = buildPortalDashboardFocus(
    "handwerker",
    top
      ? {
          title: top.titel,
          subtitle: top.objekt,
          onOpen: () => onOpenItem(top.id),
        }
      : null
  );

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
      focus={focus}
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
