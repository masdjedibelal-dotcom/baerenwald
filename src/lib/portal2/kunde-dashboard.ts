/**
 * Portal 2.0 D7 — Privat/Gewerbe/Mieter Dashboard-KPIs (`screenDashboard` privat-Variante).
 */

import type { PortalMockStatusId } from "@/lib/portal2/status";
import type { HvFlowCountMap } from "@/lib/portal2/hv-dashboard";

export const PRIVAT_DASHBOARD_ROLE_LABEL = "" as const;
export const GEWERBE_DASHBOARD_ROLE_LABEL = "Gewerbe" as const;

export const PRIVAT_DASHBOARD_RECENT_TITLE = "Zuletzt" as const;
export const PRIVAT_DASHBOARD_RECENT_ALL = "Alle ansehen" as const;
export const PRIVAT_DASHBOARD_EMPTY_RECENT = "Noch nichts" as const;
export const PRIVAT_DASHBOARD_KPI_SECTION = "Vorgänge" as const;

export type PrivatDashboardKpiId = "offen" | "in_arbeit" | "erledigt";

export const PRIVAT_DASHBOARD_KPI_DEFS = [
  {
    id: "offen" as const,
    label: "Offen",
    color: "#8A5A06",
    bg: "#fef3c7",
  },
  {
    id: "in_arbeit" as const,
    label: "In Arbeit",
    color: "#0f766e",
    bg: "#ccfbf1",
  },
  {
    id: "erledigt" as const,
    label: "Erledigt",
    color: "#2E7D52",
    bg: "#E7F1E9",
  },
] as const;

/**
 * Mock privat-Tiles:
 * - Offen = gemeldet+freigegeben+angefragt+angebot
 * - In Arbeit = nur aktiver Auftrag
 * - Erledigt = abschluss+rechnung+bezahlt+abgelehnt
 */
export function buildPrivatDashboardKpis(
  flow: HvFlowCountMap
): Record<PrivatDashboardKpiId, number> {
  const offen =
    flow.gemeldet + flow.freigegeben + flow.angefragt + flow.angebot;
  const erledigt =
    flow.abschluss + flow.rechnung + flow.bezahlt + flow.abgelehnt;
  return {
    offen,
    in_arbeit: flow.auftrag,
    erledigt,
  };
}

/** Liste-Chips Privat (Mock): Alle · Offen · In Arbeit · Erledigt */
export type PrivatListeChip =
  | "alle"
  | "offen"
  | "in_arbeit"
  | "erledigt"
  /** @deprecated Alias — gleich `in_arbeit`. */
  | "arbeit"
  /** @deprecated Alias — gleich `erledigt`. */
  | "abgeschlossen";

export const PRIVAT_LISTE_CHIPS: Array<{
  id: PrivatListeChip;
  label: string;
}> = [
  { id: "alle", label: "Alle" },
  { id: "offen", label: "Offen" },
  { id: "in_arbeit", label: "In Arbeit" },
  { id: "erledigt", label: "Erledigt" },
];

export function privatListeChipMatches(
  chip: PrivatListeChip,
  flow: PortalMockStatusId
): boolean {
  if (chip === "alle") return true;
  if (chip === "offen") {
    return (
      flow === "gemeldet" ||
      flow === "freigegeben" ||
      flow === "angefragt" ||
      flow === "angebot"
    );
  }
  if (chip === "in_arbeit" || chip === "arbeit") {
    return flow === "auftrag";
  }
  // Abschluss / Rechnung / bezahlt / abgelehnt → Erledigt
  return (
    flow === "abschluss" ||
    flow === "rechnung" ||
    flow === "bezahlt" ||
    flow === "abgelehnt"
  );
}

/** KPI-Klick → Listen-Filterchip. */
export function privatKpiToListeChip(
  kpi: PrivatDashboardKpiId
): PrivatListeChip {
  if (kpi === "in_arbeit") return "in_arbeit";
  if (kpi === "erledigt") return "erledigt";
  return "offen";
}
