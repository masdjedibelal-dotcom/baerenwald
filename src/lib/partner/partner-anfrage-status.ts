import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import {
  isProjektStartDatumErreicht,
  resolvePartnerAnfrageProjektStartIso,
} from "@/lib/partner/partner-anfrage-projekt-start";
import {
  hasPartnerKonditionenNachreichungAusstehend,
  positionBrauchtHandwerkerAktion,
} from "@/lib/partner/partner-konditionen";

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
  "status" | "antwort_at" | "gesendet_at" | "hw_status" | "bestaetigt_at"
> & {
  zeitraum?: string;
  lead?: PartnerAnfrageItem["lead"] | null;
};

export function isPartnerAnfrageAntwortAbgelaufen(
  item: PartnerAnfrageTimingFields
): boolean {
  if (item.antwort_at || item.bestaetigt_at) return false;
  const st = item.status.toLowerCase();
  if (st === "akzeptiert" || st === "abgelehnt" || st === "angenommen") return false;

  const start = resolvePartnerAnfrageProjektStartIso({
    gesendet_at: item.gesendet_at,
    zeitraum: item.zeitraum,
    lead: item.lead,
  });
  return isProjektStartDatumErreicht(start);
}

/** Erstzuweisung — noch keine verbindliche Annahme. */
export function isPartnerAnfrageOffen(item: PartnerAnfrageTimingFields): boolean {
  if (isPartnerAnfrageAntwortAbgelaufen(item)) return false;
  if (item.bestaetigt_at) return false;
  const st = item.status.toLowerCase();
  if (st === "angenommen" || st === "abgelehnt") return false;
  if (item.antwort_at) return false;
  if (item.gesendet_at) return true;
  return PENDING_STATUS.has(st);
}

type PartnerAnfrageKonditionenFields = PartnerAnfrageTimingFields &
  Pick<
    PartnerAnfrageItem,
    | "crm_positionen_raw"
    | "crm_auftrag_positionen"
    | "gewerk_id"
    | "gewerk_name"
    | "handwerker_id"
    | "hw_konditionen"
    | "alle_hw_konditionen"
  >;

export function isPartnerAnfrageKonditionenNachreichung(
  item: Pick<
    PartnerAnfrageItem,
    | "crm_positionen_raw"
    | "crm_auftrag_positionen"
    | "gewerk_id"
    | "gewerk_name"
    | "handwerker_id"
    | "hw_konditionen"
    | "hw_status"
    | "alle_hw_konditionen"
  >
): boolean {
  return hasPartnerKonditionenNachreichungAusstehend(item);
}

/** HW muss noch handeln (Tab Offen). */
export function isPartnerAnfrageAktionErforderlich(
  item: PartnerAnfrageKonditionenFields
): boolean {
  if (isPartnerAnfrageAntwortAbgelaufen(item)) return false;
  if (isPartnerAnfrageKonditionenNachreichung(item)) return true;
  return isPartnerAnfrageOffen(item);
}

export function partnerAnfrageStatusPillKey(
  item: PartnerAnfrageKonditionenFields
): string {
  if (isPartnerAnfrageAntwortAbgelaufen(item)) return "antwort_abgelaufen";
  if (isPartnerAnfrageKonditionenNachreichung(item)) return "ergaenzung";
  if (isPartnerAnfrageAktionErforderlich(item)) return "neu";
  return item.status.toLowerCase();
}

export function partnerAnfrageStatusLabel(
  item: PartnerAnfrageKonditionenFields
): string {
  if (isPartnerAnfrageAntwortAbgelaufen(item)) return "Antwort abgelaufen";
  if (isPartnerAnfrageKonditionenNachreichung(item)) return "Geändert";
  if (isPartnerAnfrageAktionErforderlich(item)) return "Aktion nötig";
  const s = item.status.toLowerCase();
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

/** Abgelaufene Zuweisung ohne HW-Antwort — nicht in Vorgängen listen. */
export function isPartnerVorgangAusgeblendet(input: {
  handwerker_bestaetigt_at: string | null;
  anfrage?: PartnerAnfrageTimingFields | null;
  auftrag: PartnerAuftragAnfrageTiming & {
    hwStatus: string;
    status: string;
  };
}): boolean {
  if (input.handwerker_bestaetigt_at?.trim()) return false;

  const hw = input.auftrag.hwStatus.toLowerCase();
  const anfrageSt = (input.anfrage?.status ?? "").toLowerCase();
  if (hw === "abgelehnt" || anfrageSt === "abgelehnt") return false;

  if (input.anfrage && isPartnerAnfrageAntwortAbgelaufen(input.anfrage)) {
    return true;
  }

  if (
    isPartnerAuftragAnfrageAntwortAbgelaufen(input.auftrag) &&
    !HW_BEANTWORTET.has(hw)
  ) {
    return true;
  }

  return false;
}

export function isPartnerAuftragAnfrageOffen(
  item: Pick<
    PartnerAuftragItem,
    "status" | "hwStatus" | "start_datum"
  > & {
    positionen: Array<{
      start_datum?: string | null;
      handwerker_status?: string | null;
    }>;
  }
): boolean {
  const hw = item.hwStatus.toLowerCase();
  if (hw === "abgelehnt") return false;

  const hatOffenePosition = item.positionen.some((p) =>
    positionBrauchtHandwerkerAktion(p.handwerker_status)
  );

  /** Noch offene Leistungen — immer in Offen, auch nach Projektstart. */
  if (hatOffenePosition) return true;

  if (hw === "akzeptiert") return false;
  if (isPartnerAuftragAnfrageAntwortAbgelaufen(item)) return false;

  return (
    item.status.toLowerCase() === "offen" ||
    PENDING_STATUS.has(hw) ||
    hw === "zugewiesen"
  );
}

type PartnerAuftragAnfrageAktionFields = Pick<
  PartnerAuftragItem,
  "status" | "hwStatus" | "start_datum" | "angebotHandwerkerId"
> & {
  positionen: Array<{
    start_datum?: string | null;
    handwerker_status?: string | null;
  }>;
};

/** Auftrags-Zuweisung ohne verknüpfte Angebots-Anfrage — sonst nur über angebot_handwerker in Offen. */
export function isPartnerAuftragAnfrageAktionErforderlich(
  item: PartnerAuftragAnfrageAktionFields
): boolean {
  if (item.angebotHandwerkerId) return false;
  return isPartnerAuftragAnfrageOffen(item);
}

export function partnerAuftragAnfrageStatusLabel(
  item: Pick<PartnerAuftragItem, "hwStatus" | "start_datum" | "status"> & {
    positionen: Array<{
      start_datum?: string | null;
      handwerker_status?: string | null;
    }>;
  }
): string {
  if (isPartnerAuftragAnfrageAntwortAbgelaufen(item)) return "Antwort abgelaufen";
  if (isPartnerAuftragAnfrageOffen(item)) return "Aktion nötig";
  const hw = item.hwStatus.toLowerCase();
  if (hw === "abgelehnt") return "Abgelehnt";
  return "Aktion nötig";
}
