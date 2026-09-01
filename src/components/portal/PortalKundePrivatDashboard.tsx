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
import { buildPortalDashboardFocus, type PortalFocusRole } from "@/lib/portal2/dashboard-focus";
import type { PortalKundeTyp } from "@/lib/portal2/kunde-typ";
import { PORTAL_STATUS, portalMieterStatusLabel, type PortalMockStatusId } from "@/lib/portal2/status";

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
  /** Fokus-Rolle; Default aus roleLabel/kundeTyp */
  focusRole?: PortalFocusRole;
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

function kpiLabelFor(
  id: PrivatDashboardKpiId,
  focusRole: PortalFocusRole
): string {
  if (id === "offen") {
    if (focusRole === "hausmeister") return "Prüfaufträge";
    if (focusRole === "mieter") return "Offen";
    return "Zu entscheiden";
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

  const nameForProfile = (profileName?.trim() || hello.replace(/^Hallo\s+/i, "")).trim();
  const focusRole = resolveFocusRole(focusRoleProp, roleLabel, kundeTyp);
  const top = recent[0];
  const focus = buildPortalDashboardFocus(
    focusRole,
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
      focus={focus}
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
