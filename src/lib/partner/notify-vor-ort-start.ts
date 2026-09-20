import { logDbError } from '@/lib/errors/log-db-error'
import { notifyHvPartnerBautagebuch } from "@/lib/org/notify-hv-bautagebuch";
import { notifyHvMieterEvent } from "@/lib/org/notify-hv-mieter-event";
import { MIETER_EMAIL_ENABLED } from "@/lib/melde/mieter-mail-policy";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * B2: Vor-Ort-Start → HV-Glocke + Hinweis (kein Mieter-Mail, nur Status-Link).
 * Referenz: freies Bautagebuch-Notify-Muster.
 */
export async function notifyVorOrtStart(input: {
  auftragId: string;
  handwerkerId: string;
  leistungName?: string | null;
}): Promise<void> {
  const {data: auftrag, error: __dbErr410_1} = await supabaseAdmin
    .from("auftraege")
    .select("id, titel, lead_id")
    .eq("id", input.auftragId)
    .maybeSingle();
  if (__dbErr410_1) logDbError('lib/partner/notify-vor-ort-start:auftraege', __dbErr410_1)
  if (!auftrag?.lead_id) return;

  const {data: hw, error: __dbErr411_2} = await supabaseAdmin
    .from("handwerker")
    .select("name")
    .eq("id", input.handwerkerId)
    .maybeSingle();
  if (__dbErr411_2) logDbError('lib/partner/notify-vor-ort-start:handwerker', __dbErr411_2)
  const handwerkerName = String(hw?.name ?? "Partner").trim() || "Partner";
  const auftragTitel = String(auftrag.titel ?? "Auftrag").trim() || "Auftrag";
  const leistung = input.leistungName?.trim() || "Leistung";

  // Mieter-STG: eigener Schritt „Handwerker vor Ort“
  const { error: __dbErr412_3 } = await supabaseAdmin
    .from("leads")
    .update({
      vorgang_phase: "beauftragt",
      mieter_vor_ort_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", auftrag.lead_id);
  if (__dbErr412_3) logDbError('lib/partner/notify-vor-ort-start:leads', __dbErr412_3)
  await notifyHvPartnerBautagebuch({
    auftragId: input.auftragId,
    handwerkerName,
    eintragTitel: `Vor Ort — ${leistung}`,
  });

  // Eigentümer/HV: Status-Link für Mieter weitergeben (keine BW-Mail an Mieter)
  if (!MIETER_EMAIL_ENABLED) {
    await notifyHvMieterEvent({
      leadId: String(auftrag.lead_id),
      typ: "vor_ort",
      titel: "Partner vor Ort",
      body: `${handwerkerName} hat die Ankunft zu „${auftragTitel}“ bestätigt. Der Mieter sieht den Schritt auf dem Status-Link — bitte bei Bedarf weitergeben.`,
    });
  }
}
