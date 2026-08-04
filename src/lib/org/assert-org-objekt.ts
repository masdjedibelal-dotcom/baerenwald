import { canOrgFreigabe } from "@/lib/org/org-rbac";
import type { OrgSessionResult } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export async function assertOrgObjekt(kundeId: string, objektId: string) {
  const { data } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, kunde_id, titel")
    .eq("id", objektId)
    .eq("kunde_id", kundeId)
    .maybeSingle();
  return data;
}

export async function assertOrgEinheit(kundeId: string, einheitId: string) {
  const { data: einheit } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id, kunde_objekt_id, bezeichnung")
    .eq("id", einheitId)
    .maybeSingle();

  if (!einheit?.kunde_objekt_id) return null;
  const obj = await assertOrgObjekt(kundeId, einheit.kunde_objekt_id);
  if (!obj) return null;
  return einheit;
}

export async function assertOrgLead(kundeId: string, leadId: string) {
  const { data } = await supabaseAdmin
    .from("leads")
    .select("id, kunde_objekt_id, auftraggeber_kunde_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!data || data.auftraggeber_kunde_id !== kundeId) return null;
  return data;
}

export function requireOrgWrite(session: Extract<OrgSessionResult, { ok: true }>) {
  if (!canOrgFreigabe(session.rolle)) {
    return { ok: false as const, status: 403, error: "Keine Berechtigung für diese Aktion." };
  }
  return { ok: true as const };
}
