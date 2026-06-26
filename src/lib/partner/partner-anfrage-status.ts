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
  "status" | "antwort_at" | "gesendet_at"
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

export function partnerAnfrageStatusLabel(item: PartnerAnfrageTimingFields): string {
  if (isPartnerAnfrageAntwortAbgelaufen(item)) return "Antwort abgelaufen";
  if (item.antwort_at) {
    const s = item.status.toLowerCase();
    if (s === "akzeptiert") return "Angenommen";
    if (s === "abgelehnt") return "Abgelehnt";
  }
  if (isPartnerAnfrageOffen(item)) return "Antwort ausstehend";
  const s = item.status.toLowerCase();
  if (s === "akzeptiert") return "Angenommen";
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
  item: Pick<PartnerAuftragItem, "status" | "hwStatus" | "start_datum"> & {
    positionen: Array<{ start_datum?: string | null }>;
  }
): boolean {
  if (isPartnerAuftragAnfrageAntwortAbgelaufen(item)) return false;
  const hw = item.hwStatus.toLowerCase();
  if (HW_BEANTWORTET.has(hw)) return false;
  return (
    item.status.toLowerCase() === "offen" ||
    PENDING_STATUS.has(hw) ||
    hw === "zugewiesen"
  );
}

export function partnerAuftragAnfrageStatusLabel(
  item: Pick<PartnerAuftragItem, "hwStatus" | "start_datum" | "status"> & {
    positionen: Array<{ start_datum?: string | null }>;
  }
): string {
  if (isPartnerAuftragAnfrageAntwortAbgelaufen(item)) return "Antwort abgelaufen";
  const hw = item.hwStatus.toLowerCase();
  const map: Record<string, string> = {
    angefragt: "Antwort ausstehend",
    ausstehend: "Ausstehend",
    warten: "Warten auf Antwort",
    zugewiesen: "Zugewiesen",
    akzeptiert: "Angenommen",
    abgelehnt: "Abgelehnt",
  };
  return map[hw] ?? item.hwStatus ?? "Ausstehend";
}
