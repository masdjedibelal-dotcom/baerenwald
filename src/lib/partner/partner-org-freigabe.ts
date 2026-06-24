export type OrgFreigabeLeadGate = {
  auftraggeber_kunde_id?: string | null;
  org_freigabe_status?: string | null;
};

/** Partner sieht Anfragen/Aufträge erst nach Org-Freigabe (oder wenn keine Org beteiligt). */
export function isPartnerBlockedByOrgFreigabe(
  lead: OrgFreigabeLeadGate | null | undefined
): boolean {
  if (!lead?.auftraggeber_kunde_id) return false;
  const status = lead.org_freigabe_status ?? "nicht_noetig";
  return status === "ausstehend" || status === "abgelehnt";
}

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

export function extractPartnerLeadGateFromAngebotHandwerkerRow(
  row: Record<string, unknown>
): OrgFreigabeLeadGate | null {
  const angebote = one(row.angebote) as { leads?: unknown } | null;
  return one(angebote?.leads) as OrgFreigabeLeadGate | null;
}

export function extractPartnerLeadGateFromAuftragRow(
  row: Record<string, unknown>
): OrgFreigabeLeadGate | null {
  return one(row.leads) as OrgFreigabeLeadGate | null;
}
