import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";
import {
  positionBrauchtVorgangAktion,
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

type AbschlussCtaInput = {
  positionen: Array<
    Pick<
      PartnerAuftragPosition,
      | "handwerker_status"
      | "aenderung_typ"
      | "leistung_status"
      | "handwerker_id"
      | "anerkennung_status"
    >
  >;
  vorgangState?: VorgangState;
  auftragStatus: string;
  /** Partner hat „Auftrag erledigt“ gemeldet (ohne Abnahme). */
  hwErledigtGemeldetAm?: string | null;
  /** Legacy: alte Teilabnahme-Signatur — gilt weiterhin als erledigt. */
  hwAbschlussSigniertAm?: string | null;
  abnahmeProtokollUrl?: string | null;
  abnahmeFreigabeStatus?: string | null;
};

/** Eigene Positionen, die für den Abschluss zählen (ohne Nacharbeit in Prüfung). */
export function partnerAbschlussRelevantePositionen(
  positionen: AbschlussCtaInput["positionen"]
): AbschlussCtaInput["positionen"] {
  return positionen.filter((p) => {
    const a = String(p.anerkennung_status ?? "nicht_noetig").toLowerCase();
    if (a === "in_pruefung" || a === "abgelehnt") return false;
    return (
      positionIstHandwerkerZugewiesen(p.handwerker_status) &&
      !positionBrauchtVorgangAktion(p)
    );
  });
}

function partnerHatErledigtGemeldet(input: AbschlussCtaInput): boolean {
  if (input.hwErledigtGemeldetAm?.trim()) return true;
  if (input.hwAbschlussSigniertAm?.trim()) return true;
  return false;
}

/**
 * CTA „Auftrag erledigt“ anzeigen, solange der Partner noch nicht gemeldet hat
 * und der Auftrag in Ausführung ist.
 */
export function partnerZeigtAbschlussCta(input: AbschlussCtaInput): boolean {
  if (isVorgangAuftragErledigt(input.auftragStatus)) return false;
  if (partnerHatErledigtGemeldet(input)) return false;
  if (input.vorgangState !== "in_bearbeitung") return false;
  if (!input.positionen.length) return false;
  if (input.positionen.some(positionBrauchtVorgangAktion)) return false;
  return partnerAbschlussRelevantePositionen(input.positionen).length > 0;
}

/**
 * CTA aktiv, wenn alle eigenen Leistungen dokumentiert (`leistung_status=erledigt`).
 * Keine Abnahme mehr — nur Erledigt-Meldung.
 */
export function partnerKannErledigtMelden(input: AbschlussCtaInput): boolean {
  if (!partnerZeigtAbschlussCta(input)) return false;
  const relevant = partnerAbschlussRelevantePositionen(input.positionen);
  return relevant.every((p) => leistungDokumentiert(p));
}

export function allePartnerPositionenErledigt(
  positionen: Array<Pick<PartnerAuftragPosition, "handwerker_status">>
): boolean {
  if (!positionen.length) return false;
  return positionen.every((p) => positionHandwerkerErledigt(p.handwerker_status));
}

/** Positionen, die bei Erledigt-Meldung final auf erledigt gesetzt werden. */
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
