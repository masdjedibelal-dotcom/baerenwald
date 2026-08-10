/**
 * Shared-DB: Soft-gelöschte Leads aus Portal-Queries ausblenden.
 * CRM setzt `leads.geloescht_am` — Portal und CRM teilen dieselbe Tabelle.
 */

import { supabaseAdmin } from "@/lib/supabase";

/** Query-Builder: nur nicht gelöschte Leads (mit Fallback, falls Spalte fehlt). */
export function withLeadNotDeleted<T extends { is: (col: string, val: null) => T }>(
  query: T
): T {
  return query.is("geloescht_am", null);
}

/**
 * Liefert Lead-IDs, die noch aktiv sind (nicht soft-gelöscht).
 * Leere Eingabe → leeres Set.
 */
export async function filterActiveLeadIds(
  leadIds: string[]
): Promise<Set<string>> {
  const ids = Array.from(
    new Set(leadIds.map((id) => String(id ?? "").trim()).filter(Boolean))
  );
  if (!ids.length) return new Set();

  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("id")
    .in("id", ids)
    .is("geloescht_am", null);

  if (error && /geloescht_am/i.test(error.message)) {
    const fallback = await supabaseAdmin.from("leads").select("id").in("id", ids);
    return new Set((fallback.data ?? []).map((r) => String(r.id)));
  }

  return new Set((data ?? []).map((r) => String(r.id)));
}

/** true = Lead ist soft-gelöscht oder existiert nicht. */
export async function isLeadSoftDeleted(leadId: string): Promise<boolean> {
  const id = leadId.trim();
  if (!id) return true;
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("id, geloescht_am")
    .eq("id", id)
    .maybeSingle();
  if (error && /geloescht_am/i.test(error.message)) {
    const fb = await supabaseAdmin.from("leads").select("id").eq("id", id).maybeSingle();
    return !fb.data?.id;
  }
  if (!data?.id) return true;
  return Boolean((data as { geloescht_am?: string | null }).geloescht_am);
}
