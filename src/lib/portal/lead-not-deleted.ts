/**
 * Shared-DB: Soft-gelöschte Leads aus Portal-Queries ausblenden.
 * CRM setzt `leads.geloescht_am` oder löscht den Lead (Kinder können als Geister bleiben).
 */

import { supabaseAdmin } from "@/lib/supabase";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeVorgangRef(raw: string | null | undefined): string | null {
  const id = String(raw ?? "")
    .trim()
    .replace(/^auftrag:/i, "");
  return UUID_RE.test(id) ? id : null;
}

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

/**
 * IDs, die in Portalen noch sichtbar sein dürfen:
 * Lead (nicht geloescht_am) oder Auftrag / angebot_handwerker mit aktivem Lead.
 * Hard-gelöschte CRM-Vorgänge (Lead weg, lead_id NULL) fallen raus.
 */
export async function filterActiveVorgangEntityIds(
  refs: string[]
): Promise<Set<string>> {
  const unique = Array.from(
    new Set(
      refs.map((r) => normalizeVorgangRef(r)).filter((id): id is string => Boolean(id))
    )
  );
  if (!unique.length) return new Set();

  const active = await filterActiveLeadIds(unique);
  const rest = unique.filter((id) => !active.has(id));
  if (!rest.length) return active;

  const [{ data: aufs }, { data: ahs }] = await Promise.all([
    supabaseAdmin.from("auftraege").select("id, lead_id").in("id", rest),
    supabaseAdmin.from("angebot_handwerker").select("id, angebot_id").in("id", rest),
  ]);

  const extraLeadIds: string[] = [];
  const auftragToLead = new Map<string, string>();
  for (const a of aufs ?? []) {
    const lid = String((a as { lead_id?: string | null }).lead_id ?? "").trim();
    if (!lid) continue;
    extraLeadIds.push(lid);
    auftragToLead.set(String((a as { id: string }).id), lid);
  }

  const ahToAngebot = new Map<string, string>();
  const angebotIds: string[] = [];
  for (const ah of ahs ?? []) {
    const angId = String((ah as { angebot_id?: string | null }).angebot_id ?? "").trim();
    if (!angId) continue;
    angebotIds.push(angId);
    ahToAngebot.set(String((ah as { id: string }).id), angId);
  }

  const angebotToLead = new Map<string, string>();
  if (angebotIds.length) {
    const { data: angs } = await supabaseAdmin
      .from("angebote")
      .select("id, lead_id")
      .in("id", angebotIds);
    for (const a of angs ?? []) {
      const lid = String((a as { lead_id?: string | null }).lead_id ?? "").trim();
      if (!lid) continue;
      extraLeadIds.push(lid);
      angebotToLead.set(String((a as { id: string }).id), lid);
    }
  }

  const activeLeads = await filterActiveLeadIds(extraLeadIds);
  for (const [aid, lid] of Array.from(auftragToLead.entries())) {
    if (activeLeads.has(lid)) active.add(aid);
  }
  for (const [ahId, angId] of Array.from(ahToAngebot.entries())) {
    const lid = angebotToLead.get(angId);
    if (lid && activeLeads.has(lid)) active.add(ahId);
  }
  return active;
}
