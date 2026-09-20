import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from "@/lib/supabase";

/** Prüft, ob der eingeloggte Kunde Zugriff auf den Auftrag hat. */
export async function auftragGehoertKunde(
  auftragId: string,
  kundeId: string
): Promise<boolean> {
  const {data: auftrag, error: __dbErr471_1} = await supabaseAdmin
    .from("auftraege")
    .select("id, kunde_id, lead_id")
    .eq("id", auftragId)
    .maybeSingle();
  if (__dbErr471_1) logDbError('lib/portal/portal-kunde-auth:auftraege', __dbErr471_1)
  if (!auftrag) return false;
  if (auftrag.kunde_id != null && String(auftrag.kunde_id) === kundeId) {
    return true;
  }

  const leadId = auftrag.lead_id != null ? String(auftrag.lead_id) : null;
  if (!leadId) return false;

  const {data: lead, error: __dbErr472_2} = await supabaseAdmin
    .from("leads")
    .select("kunde_id")
    .eq("id", leadId)
    .maybeSingle();
  if (__dbErr472_2) logDbError('lib/portal/portal-kunde-auth:leads', __dbErr472_2)
  return lead?.kunde_id != null && String(lead.kunde_id) === kundeId;
}
