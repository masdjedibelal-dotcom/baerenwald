import { PORTAL_STATUS_COLORS } from "@/lib/tokens/portal-status-colors";
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
  | "bezahlt"
  /** Terminal: Angebot/Freigabe abgelehnt — zählt zu Erledigt, nicht in FLOW-Timeline. */
  | "abgelehnt";

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
    /** Offen/Eingang — Orange, damit nicht wie Angebot/Auftrag (Blau) wirkt. */
    color: PORTAL_STATUS_COLORS.gemeldet.color,
    bg: PORTAL_STATUS_COLORS.gemeldet.bg,
  },
  freigegeben: {
    id: "freigegeben",
    label: "Freigegeben",
    color: PORTAL_STATUS_COLORS.freigegeben.color,
    bg: PORTAL_STATUS_COLORS.freigegeben.bg,
  },
  angefragt: {
    id: "angefragt",
    label: "Angebot",
    color: PORTAL_STATUS_COLORS.angefragt.color,
    bg: PORTAL_STATUS_COLORS.angefragt.bg,
  },
  angebot: {
    id: "angebot",
    label: "Angebot",
    color: PORTAL_STATUS_COLORS.angebot.color,
    bg: PORTAL_STATUS_COLORS.angebot.bg,
  },
  auftrag: {
    id: "auftrag",
    label: "Auftrag",
    color: PORTAL_STATUS_COLORS.auftrag.color,
    bg: PORTAL_STATUS_COLORS.auftrag.bg,
  },
  abschluss: {
    id: "abschluss",
    label: "Erledigt",
    color: PORTAL_STATUS_COLORS.abschluss.color,
    bg: PORTAL_STATUS_COLORS.abschluss.bg,
  },
  rechnung: {
    id: "rechnung",
    label: "Rechnung",
    color: PORTAL_STATUS_COLORS.rechnung.color,
    bg: PORTAL_STATUS_COLORS.rechnung.bg,
  },
  bezahlt: {
    id: "bezahlt",
    label: "Abgeschlossen",
    color: PORTAL_STATUS_COLORS.bezahlt.color,
    bg: PORTAL_STATUS_COLORS.bezahlt.bg,
  },
  abgelehnt: {
    id: "abgelehnt",
    label: "Abgelehnt",
    color: PORTAL_STATUS_COLORS.abgelehnt.color,
    bg: PORTAL_STATUS_COLORS.abgelehnt.bg,
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

/**
 * Timeline-Variante pro Portal-Typ (Labels + Mieter = STG).
 * - hv: mit Freigabe
 * - privat / eigentümer: ohne Freigabe-Wording (D7)
 * - hausmeister: ohne Freigabe, Ausführungs-Fokus
 * - mieter: MIETER_STG (5 Stufen)
 */
export type PortalFlowTimelineVariant =
  | "hv"
  | "privat"
  | "mieter"
  | "hausmeister";

const FLOW_LABELS_HV_DESKTOP = [
  "Gemeldet",
  "Freigegeben",
  "Angebot",
  "Auftrag",
  "Rechnung",
] as const;

const FLOW_LABELS_HV_MOBILE = [
  "Neu",
  "Freigabe",
  "Angebot",
  "Auftrag",
  "Rechnung",
] as const;

/** Privat / Eigentümer — kein HV-Freigabe-Schritt (D7). */
const FLOW_LABELS_PRIVAT_DESKTOP = [
  "Anfrage",
  "In Bearbeitung",
  "Angebot",
  "Auftrag",
  "Rechnung",
] as const;

const FLOW_LABELS_PRIVAT_MOBILE = [
  "Neu",
  "Aktiv",
  "Angebot",
  "Auftrag",
  "Rechnung",
] as const;

const FLOW_LABELS_HM_DESKTOP = [
  "Gemeldet",
  "In Prüfung",
  "Beauftragt",
  "Ausführung",
  "Erledigt",
] as const;

const FLOW_LABELS_HM_MOBILE = [
  "Neu",
  "Prüfung",
  "Auftrag",
  "Vor Ort",
  "Fertig",
] as const;

export function portalFlowTimelineLabels(
  variant: PortalFlowTimelineVariant,
  mobile = false
): readonly string[] {
  if (variant === "mieter") {
    return MIETER_STG.map((s) => s.title_de);
  }
  if (variant === "privat") {
    return mobile ? FLOW_LABELS_PRIVAT_MOBILE : FLOW_LABELS_PRIVAT_DESKTOP;
  }
  if (variant === "hausmeister") {
    return mobile ? FLOW_LABELS_HM_MOBILE : FLOW_LABELS_HM_DESKTOP;
  }
  return mobile ? FLOW_LABELS_HV_MOBILE : FLOW_LABELS_HV_DESKTOP;
}

/** detailRole → Timeline-Variante (Eigentümer bewusst wie privat, siehe Kommentar im UI). */
export function portalFlowTimelineVariantForRole(
  role: "hv" | "kunde" | "mieter" | "hausmeister" | "eigentuemer" | null | undefined
): PortalFlowTimelineVariant {
  if (role === "mieter") return "mieter";
  if (role === "hausmeister") return "hausmeister";
  if (role === "hv") return "hv";
  // kunde + eigentuemer: ohne Freigabe-Label
  return "privat";
}

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
    case "abgelehnt":
      return 5; // alle Schritte erledigt / terminal
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
    subtitle_de:
      "Ihre Verwaltung prüft die Meldung und organisiert die nächsten Schritte.",
    subtitle_en:
      "Your property manager is reviewing the report and arranging next steps.",
  },
  {
    id: "beauftragt",
    title_de: "Beauftragt",
    title_en: "Assigned",
    subtitle_de: "Ein Handwerksbetrieb wurde beauftragt — Termin folgt.",
    subtitle_en: "A craftsperson has been assigned — a visit will follow.",
  },
  {
    id: "vor_ort",
    title_de: "Partner vor Ort",
    title_en: "Craftsperson on site",
    subtitle_de: "Der Partner ist vor Ort und arbeitet am Schaden.",
    subtitle_en: "The craftsperson is on site and working on the issue.",
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
  flowId: PortalMockStatusId,
  opts?: { vorOrt?: boolean }
): (typeof MIETER_STG)[number]["id"] {
  if (opts?.vorOrt && flowId !== "bezahlt" && flowId !== "abschluss" && flowId !== "rechnung") {
    return "vor_ort";
  }
  switch (flowId) {
    case "gemeldet":
      return "eingegangen";
    case "freigegeben":
    case "angefragt":
    case "angebot":
      return "in_bearbeitung";
    case "auftrag":
      return "beauftragt";
    case "abschluss":
    case "rechnung":
    case "bezahlt":
    case "abgelehnt":
      return "erledigt";
  }
}

/** Portal-Status-Label für Mieter (kein HV-/Angebots-Wording). */
export function portalMieterStatusLabel(
  flowId: PortalMockStatusId,
  lang: "de" | "en" = "de"
): string {
  const stgId = portalFlowToMieterStg(flowId);
  const step = MIETER_STG.find((s) => s.id === stgId);
  if (!step) return lang === "en" ? "In progress" : "In Bearbeitung";
  return lang === "en" ? step.title_en : step.title_de;
}
