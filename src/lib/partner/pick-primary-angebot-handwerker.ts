import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";

const HW_STATUS_RANK: Record<string, number> = {
  uebernommen: 0,
  bestaetigt: 1,
  eingereicht: 2,
  rueckfrage: 3,
  abgelehnt: 4,
};

function hwStatusRank(hw: string | null | undefined): number {
  return HW_STATUS_RANK[(hw ?? "").toLowerCase()] ?? 99;
}

/** Bevorzugt die Zeile mit abgeschlossener Preiseinigung (uebernommen). */
export function pickPrimaryAngebotHandwerkerAnfrage(
  anfragen: PartnerAnfrageItem[]
): PartnerAnfrageItem | undefined {
  if (!anfragen.length) return undefined;
  return [...anfragen].sort(
    (a, b) => hwStatusRank(a.hw_status) - hwStatusRank(b.hw_status)
  )[0];
}
