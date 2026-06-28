import type { PartnerAnfrageItem, PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import {
  isPartnerAngebotAktionErforderlich,
  isPartnerAngebotListItemOffen,
} from "@/lib/partner/partner-angebot-portal-status";
import { isAuftragAbgeschlossen } from "@/lib/partner/handwerker-bewertung-display";
import {
  isPartnerAnfrageAktionErforderlich,
  isPartnerAnfrageOffen,
  isPartnerAuftragAnfrageAktionErforderlich,
  isPartnerAuftragAnfrageOffen,
} from "@/lib/partner/partner-anfrage-status";

export type PartnerListFilterId = "offen" | "geschlossen";

/** Filter in „Meine Aufträge“: In Bearbeitung | Erledigt (nicht „Offen“ — das ist Tab Offen). */
export type PartnerAuftragListFilterId = "aktiv" | "erledigt";

export const PARTNER_AUFTRAG_LIST_FILTER_LABELS: Record<
  PartnerAuftragListFilterId,
  string
> = {
  aktiv: "In Bearbeitung",
  erledigt: "Erledigt",
};

export function partnerAuftragListFilterToLegacy(
  filter: PartnerAuftragListFilterId
): PartnerListFilterId {
  return filter === "aktiv" ? "offen" : "geschlossen";
}

export function partnerAuftragListFilterFromLegacy(
  filter: PartnerListFilterId
): PartnerAuftragListFilterId {
  return filter === "offen" ? "aktiv" : "erledigt";
}

export function filterPartnerAnfragenListen(
  anfragen: PartnerAnfrageItem[],
  auftragAnfragen: PartnerAuftragItem[],
  filter: PartnerListFilterId
): { anfragen: PartnerAnfrageItem[]; auftragAnfragen: PartnerAuftragItem[] } {
  const match = (offen: boolean) => (filter === "offen" ? offen : !offen);

  return {
    anfragen: anfragen.filter((a) => match(isPartnerAnfrageAktionErforderlich(a))),
    auftragAnfragen: auftragAnfragen.filter((a) =>
      match(isPartnerAuftragAnfrageAktionErforderlich(a))
    ),
  };
}

export { isPartnerAngebotListItemOffen, isPartnerAngebotAktionErforderlich };

export function isPartnerAuftragListItemAktiv(item: PartnerAuftragItem): boolean {
  const s = item.status.toLowerCase();
  if (s === "storniert") return false;
  if (isAuftragAbgeschlossen(item.status)) return false;
  if (item.fortschritt != null && item.fortschritt >= 100) return false;
  return true;
}

/** @deprecated Alias — gemeint ist „in Bearbeitung“, nicht Tab „Offen“. */
export const isPartnerAuftragListItemOffen = isPartnerAuftragListItemAktiv;

export function countPartnerAnfragenFilter(
  anfragen: PartnerAnfrageItem[],
  auftragAnfragen: PartnerAuftragItem[]
): Pick<Record<PartnerListFilterId, number>, "offen" | "geschlossen"> {
  const offen =
    anfragen.filter(isPartnerAnfrageAktionErforderlich).length +
    auftragAnfragen.filter(isPartnerAuftragAnfrageAktionErforderlich).length;
  const alle = anfragen.length + auftragAnfragen.length;
  return { offen, geschlossen: alle - offen };
}

export function countPartnerAngeboteFilter(
  angebote: PartnerAnfrageItem[]
): Pick<Record<PartnerListFilterId, number>, "offen" | "geschlossen"> {
  const offen = angebote.filter(isPartnerAngebotListItemOffen).length;
  const alle = angebote.length;
  return { offen, geschlossen: alle - offen };
}

export function countPartnerAuftraegeFilter(
  auftraege: PartnerAuftragItem[]
): Record<PartnerAuftragListFilterId, number> {
  const aktiv = auftraege.filter(isPartnerAuftragListItemAktiv).length;
  const alle = auftraege.length;
  return { aktiv, erledigt: alle - aktiv };
}
