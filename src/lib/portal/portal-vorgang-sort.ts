import { PORTAL_FLOW, type PortalMockStatusId } from "@/lib/portal2/status";

/** Startseite „Zuletzt“ — überall maximal so viele Einträge. */
export const PORTAL_DASHBOARD_RECENT_LIMIT = 4;

/**
 * Standard-Vorgangs-Sortierung (Listen):
 * 1) Status: neu/offen → … → erledigt
 * 2) Datum: neueste zuerst
 */
export function compareVorgangListOrder(
  a: { statusRank: number; sortDate: number },
  b: { statusRank: number; sortDate: number }
): number {
  if (a.statusRank !== b.statusRank) return a.statusRank - b.statusRank;
  return b.sortDate - a.sortDate;
}

/** Dashboard „Zuletzt“: nur Erstelldatum, neueste zuerst. */
export function compareByNewestCreated(
  a: { sortDate: number },
  b: { sortDate: number }
): number {
  return b.sortDate - a.sortDate;
}

/** Neueste zuerst, dann auf Dashboard-Limit kürzen. */
export function takeNewestCreated<T>(
  items: T[],
  getCreatedAtMs: (item: T) => number,
  limit = PORTAL_DASHBOARD_RECENT_LIMIT
): T[] {
  return [...items]
    .sort((a, b) => getCreatedAtMs(b) - getCreatedAtMs(a))
    .slice(0, limit);
}

/** Portal-Flow (HV/Privat-Chips): Index in PORTAL_FLOW. */
export function portalFlowSortRank(
  statusId: string | null | undefined
): number {
  const id = String(statusId ?? "")
    .trim()
    .toLowerCase();
  const idx = PORTAL_FLOW.indexOf(id as PortalMockStatusId);
  if (idx >= 0) return idx;

  if (id === "neu" || id === "offen" || id === "eingegangen") return 0;
  if (id === "erledigt" || id === "abgeschlossen") {
    return PORTAL_FLOW.indexOf("abschluss");
  }
  if (id === "abgelehnt" || id === "storniert") {
    return PORTAL_FLOW.length + 1;
  }
  return 0;
}

/**
 * Status-Rank aus Kunden-/HV-Detail-Pill (ohne Flow-Override).
 * Niedrig = weiter oben (offen).
 */
export function kundePillSortRank(pillKey: string | null | undefined): number {
  const pill = String(pillKey ?? "")
    .trim()
    .toLowerCase();
  const map: Record<string, number> = {
    geaendert: 4,
    angebot: 5,
    neu: 10,
    gemeldet: 10,
    angenommen: 12,
    freigegeben: 12,
    angefragt: 14,
    entwurf: 15,
    in_arbeit: 16,
    beauftragt: 18,
    auftrag: 20,
    abschluss: 80,
    erledigt: 80,
    abgeschlossen: 80,
    rechnung: 85,
    bezahlt: 88,
    abgelehnt: 90,
    storniert: 91,
  };
  if (pill in map) return map[pill]!;
  return 20;
}
