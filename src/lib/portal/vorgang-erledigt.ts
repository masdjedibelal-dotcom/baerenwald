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

/**
 * Vorgang im Portal als erledigt (Lead-Sync, CRM-Auftrag oder Positionen).
 * Rechnung ist für Mieter/Melder irrelevant — Abnahme ohne offene Mängel = fertig.
 */
export function isVorgangPortalErledigt(input: {
  leadVorgangPhase?: string | null;
  hv_meldung_status?: string | null;
  auftragStatus?: string | null;
  auftragFortschritt?: number | null;
  positionen?: PortalPositionErledigtInput[] | null;
}): boolean {
  if (normalizeStatus(input.leadVorgangPhase) === "abgeschlossen") return true;
  const hv = normalizeStatus(input.hv_meldung_status);
  if (hv === "abgeschlossen" || hv === "hm_erledigt") return true;

  if (
    isPortalAuftragAbgeschlossenRecord({
      status: input.auftragStatus,
      fortschritt: input.auftragFortschritt,
    })
  ) {
    return true;
  }

  /* Abnahme = Arbeit abgeschlossen (Mängel-Gate sitzt in portalErledigtFromLeadAndAuftrag) */
  if (normalizeStatus(input.auftragStatus) === "abnahme") return true;

  const active = filterAktivePortalPositionen(input.positionen);
  if (active.length > 0) {
    return active.every(positionPortalErledigt);
  }

  return false;
}

export type PortalAuftragKontext = {
  status?: string | null;
  fortschritt?: number | null;
  positionen?: PortalPositionErledigtInput[] | null;
  /** Partner hat Zuweisung bestätigt / übernommen */
  handwerkerBestaetigt?: boolean;
  /** Mindestens ein Bautagebuch-Eintrag */
  hasBautagebuch?: boolean;
  /** HW wurde angefragt / zugewiesen (nicht nur Lead) */
  hwGesendet?: boolean;
  /** Offene Abnahme-Mängel → Mieter darf nicht „Erledigt“ sehen */
  hasOffeneMaengel?: boolean;
};

export function portalErledigtFromLeadAndAuftrag(
  lead: {
    vorgang_phase?: string | null;
    hv_meldung_status?: string | null;
  },
  auftrag?: PortalAuftragKontext | null
): boolean {
  if (auftrag?.hasOffeneMaengel) return false;
  return isVorgangPortalErledigt({
    leadVorgangPhase: lead.vorgang_phase,
    hv_meldung_status: lead.hv_meldung_status,
    auftragStatus: auftrag?.status,
    auftragFortschritt: auftrag?.fortschritt,
    positionen: auftrag?.positionen,
  });
}
