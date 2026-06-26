import type { PartnerAnfrageItem, PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import { isAuftragAbgeschlossen } from "@/lib/partner/handwerker-bewertung-display";
import {
  isPartnerAnfrageOffen,
  isPartnerAuftragAnfrageOffen,
} from "@/lib/partner/partner-anfrage-status";

export type PartnerListFilterId = "alle" | "offen" | "geschlossen";

export function filterPartnerAnfragenListen(
  anfragen: PartnerAnfrageItem[],
  auftragAnfragen: PartnerAuftragItem[],
  filter: PartnerListFilterId
): { anfragen: PartnerAnfrageItem[]; auftragAnfragen: PartnerAuftragItem[] } {
  if (filter === "alle") return { anfragen, auftragAnfragen };

  const match = (offen: boolean) => (filter === "offen" ? offen : !offen);

  return {
    anfragen: anfragen.filter((a) => match(isPartnerAnfrageOffen(a))),
    auftragAnfragen: auftragAnfragen.filter((a) =>
      match(isPartnerAuftragAnfrageOffen(a))
    ),
  };
}

/** HW muss noch handeln (Angebot einreichen, Vertrag bestätigen, …). */
export function isPartnerAngebotListItemOffen(item: PartnerAnfrageItem): boolean {
  const hwSt = (item.hw_status ?? "offen").toLowerCase();
  if (hwSt === "uebernommen") {
    return Boolean(item.projektvertrag_bereit && !item.projektvertrag_bestaetigt_am);
  }
  if (hwSt === "eingereicht") return false;
  return true;
}

export function isPartnerAuftragListItemOffen(item: PartnerAuftragItem): boolean {
  const s = item.status.toLowerCase();
  if (s === "storniert") return false;
  if (isAuftragAbgeschlossen(item.status)) return false;
  if (item.fortschritt != null && item.fortschritt >= 100) return false;
  return true;
}

export function countPartnerAnfragenFilter(
  anfragen: PartnerAnfrageItem[],
  auftragAnfragen: PartnerAuftragItem[]
): Record<PartnerListFilterId, number> {
  const offen =
    anfragen.filter(isPartnerAnfrageOffen).length +
    auftragAnfragen.filter(isPartnerAuftragAnfrageOffen).length;
  const alle = anfragen.length + auftragAnfragen.length;
  return { alle, offen, geschlossen: alle - offen };
}

export function countPartnerAngeboteFilter(
  angebote: PartnerAnfrageItem[]
): Record<PartnerListFilterId, number> {
  const offen = angebote.filter(isPartnerAngebotListItemOffen).length;
  const alle = angebote.length;
  return { alle, offen, geschlossen: alle - offen };
}

export function countPartnerAuftraegeFilter(
  auftraege: PartnerAuftragItem[]
): Record<PartnerListFilterId, number> {
  const offen = auftraege.filter(isPartnerAuftragListItemOffen).length;
  const alle = auftraege.length;
  return { alle, offen, geschlossen: alle - offen };
}
