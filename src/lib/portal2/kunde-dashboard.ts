/**
 * Portal 2.0 D7 — Privat/Gewerbe Dashboard-KPIs (`screenDashboard` privat-Variante).
 */

import type { PortalMockStatusId } from "@/lib/portal2/status";
import type { HvFlowCountMap } from "@/lib/portal2/hv-dashboard";

export const PRIVAT_DASHBOARD_ROLE_LABEL = "Privatkunde" as const;
export const GEWERBE_DASHBOARD_ROLE_LABEL = "Gewerbe" as const;

export const PRIVAT_DASHBOARD_RECENT_TITLE = "Zuletzt" as const;
export const PRIVAT_DASHBOARD_RECENT_ALL = "Alle ansehen" as const;
export const PRIVAT_DASHBOARD_EMPTY_RECENT = "Noch nichts" as const;

export type PrivatDashboardKpiId = "offen" | "in_arbeit" | "gesamt_offen";

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
    id: "gesamt_offen" as const,
    label: "Gesamt offen",
    color: "#2E7D52",
    bg: "#E7F1E9",
  },
] as const;

/**
 * Mock privat-Tiles:
 * - Offen = gemeldet+freigegeben+angefragt+angebot
 * - In Arbeit = auftrag+abschluss
 * - Gesamt offen = wie Offen (Mock zeigt dieselbe Aggregation in Tile 1 und 3 für Nicht-HV)
 */
export function buildPrivatDashboardKpis(
  flow: HvFlowCountMap
): Record<PrivatDashboardKpiId, number> {
  const offen =
    flow.gemeldet + flow.freigegeben + flow.angefragt + flow.angebot;
  return {
    offen,
    in_arbeit: flow.auftrag + flow.abschluss,
    gesamt_offen: offen,
  };
}

/** Liste-Chips Privat (Mock): Alle · Offen · In Arbeit · Abgeschlossen */
export type PrivatListeChip =
  | "alle"
  | "offen"
  | "arbeit"
  | "abgeschlossen";

export const PRIVAT_LISTE_CHIPS: Array<{
  id: PrivatListeChip;
  label: string;
}> = [
  { id: "alle", label: "Alle" },
  { id: "offen", label: "Offen" },
  { id: "arbeit", label: "In Arbeit" },
  { id: "abgeschlossen", label: "Abgeschlossen" },
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
  if (chip === "arbeit") {
    return flow === "auftrag" || flow === "abschluss";
  }
  return flow === "rechnung" || flow === "bezahlt";
}
