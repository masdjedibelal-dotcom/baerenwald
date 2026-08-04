import { supabaseAdmin } from "@/lib/supabase";

/** Prüft, ob der eingeloggte Kunde Zugriff auf den Auftrag hat. */
export async function auftragGehoertKunde(
  auftragId: string,
  kundeId: string
): Promise<boolean> {
  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id, kunde_id, lead_id")
    .eq("id", auftragId)
    .maybeSingle();

  if (!auftrag) return false;
  if (auftrag.kunde_id != null && String(auftrag.kunde_id) === kundeId) {
    return true;
  }

  const leadId = auftrag.lead_id != null ? String(auftrag.lead_id) : null;
  if (!leadId) return false;

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("kunde_id")
    .eq("id", leadId)
    .maybeSingle();

  return lead?.kunde_id != null && String(lead.kunde_id) === kundeId;
}
