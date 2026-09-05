"use client";

import { PortalScreenDashboard } from "@/components/shared/PortalScreenDashboard";
import {
  PRIVAT_DASHBOARD_EMPTY_RECENT,
  PRIVAT_DASHBOARD_KPI_DEFS,
  PRIVAT_DASHBOARD_RECENT_ALL,
  PRIVAT_DASHBOARD_RECENT_TITLE,
  type PrivatDashboardKpiId,
} from "@/lib/portal2/kunde-dashboard";
import type { PortalFocusRole } from "@/lib/portal2/dashboard-focus";
import type { PortalDashboardActionSlide } from "@/lib/portal2/dashboard-actions/types";
import type { PortalKundeTyp } from "@/lib/portal2/kunde-typ";
import {
  portalListeStatusColor,
  portalListeStatusLabel,
} from "@/lib/portal2/liste-status";
import { portalMieterStatusLabel, type PortalMockStatusId } from "@/lib/portal2/status";

export type PrivatDashboardRecentItem = {
  id: string;
  titel: string;
  objekt: string;
  flowStatus: PortalMockStatusId;
  notfall?: boolean;
  hvMieterView?: boolean;
  statusLabel?: string;
};

type Props = {
  hello: string;
  kundeTyp: Exclude<PortalKundeTyp, "hv">;
  roleLabel?: string;
  /** KPI-Labels (Mieter / HM / Eigentümer). */
  focusRole?: PortalFocusRole;
  actionSlides?: PortalDashboardActionSlide[];
  onActionRefresh?: () => void | Promise<void>;
  kpis: Record<PrivatDashboardKpiId, number>;
  recent: PrivatDashboardRecentItem[];
  onOpenAll: () => void;
  onOpenItem: (id: string) => void;
  onKpiClick?: (id: PrivatDashboardKpiId) => void;
  heroImageUrl?: string | null;
  profileName?: string | null;
};

function resolveFocusRole(
  focusRole: PortalFocusRole | undefined,
  roleLabel: string,
  kundeTyp: Exclude<PortalKundeTyp, "hv">
): PortalFocusRole {
  if (focusRole) return focusRole;
  const r = roleLabel.toLowerCase();
  if (r.includes("mieter")) return "mieter";
  if (r.includes("eigentümer") || r.includes("eigentuemer")) return "eigentuemer";
  if (r.includes("hausmeister")) return "hausmeister";
  if (kundeTyp === "gewerbe") return "privat";
  return "privat";
}

function kpiLabelFor(id: PrivatDashboardKpiId, focusRole: PortalFocusRole): string {
  if (id === "offen") {
    if (focusRole === "hausmeister") return "Prüfaufträge";
    return "Offen";
  }
  if (id === "in_arbeit") return "In Arbeit";
  return "Erledigt";
}

/** Deep Green Dashboard — Privat / Mieter / Eigentümer / Hausmeister. */
export function PortalKundePrivatDashboard({
  hello,
  kundeTyp,
  roleLabel: roleLabelProp,
  focusRole: focusRoleProp,
  actionSlides = [],
  onActionRefresh,
  kpis,
  recent,
  onOpenAll,
  onOpenItem,
  onKpiClick,
  heroImageUrl,
  profileName,
}: Props) {
  const roleLabel = roleLabelProp?.trim() || "";
  const nameForProfile = (profileName?.trim() || hello.replace(/^Hallo\s+/i, "")).trim();
  const focusRole = resolveFocusRole(focusRoleProp, roleLabel, kundeTyp);

  return (
    <PortalScreenDashboard
      roleLabel={roleLabel}
      hello={nameForProfile}
      avatarName={nameForProfile}
      brandSubline={roleLabel || nameForProfile}
      heroImageUrl={heroImageUrl}
      tiles={PRIVAT_DASHBOARD_KPI_DEFS.map((def) => ({
        id: def.id,
        label: kpiLabelFor(def.id, focusRole),
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
        statusLabel: v.hvMieterView
          ? v.statusLabel?.trim() || portalMieterStatusLabel(v.flowStatus)
          : portalListeStatusLabel(v.flowStatus, "privat"),
        statusColor: portalListeStatusColor(v.flowStatus, "privat"),
        notfall: v.notfall,
      }))}
      onOpenAll={onOpenAll}
      onOpenItem={onOpenItem}
      recentTitle={PRIVAT_DASHBOARD_RECENT_TITLE}
      recentAllLabel={PRIVAT_DASHBOARD_RECENT_ALL}
      recentEmpty={PRIVAT_DASHBOARD_EMPTY_RECENT}
    />
  );
}
