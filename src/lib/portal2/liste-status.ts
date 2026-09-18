/**
 * Portal-Listen/Dashboard — Status wie Filter-Chips (Offen · In Arbeit · Erledigt).
 * Ersetzt granulare FLOW-Labels (Neu, Angebot, …) in Karten und „Zuletzt“.
 */

import { PRIVAT_DASHBOARD_KPI_DEFS } from "@/lib/portal2/kunde-dashboard";
import { HV_DASHBOARD_KPI_DEFS } from "@/lib/portal2/hv-dashboard";
import { hvListeChipMatches } from "@/lib/portal2/hv-liste";
import { privatListeChipMatches } from "@/lib/portal2/kunde-dashboard";
import { PORTAL_STATUS, type PortalMockStatusId } from "@/lib/portal2/status";

export type PortalListeChipVariant = "hv" | "privat";

export type PortalListeChipBucket = "offen" | "in_arbeit" | "erledigt" | "abgelehnt";

export function portalListeChipBucket(
  flow: PortalMockStatusId,
  variant: PortalListeChipVariant
): PortalListeChipBucket {
  if (flow === "abgelehnt") return "abgelehnt";
  if (variant === "hv") {
    if (hvListeChipMatches("offen", flow)) return "offen";
    if (hvListeChipMatches("in_arbeit", flow)) return "in_arbeit";
    return "erledigt";
  }
  if (privatListeChipMatches("offen", flow)) return "offen";
  if (privatListeChipMatches("in_arbeit", flow)) return "in_arbeit";
  return "erledigt";
}

export function portalListeStatusLabel(
  flow: PortalMockStatusId,
  variant: PortalListeChipVariant
): string {
  switch (portalListeChipBucket(flow, variant)) {
    case "offen":
      return "Offen";
    case "in_arbeit":
      return "In Arbeit";
    case "abgelehnt":
      return "Abgelehnt";
    default:
      return "Erledigt";
  }
}

export function portalListeStatusColor(
  flow: PortalMockStatusId,
  variant: PortalListeChipVariant
): string {
  const bucket = portalListeChipBucket(flow, variant);
  if (bucket === "abgelehnt") return PORTAL_STATUS.abgelehnt.color;
  const defs =
    variant === "hv" ? HV_DASHBOARD_KPI_DEFS : PRIVAT_DASHBOARD_KPI_DEFS;
  const idx = bucket === "offen" ? 0 : bucket === "in_arbeit" ? 1 : 2;
  return defs[idx]!.color;
}

export function portalListeStatusChipStyle(
  flow: PortalMockStatusId,
  variant: PortalListeChipVariant
): { color: string; backgroundColor: string } {
  const bucket = portalListeChipBucket(flow, variant);
  if (bucket === "abgelehnt") {
    const m = PORTAL_STATUS.abgelehnt;
    return { color: m.color, backgroundColor: m.bg };
  }
  const defs =
    variant === "hv" ? HV_DASHBOARD_KPI_DEFS : PRIVAT_DASHBOARD_KPI_DEFS;
  const idx = bucket === "offen" ? 0 : bucket === "in_arbeit" ? 1 : 2;
  const d = defs[idx]!;
  return { color: d.color, backgroundColor: d.bg };
}
