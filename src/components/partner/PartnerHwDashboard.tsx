"use client";

import type { ReactNode } from "react";

import { PortalScreenDashboard } from "@/components/shared/PortalScreenDashboard";
import type { PortalDashboardActionSlide } from "@/lib/portal2/dashboard-actions/types";

export type PartnerHwDashboardKpis = {
  offen: number;
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
  { id: "offen", label: "Offen" },
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
  onOpenItem: (id: string, opts?: { focus?: string }) => void;
  onKpiClick?: (id: keyof PartnerHwDashboardKpis) => void;
  heroImageUrl?: string | null;
  beforeTiles?: ReactNode;
  /** P18: nur Einsätze — keine alten Vorgangs-Kacheln/-Liste */
  nurEinsaetze?: boolean;
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
  nurEinsaetze = false,
}: Props) {
  return (
    <PortalScreenDashboard
      roleLabel="Partner"
      hello={firmName}
      avatarName={firmName}
      brandSubline={firmName}
      heroImageUrl={heroImageUrl}
      beforeTiles={beforeTiles}
      hideRecent={nurEinsaetze}
      tiles={nurEinsaetze ? [] : KPI_DEFS.map((def) => ({
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
      recentEmpty="Noch keine Vorgänge — offene Vorgänge erscheinen hier."
    />
  );
}
