/**
 * HV selbst angelegt: Start-Freigabe überspringen, CRM sofort informieren.
 */

import { notifyCrmOrgPortal } from "@/lib/org/notify-crm-org";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Nach Persist einer Org-/HV-eigenen Anfrage:
 * - `hv_meldung_status = angebot_eingefordert` (kein Freigeben/Ablehnen am Start)
 * - CRM-Notify „Angebot erstellen“
 */
export async function finalizeOrgSelfCreatedLead(
  leadId: string
): Promise<void> {
  const id = leadId.trim();
  if (!id) return;

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, erfassung_von, hv_meldung_status, anlass")
    .eq("id", id)
    .maybeSingle();

  if (!lead) return;
  if (String(lead.erfassung_von ?? "").toLowerCase() !== "organisation") return;

  const status = (lead.hv_meldung_status ?? "").trim().toLowerCase();
  const anlass = String(lead.anlass ?? "").toLowerCase();
  // Nur Meldungs-Startpfad: neu → angebot_eingefordert
  if (anlass === "meldung" && (status === "neu" || status === "")) {
    await supabaseAdmin
      .from("leads")
      .update({
        hv_meldung_status: "angebot_eingefordert",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  const crmNotify = await notifyCrmOrgPortal({ leadId: id, typ: "meldung" });
  if (!crmNotify.ok) {
    console.warn(
      "[finalizeOrgSelfCreatedLead] CRM-Notify fehlgeschlagen:",
      crmNotify.error,
      { leadId: id, skipped: crmNotify.skipped === true }
    );
  }
}
