import {
  isPortalAngebotPhaseStatus,
  isPortalAuftragAbgeschlossenRecord,
  isPortalAuftragPhaseStatus,
} from "@/lib/portal/portal-pipeline";
import { isVorgangPortalErledigt } from "@/lib/portal/vorgang-erledigt";

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

/** Kunde kann im Portal annehmen — nur bei „gesendet“, nicht nach Annahme. */
function isAngebotWartetAufKunde(status?: string | null): boolean {
  return normalizeStatus(status) === "gesendet";
}

function isAngebotVomKundenAngenommen(status?: string | null): boolean {
  const s = normalizeStatus(status);
  return s === "kunde_akzeptiert" || s === "angenommen";
}

function isLeadVorgangAbgeschlossen(phase?: string | null): boolean {
  return normalizeStatus(phase) === "abgeschlossen";
}

function isHvMieterErledigt(input: {
  leadVorgangPhase?: string | null;
  hv_meldung_status?: string | null;
  hasAuftragRecord?: boolean;
  auftragStatus?: string | null;
  auftragFortschritt?: number | null;
  auftragPositionen?: Array<{
    handwerker_id?: string | null;
    handwerker_status?: string | null;
    leistung_status?: string | null;
  }> | null;
}): boolean {
  if (!input.hasAuftragRecord) {
    return isVorgangPortalErledigt({
      leadVorgangPhase: input.leadVorgangPhase,
      hv_meldung_status: input.hv_meldung_status,
    });
  }

  return isVorgangPortalErledigt({
    leadVorgangPhase: input.leadVorgangPhase,
    hv_meldung_status: input.hv_meldung_status,
    auftragStatus: input.auftragStatus,
    auftragFortschritt: input.auftragFortschritt,
    positionen: input.auftragPositionen,
  });
}

function isHvMieterTerminPhase(input: {
  hasMieterTermin?: boolean;
}): boolean {
  return Boolean(input.hasMieterTermin);
}

function isHvMieterInBearbeitung(input: {
  hasAngebotRecord?: boolean;
  hasAuftragRecord?: boolean;
  leadStatus?: string | null;
  angebotStatus?: string | null;
  leadVorgangPhase?: string | null;
  hv_meldung_status?: string | null;
  org_freigabe_status?: string | null;
}): boolean {
  const hv = normalizeStatus(input.hv_meldung_status);
  const freigabe = normalizeStatus(input.org_freigabe_status);
  const phase = normalizeStatus(input.leadVorgangPhase);

  if (input.hasAngebotRecord || input.hasAuftragRecord) return true;
  if (isPortalAngebotPhaseStatus(input.leadStatus)) return true;
  if (isAngebotBereit(input.angebotStatus)) return true;
  if (phase === "in_bearbeitung") return true;
  if (freigabe === "freigegeben") return true;
  if (
    hv === "notmassnahme" ||
    hv === "kleinreparatur" ||
    hv === "angebot_eingefordert"
  ) {
    return true;
  }
  return false;
}

/**
 * Mieter über HV: nur MIETER_STG-Labels —
 * Eingegangen · In Bearbeitung · Bestätigung · Erledigt.
 * Termin ist Hint/needsAction, kein eigener Status.
 */
function resolveHvMieterVorgangStatus(input: {
  leadStatus?: string | null;
  leadVorgangPhase?: string | null;
  hv_meldung_status?: string | null;
  org_freigabe_status?: string | null;
  angebotStatus?: string | null;
  auftragStatus?: string | null;
  auftragFortschritt?: number | null;
  hasAngebotRecord?: boolean;
  hasAuftragRecord?: boolean;
  hasMieterTermin?: boolean;
  hasOffeneTerminvorschlaege?: boolean;
  auftragPositionen?: Array<{
    handwerker_id?: string | null;
    handwerker_status?: string | null;
    leistung_status?: string | null;
  }> | null;
}): KundeVorgangStatus {
  if (
    isAbgelehnt(input.auftragStatus ?? input.angebotStatus ?? input.leadStatus) ||
    normalizeStatus(input.hv_meldung_status) === "abgelehnt"
  ) {
    return {
      phase: "abgelehnt",
      label: LABELS.abgelehnt,
      pillKey: "abgelehnt",
      sortPriority: 90,
      needsAction: false,
    };
  }

  if (isHvMieterErledigt(input)) {
    return {
      phase: "abgeschlossen",
      label: "Erledigt",
      pillKey: "abgeschlossen",
      sortPriority: 80,
      needsAction: false,
    };
  }

  if (input.hasAuftragRecord || isHvMieterTerminPhase(input)) {
    return {
      phase: "in_ausfuehrung",
      label: "Bestätigung",
      pillKey: "beauftragt",
      sortPriority: 18,
      needsAction: Boolean(input.hasOffeneTerminvorschlaege),
    };
  }

  if (isHvMieterInBearbeitung(input)) {
    return {
      phase: "angebot_wird_erstellt",
      label: "In Bearbeitung",
      pillKey: "in_arbeit",
      sortPriority: 15,
      needsAction: Boolean(input.hasOffeneTerminvorschlaege),
    };
  }

  return {
    phase: "eingegangen",
    label: "Eingegangen",
    pillKey: "neu",
    sortPriority: 10,
    needsAction: false,
  };
}

export function resolveKundeVorgangStatus(input: {
  leadStatus?: string | null;
  leadVorgangPhase?: string | null;
  hv_meldung_status?: string | null;
  org_freigabe_status?: string | null;
  angebotStatus?: string | null;
  auftragStatus?: string | null;
  auftragFortschritt?: number | null;
  hasAngebotRecord?: boolean;
  hasAuftragRecord?: boolean;
  /** Offene Positionsänderungen am Auftrag (neu / geändert / entfernt). */
  hasPendingAuftragAenderung?: boolean;
  /** Mieter-Portal + HV-Vorgang: vereinfachte Status ohne Angebots-Labels. */
  useHvMieterStatus?: boolean;
  hasMieterTermin?: boolean;
  hasOffeneTerminvorschlaege?: boolean;
  auftragPositionen?: Array<{
    handwerker_id?: string | null;
    handwerker_status?: string | null;
    leistung_status?: string | null;
  }> | null;
}): KundeVorgangStatus {
  if (input.useHvMieterStatus) {
    return resolveHvMieterVorgangStatus(input);
  }

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
    const st = normalizeStatus(input.auftragStatus);
    const done =
      isPortalAuftragAbgeschlossenRecord({
        status: input.auftragStatus,
        fortschritt: input.auftragFortschritt,
      }) ||
      st === "abnahme" ||
      isVorgangPortalErledigt({
        leadVorgangPhase: input.leadVorgangPhase,
        hv_meldung_status: input.hv_meldung_status,
        auftragStatus: input.auftragStatus,
        auftragFortschritt: input.auftragFortschritt,
        positionen: input.auftragPositionen,
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
    if (input.hasPendingAuftragAenderung) {
      return {
        phase: "in_ausfuehrung",
        label: "Geändert",
        pillKey: "geaendert",
        sortPriority: 4,
        needsAction: true,
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

  if (
    input.hasAuftragRecord === false &&
    isLeadVorgangAbgeschlossen(input.leadVorgangPhase)
  ) {
    return {
      phase: "abgeschlossen",
      label: LABELS.abgeschlossen,
      pillKey: "abgeschlossen",
      sortPriority: 80,
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

  if (input.hasAngebotRecord && isAngebotWartetAufKunde(input.angebotStatus)) {
    return {
      phase: "angebot_liegt_vor",
      label: LABELS.angebot_liegt_vor,
      pillKey: "angebot",
      sortPriority: 5,
      needsAction: true,
    };
  }

  if (input.hasAngebotRecord && isAngebotVomKundenAngenommen(input.angebotStatus)) {
    return {
      phase: "angebot_wird_erstellt",
      label: "Angebot angenommen",
      pillKey: "angenommen",
      sortPriority: 12,
      needsAction: false,
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
