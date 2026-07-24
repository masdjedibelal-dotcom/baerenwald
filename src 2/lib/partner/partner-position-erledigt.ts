import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";
import {
  positionBrauchtVorgangAktion,
  positionHandwerkerAbgeschlossen,
  positionHandwerkerErledigt,
} from "@/lib/partner/partner-konditionen";
import {
  isVorgangAuftragErledigt,
  type VorgangState,
} from "@/lib/partner/vorgang-state";

export { positionHandwerkerErledigt } from "@/lib/partner/partner-konditionen";

/** Partner kann Leistungen als erledigt melden. */
export function partnerKannErledigtMelden(input: {
  positionen: Array<
    Pick<PartnerAuftragPosition, "handwerker_status" | "aenderung_typ">
  >;
  vorgangState?: VorgangState;
  auftragStatus: string;
}): boolean {
  if (isVorgangAuftragErledigt(input.auftragStatus)) return false;
  if (input.vorgangState !== "in_bearbeitung") return false;
  if (!input.positionen.length) return false;
  if (allePartnerPositionenErledigt(input.positionen)) return false;
  if (input.positionen.some(positionBrauchtVorgangAktion)) return false;
  return input.positionen.some(
    (p) =>
      positionHandwerkerAbgeschlossen(p.handwerker_status) &&
      !positionHandwerkerErledigt(p.handwerker_status)
  );
}

export function allePartnerPositionenErledigt(
  positionen: Array<Pick<PartnerAuftragPosition, "handwerker_status">>
): boolean {
  if (!positionen.length) return false;
  return positionen.every((p) => positionHandwerkerErledigt(p.handwerker_status));
}
