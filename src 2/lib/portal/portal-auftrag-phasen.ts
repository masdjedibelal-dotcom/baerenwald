export type PortalAuftragPhaseId =
  | "planung"
  | "vorbereitung"
  | "ausfuehrung"
  | "abnahme"
  | "rechnung";

export type PortalAuftragPhaseState = "fertig" | "aktuell" | "offen";

export type PortalAuftragStatus =
  | "offen"
  | "in_arbeit"
  | "abnahme"
  | "abgeschlossen"
  | "storniert";

export const PORTAL_AUFTRAG_PHASEN: Array<{
  id: PortalAuftragPhaseId;
  label: string;
}> = [
  { id: "planung", label: "Planung" },
  { id: "vorbereitung", label: "Vorbereitung" },
  { id: "ausfuehrung", label: "Ausführung" },
  { id: "abnahme", label: "Abnahme" },
  { id: "rechnung", label: "Rechnung" },
];

export function normalizePortalAuftragStatus(
  status?: string | null,
  abgeschlossen = false
): PortalAuftragStatus {
  if (abgeschlossen) return "abgeschlossen";
  const s = (status ?? "offen").toLowerCase().replace(/[\s-]+/g, "_");
  if (s.includes("storniert")) return "storniert";
  if (s.includes("abgeschlossen") || s.includes("fertig") || s.includes("completed")) {
    return "abgeschlossen";
  }
  if (s === "abnahme" || s.includes("abnahme")) return "abnahme";
  if (s === "in_arbeit" || s.includes("arbeit") || s === "aktiv" || s === "planung") {
    return "in_arbeit";
  }
  return "offen";
}

export function portalAuftragPhasenStates(input: {
  status: PortalAuftragStatus;
  hatAngebot: boolean;
}): Record<PortalAuftragPhaseId, PortalAuftragPhaseState> {
  const { status, hatAngebot } = input;

  if (status === "storniert") {
    return {
      planung: "offen",
      vorbereitung: "offen",
      ausfuehrung: "offen",
      abnahme: "offen",
      rechnung: "offen",
    };
  }

  if (status === "abgeschlossen") {
    return {
      planung: "fertig",
      vorbereitung: "fertig",
      ausfuehrung: "fertig",
      abnahme: "fertig",
      rechnung: "fertig",
    };
  }

  const planungFertig = hatAngebot || status !== "offen";
  const vorbereitungFertig = status === "in_arbeit" || status === "abnahme";

  let aktuell: PortalAuftragPhaseId = "planung";
  if (status === "abnahme") aktuell = "abnahme";
  else if (status === "in_arbeit") aktuell = "ausfuehrung";
  else if (status === "offen") {
    if (vorbereitungFertig) aktuell = "ausfuehrung";
    else if (planungFertig) aktuell = "vorbereitung";
    else aktuell = "planung";
  }

  const order: PortalAuftragPhaseId[] = [
    "planung",
    "vorbereitung",
    "ausfuehrung",
    "abnahme",
    "rechnung",
  ];
  const aktuellIdx = order.indexOf(aktuell);

  const out = {} as Record<PortalAuftragPhaseId, PortalAuftragPhaseState>;
  for (let i = 0; i < order.length; i++) {
    const id = order[i]!;
    if (i < aktuellIdx) out[id] = "fertig";
    else if (i === aktuellIdx) out[id] = "aktuell";
    else out[id] = "offen";
  }

  if (!planungFertig && aktuell !== "planung") out.planung = "offen";
  if (planungFertig && aktuellIdx > 0) out.planung = "fertig";
  if (vorbereitungFertig && aktuellIdx > 1) out.vorbereitung = "fertig";

  return out;
}

export function portalAuftragAktuellePhaseLabel(
  states: Record<PortalAuftragPhaseId, PortalAuftragPhaseState>
): string | undefined {
  const current = PORTAL_AUFTRAG_PHASEN.find((p) => states[p.id] === "aktuell");
  return current?.label;
}
