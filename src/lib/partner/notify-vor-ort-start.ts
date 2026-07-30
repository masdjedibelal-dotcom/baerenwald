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
  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id, titel, lead_id")
    .eq("id", input.auftragId)
    .maybeSingle();
  if (!auftrag?.lead_id) return;

  const { data: hw } = await supabaseAdmin
    .from("handwerker")
    .select("name")
    .eq("id", input.handwerkerId)
    .maybeSingle();
  const handwerkerName = String(hw?.name ?? "Handwerker").trim() || "Handwerker";
  const auftragTitel = String(auftrag.titel ?? "Auftrag").trim() || "Auftrag";
  const leistung = input.leistungName?.trim() || "Leistung";

  // Mieter-STG: eigener Schritt „Handwerker vor Ort“
  await supabaseAdmin
    .from("leads")
    .update({
      vorgang_phase: "beauftragt",
      mieter_vor_ort_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", auftrag.lead_id);

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
      titel: "Handwerker vor Ort",
      body: `${handwerkerName} hat die Ankunft zu „${auftragTitel}“ bestätigt. Der Mieter sieht den Schritt auf dem Status-Link — bitte bei Bedarf weitergeben.`,
    });
  }
}
