import { isPortalAuftragAbgeschlossenRecord } from "@/lib/portal/portal-pipeline";
import { positionHandwerkerErledigt } from "@/lib/partner/partner-konditionen";

export type PortalPositionErledigtInput = {
  handwerker_id?: string | null;
  handwerker_status?: string | null;
  leistung_status?: string | null;
  aenderung_typ?: string | null;
};

function normalizeStatus(s?: string | null): string {
  return (s ?? "").toLowerCase().replace(/[\s-]+/g, "_");
}

/** Position vom Handwerker oder CRM als erledigt markiert. */
export function positionPortalErledigt(
  position: PortalPositionErledigtInput
): boolean {
  if (positionHandwerkerErledigt(position.handwerker_status)) return true;
  return normalizeStatus(position.leistung_status) === "erledigt";
}

/** Aktive Auftragspositionen (ohne entfernte). */
export function filterAktivePortalPositionen(
  positionen: PortalPositionErledigtInput[] | null | undefined
): PortalPositionErledigtInput[] {
  return (positionen ?? []).filter(
    (p) => normalizeStatus(p.aenderung_typ) !== "entfernt"
  );
}

/**
 * Alle aktiven Auftragspositionen erledigt — unabhängig vom Handwerker.
 * Offene oder noch nicht zugewiesene Positionen blockieren den Gesamtabschluss.
 */
export function allePositionenPortalErledigt(
  positionen: PortalPositionErledigtInput[] | null | undefined
): boolean {
  const active = filterAktivePortalPositionen(positionen);
  if (!active.length) return false;
  return active.every(positionPortalErledigt);
}

/** Vorgang im Portal als erledigt (Lead-Sync, CRM-Auftrag oder Positionen). */
export function isVorgangPortalErledigt(input: {
  leadVorgangPhase?: string | null;
  hv_meldung_status?: string | null;
  auftragStatus?: string | null;
  auftragFortschritt?: number | null;
  positionen?: PortalPositionErledigtInput[] | null;
}): boolean {
  const active = filterAktivePortalPositionen(input.positionen);

  if (active.length > 0) {
    return active.every(positionPortalErledigt);
  }

  if (normalizeStatus(input.leadVorgangPhase) === "abgeschlossen") return true;
  if (normalizeStatus(input.hv_meldung_status) === "abgeschlossen") return true;

  return isPortalAuftragAbgeschlossenRecord({
    status: input.auftragStatus,
    fortschritt: input.auftragFortschritt,
  });
}

export type PortalAuftragKontext = {
  status?: string | null;
  fortschritt?: number | null;
  positionen?: PortalPositionErledigtInput[] | null;
};

export function portalErledigtFromLeadAndAuftrag(
  lead: {
    vorgang_phase?: string | null;
    hv_meldung_status?: string | null;
  },
  auftrag?: PortalAuftragKontext | null
): boolean {
  return isVorgangPortalErledigt({
    leadVorgangPhase: lead.vorgang_phase,
    hv_meldung_status: lead.hv_meldung_status,
    auftragStatus: auftrag?.status,
    auftragFortschritt: auftrag?.fortschritt,
    positionen: auftrag?.positionen,
  });
}
