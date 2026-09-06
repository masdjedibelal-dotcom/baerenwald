/**
 * Partner-Leistungs-Updates bleiben CRM-intern.
 * Kein Auto-Publish in die Kunden-Timeline — Tagebuch/Abnahme macht das CRM.
 */

import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export async function syncPartnerPositionEintragToKundeTimeline(_opts: {
  eintragId: string;
  auftragId: string;
  typ: string;
  titel?: string | null;
  beschreibung?: string | null;
  leistungName?: string | null;
  leistungNames?: string[] | null;
  handwerkerId?: string | null;
}): Promise<void> {
  // Absichtlich no-op: Updates nur im CRM unter Leistungen.
}

export async function syncPartnerFreiesBautagebuchToKundeTimeline(_opts: {
  auftragId: string;
  titel: string;
  beschreibung?: string | null;
  fotoPaths?: string[];
  handwerkerId?: string | null;
  bautagebuchEintragId?: string | null;
}): Promise<string | null> {
  // Absichtlich no-op — siehe syncPartnerPositionEintragToKundeTimeline.
  return null;
}

/** Offene CRM-BT-Anforderung als erledigt markieren. */
export async function markPartnerBautagebuchAnfrageErledigt(opts: {
  auftragId: string;
  handwerkerId: string;
  anfrageId?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const now = new Date().toISOString();
  let q = supabaseAdmin
    .from("partner_bautagebuch_anfragen")
    .update({ erledigt_at: now })
    .eq("auftrag_id", opts.auftragId)
    .eq("handwerker_id", opts.handwerkerId)
    .is("erledigt_at", null);

  if (opts.anfrageId?.trim()) {
    q = q.eq("id", opts.anfrageId.trim());
  }

  const { error } = await q;
  if (error) {
    console.warn("[markPartnerBautagebuchAnfrageErledigt]", error.message);
  }
}
