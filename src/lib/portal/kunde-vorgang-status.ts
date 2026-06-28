import {
  isPortalAngebotPhaseStatus,
  isPortalAuftragAbgeschlossenRecord,
  isPortalAuftragPhaseStatus,
} from "@/lib/portal/portal-pipeline";

export type KundeVorgangPhase =
  | "eingegangen"
  | "angebot_wird_erstellt"
  | "angebot_liegt_vor"
  | "in_ausfuehrung"
  | "abgeschlossen"
  | "abgelehnt";

export type KundeVorgangStatus = {
  phase: KundeVorgangPhase;
  label: string;
  pillKey: string;
  sortPriority: number;
  needsAction: boolean;
};

const LABELS: Record<KundeVorgangPhase, string> = {
  eingegangen: "Eingegangen",
  angebot_wird_erstellt: "Angebot wird erstellt",
  angebot_liegt_vor: "Angebot liegt vor",
  in_ausfuehrung: "In Ausführung",
  abgeschlossen: "Abgeschlossen",
  abgelehnt: "Abgelehnt",
};

function normalizeStatus(s?: string | null): string {
  return (s ?? "").toLowerCase().replace(/[\s-]+/g, "_");
}

function isAbgelehnt(status?: string | null): boolean {
  const s = normalizeStatus(status);
  return s.includes("abgelehnt") || s.includes("storniert");
}

function isAngebotBereit(status?: string | null): boolean {
  const s = normalizeStatus(status);
  return (
    s === "gesendet" ||
    s === "angenommen" ||
    s === "kunde_akzeptiert" ||
    s.includes("angebot")
  );
}

export function resolveKundeVorgangStatus(input: {
  leadStatus?: string | null;
  angebotStatus?: string | null;
  auftragStatus?: string | null;
  auftragFortschritt?: number | null;
  hasAngebotRecord?: boolean;
  hasAuftragRecord?: boolean;
}): KundeVorgangStatus {
  if (isAbgelehnt(input.auftragStatus ?? input.angebotStatus ?? input.leadStatus)) {
    return {
      phase: "abgelehnt",
      label: LABELS.abgelehnt,
      pillKey: "abgelehnt",
      sortPriority: 90,
      needsAction: false,
    };
  }

  if (input.hasAuftragRecord) {
    const done = isPortalAuftragAbgeschlossenRecord({
      status: input.auftragStatus,
      fortschritt: input.auftragFortschritt,
    });
    if (done) {
      return {
        phase: "abgeschlossen",
        label: LABELS.abgeschlossen,
        pillKey: "abgeschlossen",
        sortPriority: 80,
        needsAction: false,
      };
    }
    return {
      phase: "in_ausfuehrung",
      label: LABELS.in_ausfuehrung,
      pillKey: "in_arbeit",
      sortPriority: 20,
      needsAction: false,
    };
  }

  if (input.hasAuftragRecord === false && isPortalAuftragPhaseStatus(input.leadStatus)) {
    return {
      phase: "in_ausfuehrung",
      label: LABELS.in_ausfuehrung,
      pillKey: "in_arbeit",
      sortPriority: 20,
      needsAction: false,
    };
  }

  if (input.hasAngebotRecord && isAngebotBereit(input.angebotStatus)) {
    return {
      phase: "angebot_liegt_vor",
      label: LABELS.angebot_liegt_vor,
      pillKey: "angebot",
      sortPriority: 5,
      needsAction: true,
    };
  }

  if (
    input.hasAngebotRecord ||
    isPortalAngebotPhaseStatus(input.leadStatus) ||
    isAngebotBereit(input.angebotStatus)
  ) {
    return {
      phase: "angebot_wird_erstellt",
      label: LABELS.angebot_wird_erstellt,
      pillKey: "entwurf",
      sortPriority: 15,
      needsAction: false,
    };
  }

  return {
    phase: "eingegangen",
    label: LABELS.eingegangen,
    pillKey: "neu",
    sortPriority: 10,
    needsAction: false,
  };
}

export function kundeVorgangStatusLabel(phase: KundeVorgangPhase): string {
  return LABELS[phase];
}
