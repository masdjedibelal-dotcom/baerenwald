import { logDbError } from '@/lib/errors/log-db-error';
import { canOrgFreigabe } from "@/lib/org/org-rbac";
import type { OrgSessionResult } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export async function assertOrgObjekt(kundeId: string, objektId: string) {
  const {data, error: __dbErr268_1} = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, kunde_id, titel")
    .eq("id", objektId)
    .eq("kunde_id", kundeId)
    .maybeSingle();
  if (__dbErr268_1) logDbError('lib/org/assert-org-objekt:kunden_objekte', __dbErr268_1)
  return data;
}

export async function assertOrgLead(kundeId: string, leadId: string) {
  const {data, error: __dbErr270_3} = await supabaseAdmin
    .from("leads")
    .select("id, kunde_objekt_id, auftraggeber_kunde_id")
    .eq("id", leadId)
    .maybeSingle();
  if (__dbErr270_3) logDbError('lib/org/assert-org-objekt:leads', __dbErr270_3)
  if (!data || data.auftraggeber_kunde_id !== kundeId) return null;
  return data;
}

export function requireOrgWrite(session: Extract<OrgSessionResult, { ok: true }>) {
  if (!canOrgFreigabe(session.rolle)) {
    return { ok: false as const, status: 403, error: "Keine Berechtigung für diese Aktion." };
  }
  return { ok: true as const };
}
