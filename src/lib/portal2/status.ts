/**
 * Portal 2.0 Status-Modell — Mock `STATUS` + `FLOW`
 * Quelle: Baerenwald Portale (5).html
 *
 * Labels/Farben 1:1. Ableitung aus realen Feldern: `status-mapping.ts`.
 */

export type PortalMockStatusId =
  | "gemeldet"
  | "freigegeben"
  | "angefragt"
  | "angebot"
  | "auftrag"
  | "abschluss"
  | "rechnung"
  | "bezahlt";

export type PortalMockStatusMeta = {
  id: PortalMockStatusId;
  label: string;
  /** Mock `c` — Textfarbe */
  color: string;
  /** Mock `bg` — Chip-Hintergrund */
  bg: string;
};

/** Mock `STATUS` — exakte Labels/Farben. */
export const PORTAL_STATUS: Record<PortalMockStatusId, PortalMockStatusMeta> = {
  gemeldet: {
    id: "gemeldet",
    label: "Neu",
    color: "#1F4FA8",
    bg: "#E4ECF7",
  },
  freigegeben: {
    id: "freigegeben",
    label: "Freigegeben",
    color: "#1F4FA8",
    bg: "#E4ECF7",
  },
  angefragt: {
    id: "angefragt",
    label: "Handwerker angefragt",
    color: "#8A5A06",
    bg: "#FBF1D6",
  },
  angebot: {
    id: "angebot",
    label: "Angebot",
    color: "#8A5A06",
    bg: "#FBF1D6",
  },
  auftrag: {
    id: "auftrag",
    label: "Auftrag",
    color: "#1F6A3F",
    bg: "#DDEEDF",
  },
  abschluss: {
    id: "abschluss",
    label: "Abschluss",
    color: "#1F6A3F",
    bg: "#DDEEDF",
  },
  rechnung: {
    id: "rechnung",
    label: "Rechnung",
    color: "#8A5A06",
    bg: "#FBF1D6",
  },
  bezahlt: {
    id: "bezahlt",
    label: "Abgeschlossen",
    color: "#4B5563",
    bg: "#EAEDEC",
  },
};

/**
 * Interne Meilenstein-Reihenfolge (granular für Mapping/Actions).
 * UI-Timeline: `PORTAL_FLOW_TIMELINE` (5 Schritte).
 */
export const PORTAL_FLOW: readonly PortalMockStatusId[] = [
  "gemeldet",
  "freigegeben",
  "angefragt",
  "angebot",
  "auftrag",
  "abschluss",
  "rechnung",
  "bezahlt",
] as const;

/** Verdichtete HV-Timeline in der Detail-UI. */
export const PORTAL_FLOW_TIMELINE: readonly PortalMockStatusId[] = [
  "gemeldet",
  "freigegeben",
  "angebot",
  "auftrag",
  "rechnung",
] as const;

export function portalStatusMeta(id: PortalMockStatusId): PortalMockStatusMeta {
  return PORTAL_STATUS[id];
}

export function portalFlowIndex(id: PortalMockStatusId): number {
  return PORTAL_FLOW.indexOf(id);
}

/** Index in der 5-Schritt-UI-Timeline (Zwischenstatus werden verdichtet). */
export function portalFlowTimelineIndex(id: PortalMockStatusId): number {
  switch (id) {
    case "gemeldet":
      return 0;
    case "freigegeben":
    case "angefragt":
      return 1;
    case "angebot":
      return 2;
    case "auftrag":
    case "abschluss":
      return 3;
    case "rechnung":
      return 4;
    case "bezahlt":
      return 5; // alle Schritte erledigt
  }
}

/** Inline-Styles für Status-Chip (Mock-Farben). */
export function portalStatusChipStyle(id: PortalMockStatusId): {
  color: string;
  backgroundColor: string;
} {
  const m = PORTAL_STATUS[id];
  return { color: m.color, backgroundColor: m.bg };
}

/**
 * Mieter-Timeline STG (4 Stufen, de+en) — Mock `STG`.
 * Nicht identisch mit FLOW (HV-UI: 5 Schritte; Mieter verdichtet auf 4).
 */
export const MIETER_STG = [
  {
    id: "eingegangen",
    title_de: "Eingegangen",
    title_en: "Received",
    subtitle_de: "Ihre Meldung ist bei Ihrer Verwaltung eingegangen.",
    subtitle_en: "Your report has reached your property manager.",
  },
  {
    id: "in_bearbeitung",
    title_de: "In Bearbeitung",
    title_en: "In progress",
    subtitle_de: "Ihre Verwaltung bearbeitet Ihre Meldung.",
    subtitle_en: "Your property manager is handling your report.",
  },
  {
    id: "beauftragt",
    title_de: "Beauftragt",
    title_en: "Assigned",
    subtitle_de:
      "Ein Fachbetrieb wurde von Ihrer Verwaltung beauftragt.",
    subtitle_en: "A contractor has been assigned by your property manager.",
  },
  {
    id: "erledigt",
    title_de: "Erledigt",
    title_en: "Completed",
    subtitle_de: "Die Arbeiten sind abgeschlossen.",
    subtitle_en: "The work has been completed.",
  },
] as const;

/** FLOW-Status → verdichteter Mieter-STG-Schritt. */
export function portalFlowToMieterStg(
  flowId: PortalMockStatusId
): (typeof MIETER_STG)[number]["id"] {
  switch (flowId) {
    case "gemeldet":
      return "eingegangen";
    case "freigegeben":
    case "angefragt":
    case "angebot":
    case "rechnung":
      return "in_bearbeitung";
    case "auftrag":
    case "abschluss":
      return "beauftragt";
    case "bezahlt":
      return "erledigt";
  }
}
