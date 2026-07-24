import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";
import {
  positionBrauchtVorgangAktion,
  positionHandwerkerAbgeschlossen,
  positionHandwerkerErledigt,
  positionIstHandwerkerZugewiesen,
} from "@/lib/partner/partner-konditionen";
import {
  isVorgangAuftragErledigt,
  type VorgangState,
} from "@/lib/partner/vorgang-state";

export { positionHandwerkerErledigt } from "@/lib/partner/partner-konditionen";

function leistungDokumentiert(
  p: Pick<PartnerAuftragPosition, "leistung_status">
): boolean {
  return String(p.leistung_status ?? "").toLowerCase() === "erledigt";
}

/**
 * F1 — CTA „Auftrag abschließen“ bleibt bis Signatur.
 * Position-Ende dokumentiert nur die Leistung (leistung_status), setzt nicht
 * handwerker_status=erledigt. Abnahme setzt den finalen Status.
 */
export function partnerKannErledigtMelden(input: {
  positionen: Array<
    Pick<
      PartnerAuftragPosition,
      | "handwerker_status"
      | "aenderung_typ"
      | "leistung_status"
      | "handwerker_id"
    >
  >;
  vorgangState?: VorgangState;
  auftragStatus: string;
  /** Wenn gesetzt: Abnahme bereits signiert → kein erneuter Abschluss. */
  hwAbschlussSigniertAm?: string | null;
  abnahmeProtokollUrl?: string | null;
}): boolean {
  if (isVorgangAuftragErledigt(input.auftragStatus)) return false;
  if (input.hwAbschlussSigniertAm?.trim()) return false;
  if (input.abnahmeProtokollUrl?.trim()) return false;
  if (input.vorgangState !== "in_bearbeitung") return false;
  if (!input.positionen.length) return false;
  if (input.positionen.some(positionBrauchtVorgangAktion)) return false;

  // Mindestens eine zugewiesene Leistung bereit (übernommen/gestartet/dokumentiert)
  return input.positionen.some((p) => {
    if (!positionIstHandwerkerZugewiesen(p.handwerker_status)) return false;
    if (leistungDokumentiert(p)) return true;
    return (
      positionHandwerkerAbgeschlossen(p.handwerker_status) &&
      !positionHandwerkerErledigt(p.handwerker_status)
    );
  });
}

export function allePartnerPositionenErledigt(
  positionen: Array<Pick<PartnerAuftragPosition, "handwerker_status">>
): boolean {
  if (!positionen.length) return false;
  return positionen.every((p) => positionHandwerkerErledigt(p.handwerker_status));
}

/** Positionen, die bei Abnahme final auf erledigt gesetzt werden. */
export function partnerAbnahmeZielPositionen(
  positionen: Array<
    Pick<
      PartnerAuftragPosition,
      "id" | "leistung_name" | "handwerker_status" | "leistung_status" | "aenderung_typ" | "handwerker_id"
    >
  >
): Array<{ id: string; leistung_name: string | null }> {
  return positionen
    .filter((p) => positionIstHandwerkerZugewiesen(p.handwerker_status))
    .filter((p) => !positionBrauchtVorgangAktion(p))
    .filter(
      (p) =>
        !positionHandwerkerErledigt(p.handwerker_status) ||
        leistungDokumentiert(p)
    )
    .map((p) => ({
      id: String(p.id),
      leistung_name: (p.leistung_name as string | null) ?? null,
    }));
}
