import type { PartnerAnfrageItem, PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import { isAuftragAbgeschlossen } from "@/lib/partner/handwerker-bewertung-display";
import {
  isPartnerAnfrageAktionErforderlich,
  isPartnerAnfrageOffen,
  isPartnerAuftragAnfrageAktionErforderlich,
  isPartnerAuftragAnfrageOffen,
} from "@/lib/partner/partner-anfrage-status";

export type PartnerListFilterId = "offen" | "geschlossen";

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

/** Offen in Angebote: HW hat bestätigt, CRM hat Auftrag noch nicht freigegeben (PDF/Vertrag möglich). */
export function isPartnerAngebotListItemOffen(item: PartnerAnfrageItem): boolean {
  const hwSt = (item.hw_status ?? "offen").toLowerCase();
  if (hwSt !== "uebernommen") return false;
  if (item.auftrag_status && item.auftrag_status.toLowerCase() !== "offen") return false;
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
): Pick<Record<PartnerListFilterId, number>, "offen" | "geschlossen"> {
  const offen = auftraege.filter(isPartnerAuftragListItemOffen).length;
  const alle = auftraege.length;
  return { offen, geschlossen: alle - offen };
}
