import { positionBrauchtVorgangAktion } from "@/lib/partner/partner-konditionen";
import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";

export { positionBrauchtVorgangAktion } from "@/lib/partner/partner-konditionen";

export type VorgangState =
  | "neu"
  | "geaendert"
  | "in_bearbeitung"
  | "erledigt"
  /** HW hat abgelehnt — Filter „Erledigt“, Label „Abgelehnt“. */
  | "abgelehnt";

export type VorgangFilter = "alle" | "offen" | "auftrag" | "erledigt";

export const VORGANG_FILTER_ORDER: VorgangFilter[] = [
  "alle",
  "offen",
  "auftrag",
  "erledigt",
];

const ERLEDIGT_AUFTRAG_STATUS = new Set([
  "abgeschlossen",
  "storniert",
  "abgelehnt",
]);

export function isVorgangAuftragErledigt(auftragStatus: string): boolean {
  return ERLEDIGT_AUFTRAG_STATUS.has(auftragStatus.trim().toLowerCase());
}

/** HW-Ablehnung an Anfrage, Zuweisung oder allen eigenen Positionen. */
export function isHandwerkerVorgangAbgelehnt(input: {
  hwStatus?: string | null;
  anfrageStatus?: string | null;
  positionen?: Array<{ handwerker_status?: string | null }>;
}): boolean {
  const hw = (input.hwStatus ?? "").trim().toLowerCase();
  const anfrage = (input.anfrageStatus ?? "").trim().toLowerCase();
  if (hw === "abgelehnt" || anfrage === "abgelehnt") return true;
  const pos = input.positionen ?? [];
  if (
    pos.length > 0 &&
    pos.every(
      (p) => (p.handwerker_status ?? "").trim().toLowerCase() === "abgelehnt"
    )
  ) {
    return true;
  }
  return false;
}

export function hatOffeneVorgangAktion(
  positionen: Array<
    Pick<PartnerAuftragPosition, "aenderung_typ" | "handwerker_status">
  >
): boolean {
  return positionen.some(positionBrauchtVorgangAktion);
}

export function ableitenVorgangState(input: {
  auftragStatus: string;
  handwerkerBestaetigtAt: string | null;
  positionen: Array<
    Pick<PartnerAuftragPosition, "aenderung_typ" | "handwerker_status">
  >;
  /** Offene CRM-Nachreichung (kann von Positions-Status abweichen). */
  offeneNachreichungPositionIds?: string[];
  /** Legacy: angebot_handwerker noch ohne Auftrags-Annahme */
  anfrageAktionNoetig?: boolean;
  /** Aggregierter HW-Status am Auftrag (`auftrag_handwerker` / Positionen). */
  hwStatus?: string | null;
  /** `angebot_handwerker.status` falls verknüpft. */
  anfrageStatus?: string | null;
}): VorgangState {
  const auftragSt = input.auftragStatus.trim().toLowerCase();
  if (auftragSt === "abgelehnt") return "abgelehnt";
  if (isVorgangAuftragErledigt(input.auftragStatus)) return "erledigt";

  if (
    isHandwerkerVorgangAbgelehnt({
      hwStatus: input.hwStatus,
      anfrageStatus: input.anfrageStatus,
      positionen: input.positionen,
    })
  ) {
    return "abgelehnt";
  }

  const bestaetigt = Boolean(input.handwerkerBestaetigtAt?.trim());
  const offeneNachreichung =
    (input.offeneNachreichungPositionIds?.length ?? 0) > 0;
  const offeneAktion =
    hatOffeneVorgangAktion(input.positionen) ||
    offeneNachreichung ||
    Boolean(input.anfrageAktionNoetig && !bestaetigt);

  // Ohne Portal-Annahme kein laufender Auftrag — auch wenn CRM Positionen
  // schon auf „bestaetigt“ gesetzt hat (häufig bei Direktauftrag/Notfall).
  if (!bestaetigt) return "neu";
  if (offeneAktion) return "geaendert";
  return "in_bearbeitung";
}

export function vorgangPasstFilter(
  state: VorgangState,
  filter: VorgangFilter
): boolean {
  if (filter === "alle") return true;
  if (filter === "erledigt") {
    return state === "erledigt" || state === "abgelehnt";
  }
  if (filter === "auftrag") return state === "in_bearbeitung";
  // Offen: nur noch anzunehmen (neu) bzw. Nachreichung bestätigen (geaendert)
  return state === "neu" || state === "geaendert";
}

export function vorgangStateLabel(state: VorgangState): string {
  switch (state) {
    case "neu":
      return "Aktion nötig";
    case "geaendert":
      return "Geändert";
    case "in_bearbeitung":
      return "Durchführung";
    case "erledigt":
      return "Erledigt";
    case "abgelehnt":
      return "Abgelehnt";
  }
}

export function vorgangStatePillKey(state: VorgangState): string {
  switch (state) {
    case "neu":
      return "neu";
    case "geaendert":
      return "geaendert";
    case "in_bearbeitung":
      return "in_arbeit";
    case "erledigt":
      return "abgeschlossen";
    case "abgelehnt":
      return "abgelehnt";
  }
}

export function resolveHandwerkerBestaetigtAt(input: {
  handwerker_bestaetigt_at?: string | null;
  projektvertrag_bestaetigt_am?: string | null;
  angebot_bestaetigt_at?: string | null;
}): string | null {
  return (
    input.handwerker_bestaetigt_at?.trim() ||
    input.projektvertrag_bestaetigt_am?.trim() ||
    input.angebot_bestaetigt_at?.trim() ||
    null
  );
}
