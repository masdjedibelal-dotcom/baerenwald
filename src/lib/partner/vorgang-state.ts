import { positionBrauchtVorgangAktion } from "@/lib/partner/partner-konditionen";
import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";

export { positionBrauchtVorgangAktion } from "@/lib/partner/partner-konditionen";

export type VorgangState = "neu" | "geaendert" | "in_bearbeitung" | "erledigt";

export type VorgangFilter = "offen" | "erledigt";

const ERLEDIGT_AUFTRAG_STATUS = new Set([
  "abgeschlossen",
  "storniert",
  "abgelehnt",
]);

export function isVorgangAuftragErledigt(auftragStatus: string): boolean {
  return ERLEDIGT_AUFTRAG_STATUS.has(auftragStatus.trim().toLowerCase());
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
}): VorgangState {
  if (isVorgangAuftragErledigt(input.auftragStatus)) return "erledigt";

  const bestaetigt = Boolean(input.handwerkerBestaetigtAt?.trim());
  const offeneNachreichung =
    (input.offeneNachreichungPositionIds?.length ?? 0) > 0;
  const offeneAktion =
    hatOffeneVorgangAktion(input.positionen) ||
    offeneNachreichung ||
    Boolean(input.anfrageAktionNoetig && !bestaetigt);

  if (!bestaetigt && offeneAktion) return "neu";
  if (bestaetigt && offeneAktion) return "geaendert";
  if (bestaetigt) return "in_bearbeitung";
  if (offeneAktion) return "neu";
  return "in_bearbeitung";
}

export function vorgangPasstFilter(
  state: VorgangState,
  filter: VorgangFilter
): boolean {
  if (filter === "erledigt") return state === "erledigt";
  return state === "neu" || state === "geaendert" || state === "in_bearbeitung";
}

export function vorgangStateLabel(state: VorgangState): string {
  switch (state) {
    case "neu":
      return "Aktion nötig";
    case "geaendert":
      return "Geändert";
    case "in_bearbeitung":
      return "In Bearbeitung";
    case "erledigt":
      return "Erledigt";
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
