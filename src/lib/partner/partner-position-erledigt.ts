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
  /** Eigene HW-Teilabnahme-Signatur (nicht global am Auftrag). */
  hwAbschlussSigniertAm?: string | null;
  abnahmeProtokollUrl?: string | null;
  /** CRM-Freigabe der eigenen Teilabnahme. */
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

/**
 * CTA „Abschließen“ anzeigen (auch ausgegraut), solange der Auftrag
 * noch nicht final abgenommen ist und der HW in Ausführung ist.
 */
export function partnerZeigtAbschlussCta(input: AbschlussCtaInput): boolean {
  if (isVorgangAuftragErledigt(input.auftragStatus)) return false;
  const freigabe = String(input.abnahmeFreigabeStatus ?? "")
    .trim()
    .toLowerCase();
  const eigeneSigniert = Boolean(input.hwAbschlussSigniertAm?.trim());
  const erneutNachAblehnung = freigabe === "abgelehnt";
  if (eigeneSigniert && !erneutNachAblehnung) return false;
  // Globaler abnahme_protokoll_url darf andere HWs nicht blockieren.
  if (input.vorgangState !== "in_bearbeitung") return false;
  if (!input.positionen.length) return false;
  if (input.positionen.some(positionBrauchtVorgangAktion)) return false;
  return partnerAbschlussRelevantePositionen(input.positionen).length > 0;
}

/**
 * F1 — CTA „Auftrag abschließen“ bleibt bis eigene Teilabnahme.
 * Position-Ende dokumentiert nur die Leistung (leistung_status), setzt nicht
 * handwerker_status=erledigt. Abnahme setzt den finalen Status.
 *
 * Signatur ist pro Handwerker (`auftrag_handwerker.abnahme_signiert_am`).
 * Nach CRM-Ablehnung darf erneut eingereicht werden.
 */
export function partnerKannErledigtMelden(input: AbschlussCtaInput): boolean {
  if (!partnerZeigtAbschlussCta(input)) return false;
  // Alle eigenen zugewiesenen Positionen müssen dokumentiert sein.
  const relevant = partnerAbschlussRelevantePositionen(input.positionen);
  return relevant.every((p) => leistungDokumentiert(p));
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
