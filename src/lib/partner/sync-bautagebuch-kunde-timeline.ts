/**
 * Partner-Leistungs-/BT-Update → nur HV-Glocke (CRM).
 * Kundenportal bekommt keine HW-Updates — nur CRM-Bautagebuch.
 */

import { notifyHvPartnerBautagebuch } from "@/lib/org/notify-hv-bautagebuch";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export async function syncPartnerPositionEintragToKundeTimeline(opts: {
  eintragId: string;
  auftragId: string;
  typ: string;
  titel?: string | null;
  beschreibung?: string | null;
  leistungName?: string | null;
  leistungNames?: string[] | null;
  handwerkerId?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const typ = String(opts.typ ?? "").toLowerCase();
  if (typ === "weitere_arbeit") return;

  const auftragId = opts.auftragId.trim();
  if (!auftragId) return;

  const leistung =
    opts.leistungName?.trim() ||
    opts.leistungNames?.map((n) => n.trim()).filter(Boolean)[0] ||
    null;
  const eintragTitel =
    opts.titel?.trim() ||
    (leistung ? `Update — ${leistung}` : null) ||
    opts.beschreibung?.trim()?.split(/\n+/)[0]?.slice(0, 72) ||
    "Update";

  const { data: hw } = opts.handwerkerId
    ? await supabaseAdmin
        .from("handwerker")
        .select("name")
        .eq("id", opts.handwerkerId)
        .maybeSingle()
    : { data: null };

  const handwerkerName = String(hw?.name ?? "Partner").trim() || "Partner";

  try {
    await notifyHvPartnerBautagebuch({
      auftragId,
      handwerkerName,
      eintragTitel,
    });
  } catch (e) {
    console.warn("[syncPartnerPositionEintrag] HV-Notify:", e);
  }
}

/** @deprecated Alias — nur noch HV, kein Kunden-Feed. */
export const syncPartnerFreiesBautagebuchToKundeTimeline =
  syncPartnerFreiesBautagebuchToHv;

export async function syncPartnerFreiesBautagebuchToHv(opts: {
  auftragId: string;
  titel: string;
  beschreibung?: string | null;
  fotoPaths?: string[];
  handwerkerId?: string | null;
  bautagebuchEintragId?: string | null;
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const auftragId = opts.auftragId.trim();
  if (!auftragId) return null;

  const eintragTitel = opts.titel.trim() || "Update";

  const { data: hw } = opts.handwerkerId
    ? await supabaseAdmin
        .from("handwerker")
        .select("name")
        .eq("id", opts.handwerkerId)
        .maybeSingle()
    : { data: null };

  const handwerkerName = String(hw?.name ?? "Partner").trim() || "Partner";

  try {
    await notifyHvPartnerBautagebuch({
      auftragId,
      handwerkerName,
      eintragTitel,
    });
  } catch (e) {
    console.warn("[syncPartnerFreiesBautagebuch] HV-Notify:", e);
  }

  return opts.bautagebuchEintragId ?? null;
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
