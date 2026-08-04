"use client";

import { PortalScreenDashboard } from "@/components/shared/PortalScreenDashboard";
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
  { id: "inAusfuehrung", label: "In Ausführung" },
  { id: "erledigt", label: "Erledigt" },
];

type Props = {
  firmName: string;
  kpis: PartnerHwDashboardKpis;
  recent: PartnerHwRecentItem[];
  onOpenAll: () => void;
  onOpenItem: (id: string) => void;
  onKpiClick?: (id: keyof PartnerHwDashboardKpis) => void;
  /** P2-02: Planer findbar vom Start */
  onOpenPlaner?: () => void;
  heroImageUrl?: string | null;
};

/** Mock `screenDashboard` Handwerker — 1:1. */
export function PartnerHwDashboard({
  firmName,
  kpis,
  recent,
  onOpenAll,
  onOpenItem,
  onKpiClick,
  onOpenPlaner,
  heroImageUrl,
}: Props) {
  return (
    <PortalScreenDashboard
      roleLabel="Handwerker"
      hello={firmName}
      avatarName={firmName}
      heroImageUrl={heroImageUrl}
      tiles={KPI_DEFS.map((def) => ({
        id: def.id,
        label: def.label,
        value: kpis[def.id],
        onClick: onKpiClick ? () => onKpiClick(def.id) : undefined,
      }))}
      recent={recent.slice(0, 4).map((v) => ({
        id: v.id,
        titel: v.titel,
        objekt: v.objekt,
        statusLabel: v.statusLabel,
        statusColor: v.statusColor,
        statusBg: v.statusBg,
      }))}
      onOpenAll={onOpenAll}
      onOpenItem={onOpenItem}
      recentTitle="Zuletzt"
      recentAllLabel="Alle ansehen"
      recentEmpty="Noch nichts"
      after={
        onOpenPlaner ? (
          <button
            type="button"
            onClick={onOpenPlaner}
            className="mt-4 flex w-full items-center justify-between rounded-[12px] border border-border-default bg-white px-4 py-3.5 text-left"
          >
            <span>
              <span className="block text-[14px] font-semibold text-text-primary">
                Planer
              </span>
              <span className="mt-0.5 block text-[12.5px] text-text-secondary">
                Termine und Aufgaben heute
              </span>
            </span>
            <span className="text-[13px] font-semibold text-accent">Öffnen</span>
          </button>
        ) : null
      }
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
