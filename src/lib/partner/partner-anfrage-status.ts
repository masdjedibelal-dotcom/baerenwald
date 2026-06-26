import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import {
  isProjektStartDatumErreicht,
  resolvePartnerAnfrageProjektStartIso,
} from "@/lib/partner/partner-anfrage-projekt-start";

/** Status, in denen der Handwerker noch annehmen/ablehnen kann. */
const PENDING_STATUS = new Set([
  "angefragt",
  "ausstehend",
  "zugewiesen",
  "offen",
]);

const HW_BEANTWORTET = new Set(["akzeptiert", "abgelehnt"]);

type PartnerAnfrageTimingFields = Pick<
  PartnerAnfrageItem,
  "status" | "antwort_at" | "gesendet_at" | "hw_status" | "hw_eingereicht_at"
> & {
  zeitraum?: string;
  lead?: PartnerAnfrageItem["lead"] | null;
};

export function isPartnerAnfrageAntwortAbgelaufen(item: PartnerAnfrageTimingFields): boolean {
  if (item.antwort_at) return false;
  const st = item.status.toLowerCase();
  if (st === "akzeptiert" || st === "abgelehnt") return false;

  const start = resolvePartnerAnfrageProjektStartIso({
    gesendet_at: item.gesendet_at,
    zeitraum: item.zeitraum,
    lead: item.lead,
  });
  return isProjektStartDatumErreicht(start);
}

/**
 * Offene Bärenwald-Anfrage (HW soll antworten).
 * Primär: gesendet, noch keine Antwort. Fallback: bekannter Pending-Status ohne Antwort.
 */
export function isPartnerAnfrageOffen(item: PartnerAnfrageTimingFields): boolean {
  if (isPartnerAnfrageAntwortAbgelaufen(item)) return false;
  if (item.antwort_at) return false;
  const st = item.status.toLowerCase();
  if (st === "akzeptiert" || st === "abgelehnt") return false;
  if (item.gesendet_at) return true;
  return PENDING_STATUS.has(st);
}

/** HW kann im ersten Schritt Preise anpassen (Erstantwort, ausstehende Konditionen oder CRM-Rückfrage). */
export function isPartnerAnfrageKonditionenBearbeitbar(
  item: PartnerAnfrageTimingFields
): boolean {
  if (isPartnerAnfrageAntwortAbgelaufen(item)) return false;
  if (isPartnerAnfrageWartetAufPreiseinigung(item)) return false;

  const st = item.status.toLowerCase();
  const hwSt = (item.hw_status ?? "").toLowerCase();

  if (st === "abgelehnt") return false;
  if (hwSt === "eingereicht" || hwSt === "uebernommen") return false;
  if (hwSt === "rueckfrage" || hwSt === "abgelehnt") return true;
  if (isPartnerAnfrageOffen(item)) return true;

  /** Zusage liegt vor, Konditionen/Preise noch nicht eingereicht. */
  if (st === "akzeptiert" && !item.hw_eingereicht_at) return true;

  return false;
}

/** HW hat geantwortet — Bärenwald prüft die Konditionen. */
export function isPartnerAnfrageWartetAufPreiseinigung(
  item: PartnerAnfrageTimingFields
): boolean {
  const st = item.status.toLowerCase();
  const hwSt = (item.hw_status ?? "").toLowerCase();
  return st === "akzeptiert" && hwSt === "eingereicht";
}

/** Nur wenn der Handwerker noch aktiv handeln muss (Badge, Filter „Offen“). */
export function isPartnerAnfrageAktionErforderlich(
  item: PartnerAnfrageTimingFields
): boolean {
  return isPartnerAnfrageKonditionenBearbeitbar(item);
}

export function partnerAnfrageStatusPillKey(item: PartnerAnfrageTimingFields): string {
  if (isPartnerAnfrageAntwortAbgelaufen(item)) return "antwort_abgelaufen";
  if (isPartnerAnfrageWartetAufPreiseinigung(item)) return "eingereicht";
  const hwSt = (item.hw_status ?? "").toLowerCase();
  if (hwSt === "rueckfrage") return "rueckfrage";
  if (hwSt === "abgelehnt") return "abgelehnt";
  if (isPartnerAnfrageAktionErforderlich(item)) return "antwort ausstehend";
  return item.status.toLowerCase();
}

export function partnerAnfrageStatusLabel(item: PartnerAnfrageTimingFields): string {
  if (isPartnerAnfrageAntwortAbgelaufen(item)) return "Antwort abgelaufen";
  if (isPartnerAnfrageWartetAufPreiseinigung(item)) return "Wartet auf Prüfung";
  if (isPartnerAnfrageKonditionenBearbeitbar(item)) {
    const hwSt = (item.hw_status ?? "").toLowerCase();
    if (hwSt === "rueckfrage") return "Neue Konditionen";
    if (hwSt === "abgelehnt") return "Konditionen abgelehnt";
    if (item.antwort_at && !item.hw_eingereicht_at) return "Angebotspreis festlegen";
    return "Antwort ausstehend";
  }
  if (item.antwort_at) {
    const s = item.status.toLowerCase();
    const hwSt = (item.hw_status ?? "").toLowerCase();
    if (hwSt === "uebernommen") return "Gegenangebot akzeptiert";
    if (s === "akzeptiert" && item.hw_eingereicht_at) return "Zugesagt";
    if (s === "abgelehnt") return "Abgelehnt";
  }
  if (isPartnerAnfrageOffen(item)) return "Antwort ausstehend";
  const s = item.status.toLowerCase();
  if (s === "akzeptiert") return "Zugesagt";
  if (s === "abgelehnt") return "Abgelehnt";
  return item.status;
}

type PartnerAuftragAnfrageTiming = Pick<
  PartnerAuftragItem,
  "hwStatus" | "start_datum"
> & {
  positionen: Array<{ start_datum?: string | null }>;
};

export function isPartnerAuftragAnfrageAntwortAbgelaufen(
  item: PartnerAuftragAnfrageTiming
): boolean {
  const hw = item.hwStatus.toLowerCase();
  if (HW_BEANTWORTET.has(hw)) return false;

  const start = resolvePartnerAnfrageProjektStartIso({
    start_datum: item.start_datum,
    position_start_daten: item.positionen.map((p) => p.start_datum),
  });
  return isProjektStartDatumErreicht(start);
}

export function isPartnerAuftragAnfrageOffen(
  item: Pick<
    PartnerAuftragItem,
    "status" | "hwStatus" | "start_datum" | "angebotHwStatus"
  > & {
    positionen: Array<{ start_datum?: string | null }>;
  }
): boolean {
  const ahSt = (item.angebotHwStatus ?? "").toLowerCase();
  if (ahSt === "uebernommen" || ahSt === "eingereicht") return false;

  if (isPartnerAuftragAnfrageAntwortAbgelaufen(item)) return false;
  const hw = item.hwStatus.toLowerCase();
  if (HW_BEANTWORTET.has(hw)) return false;
  return (
    item.status.toLowerCase() === "offen" ||
    PENDING_STATUS.has(hw) ||
    hw === "zugewiesen"
  );
}

type PartnerAuftragAnfrageAktionFields = Pick<
  PartnerAuftragItem,
  "status" | "hwStatus" | "start_datum" | "angebotHwStatus" | "angebotHwEingereichtAt"
> & {
  positionen: Array<{ start_datum?: string | null }>;
};

/** Auftrags-Zuweisung: HW muss noch zu-/absagen oder Konditionen nachreichen. */
export function isPartnerAuftragAnfrageAktionErforderlich(
  item: PartnerAuftragAnfrageAktionFields
): boolean {
  if (isPartnerAuftragAnfrageOffen(item)) return true;
  const hw = item.hwStatus.toLowerCase();
  const ahSt = (item.angebotHwStatus ?? "").toLowerCase();
  if (hw !== "akzeptiert") return false;
  if (ahSt === "eingereicht" || ahSt === "uebernommen") return false;
  return !item.angebotHwEingereichtAt;
}

export function isPartnerAuftragWartetAufPreiseinigung(
  item: Pick<PartnerAuftragItem, "hwStatus" | "angebotHwStatus">
): boolean {
  return (
    item.hwStatus.toLowerCase() === "akzeptiert" &&
    (item.angebotHwStatus ?? "").toLowerCase() === "eingereicht"
  );
}

export function partnerAuftragAnfrageStatusLabel(
  item: Pick<
    PartnerAuftragItem,
    "hwStatus" | "start_datum" | "status" | "angebotHwStatus" | "angebotHwKonditionenArt"
  > & {
    positionen: Array<{ start_datum?: string | null }>;
  }
): string {
  if (isPartnerAuftragAnfrageAntwortAbgelaufen(item)) return "Antwort abgelaufen";
  if (isPartnerAuftragWartetAufPreiseinigung(item)) return "Wartet auf Prüfung";
  const ahSt = (item.angebotHwStatus ?? "").toLowerCase();
  if (ahSt === "rueckfrage") return "Neue Konditionen";
  if (ahSt === "uebernommen") {
    return item.angebotHwKonditionenArt === "gegenvorschlag"
      ? "Gegenangebot akzeptiert"
      : "Konditionen vereinbart";
  }
  const hw = item.hwStatus.toLowerCase();
  const map: Record<string, string> = {
    angefragt: "Antwort ausstehend",
    ausstehend: "Ausstehend",
    warten: "Warten auf Antwort",
    zugewiesen: "Zugewiesen",
    akzeptiert: "Angebotspreis festlegen",
    abgelehnt: "Abgelehnt",
  };
  return map[hw] ?? item.hwStatus ?? "Ausstehend";
}
