/**
 * Portal 2.0 D2 — HV Vorgänge-Liste (`screenListe`, `hvChips`, `pageHead`).
 */

import type { OrgVorgangFilter } from "@/lib/org/org-vorgang-filter";
import type { PortalMockStatusId } from "@/lib/portal2/status";

export const HV_LISTE_PAGE_EYEBROW = "Verwaltung" as const;
export const HV_LISTE_PAGE_TITLE = "Vorgänge" as const;

export const HV_CHIPS: Array<{
  id: OrgVorgangFilter;
  label: string;
  /** Badge bei „Offen“. */
  showCount: boolean;
}> = [
  { id: "alle", label: "Alle", showCount: false },
  { id: "offen", label: "Offen", showCount: true },
  { id: "in_arbeit", label: "In Arbeit", showCount: false },
  { id: "erledigt", label: "Erledigt", showCount: false },
];

/** Listen-Chip ↔ Portal-Flow (HV).
 * Offen = wartet auf Freigabe · In Arbeit = Angebot angefragt bis Auftrag · Erledigt = Abschluss+.
 * D3: Semantik = KPI-Klick (`HV_DASHBOARD_KPI_DEFS[].filter`).
 */
export function hvListeChipMatches(
  filter: OrgVorgangFilter,
  flow: PortalMockStatusId
): boolean {
  if (filter === "alle") return true;
  if (filter === "offen") {
    return flow === "gemeldet";
  }
  if (filter === "in_arbeit") {
    return (
      flow === "freigegeben" ||
      flow === "angefragt" ||
      flow === "angebot" ||
      flow === "auftrag"
    );
  }
  return (
    flow === "abschluss" || flow === "rechnung" || flow === "bezahlt"
  );
}

/** D3 — KPI-ID → Listen-Filter (identisch zu `HV_DASHBOARD_KPI_DEFS[].filter`). */
export function hvKpiToListeFilter(
  kpiId: "wartet_freigabe" | "in_arbeit" | "erledigt"
): OrgVorgangFilter {
  if (kpiId === "wartet_freigabe") return "offen";
  if (kpiId === "in_arbeit") return "in_arbeit";
  return "erledigt";
}

export const HV_SECTION_MELDUNGEN = "Meldungen · Eingang" as const;
export const HV_SECTION_ANGEBOTE = "Angebots-Freigabe" as const;
export const HV_SECTION_EMPTY = "Nichts offen" as const;

/** Gelbes Hinweisbanner (Mock screenListe Angebots-Freigabe). */
export const HV_ANGEBOT_BANNER =
  "Bärenwald hat Angebote erstellt — bitte prüfen und freigeben (Freigabe ≠ Angebot annehmen)." as const;

export const HV_MELDUNG_ACTIONS = [
  {
    id: "angebot_einfordern" as const,
    label: "Vorgang freigeben",
    variant: "primary" as const,
  },
  {
    id: "kleinreparatur_freigeben" as const,
    label: "Sofort beauftragen (Kleinreparatur)",
    variant: "ghost" as const,
  },
  {
    id: "ablehnen" as const,
    label: "Ablehnen",
    variant: "danger" as const,
  },
] as const;

export const HV_ANGEBOT_ACTIONS = [
  {
    id: "freigegeben" as const,
    label: "Freigeben",
    variant: "primary" as const,
  },
  {
    id: "abgelehnt" as const,
    label: "Ablehnen",
    variant: "danger" as const,
  },
] as const;

/**
 * Mock `bulkDelVg` — Live: kein physisches Löschen von Vorgängen.
 * UI darf Auswahl zeigen; Aktion → OFFENE-PUNKTE.
 */
export const HV_BULK_DELETE_OFFENER_PUNKT =
  "Bulk-Löschen von Vorgängen ist im Live-Portal nicht erlaubt (Audit/Nachweis). Auswahl bleibt Demo-fähig; Persistenz-Löschen = OFFENE-PUNKTE." as const;

export const HV_BULK_DELETE_DISABLED_HINT =
  "Löschen ist für Vorgänge nicht freigeschaltet." as const;
