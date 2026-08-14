/**
 * HV selbst angelegt: Start-Freigabe überspringen, CRM sofort informieren.
 * Bei Akut/Direktauftrag zusätzlich Bypass-Flag (wie Mieter-Melde).
 */

import { leadIstMeldeDirektauftrag } from "@/lib/funnel/melde-direktauftrag";
import { notifyCrmOrgPortal } from "@/lib/org/notify-crm-org";
import { effektiveNotfallDirekt } from "@/lib/org/org-direktauftrag";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Nach Persist einer Org-/HV-eigenen Anfrage:
 * - `hv_meldung_status = angebot_eingefordert` (kein Freigeben/Ablehnen am Start)
 * - bei Akut: `freigabe_bypass_grund = akut` (wenn Org/Objekt Sofortmaßnahme erlaubt)
 * - CRM-Notify „Angebot erstellen“
 */
export async function finalizeOrgSelfCreatedLead(
  leadId: string
): Promise<void> {
  const id = leadId.trim();
  if (!id) return;

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, erfassung_von, hv_meldung_status, anlass, funnel_daten, freigabe_bypass_grund, auftraggeber_kunde_id, kunde_objekt_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (!lead) return;
  if (String(lead.erfassung_von ?? "").toLowerCase() !== "organisation") return;

  const status = (lead.hv_meldung_status ?? "").trim().toLowerCase();
  const anlass = String(lead.anlass ?? "").toLowerCase();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  let shouldUpdate = false;

  // Nur Meldungs-Startpfad: neu → angebot_eingefordert
  if (anlass === "meldung" && (status === "neu" || status === "")) {
    patch.hv_meldung_status = "angebot_eingefordert";
    shouldUpdate = true;
  }

  if (anlass === "meldung" && leadIstMeldeDirektauftrag(lead)) {
    let notfallDirektAktiv = true;
    const kundeId = String(lead.auftraggeber_kunde_id ?? "").trim();
    const objektId = String(lead.kunde_objekt_id ?? "").trim();
    if (kundeId) {
      const { data: org } = await supabaseAdmin
        .from("kunden")
        .select("notfall_direkt")
        .eq("id", kundeId)
        .maybeSingle();
      let objektRule: { notfall_direkt: boolean | null } | null = null;
      if (objektId) {
        const { data: obj } = await supabaseAdmin
          .from("kunden_objekte")
          .select("notfall_direkt")
          .eq("id", objektId)
          .maybeSingle();
        if (obj) {
          objektRule = {
            notfall_direkt:
              obj.notfall_direkt == null ? null : Boolean(obj.notfall_direkt),
          };
        }
      }
      notfallDirektAktiv = effektiveNotfallDirekt(
        { notfall_direkt: org?.notfall_direkt !== false },
        objektRule
      );
    }
    if (notfallDirektAktiv) {
      patch.freigabe_bypass_grund = "akut";
      patch.org_freigabe_status = "nicht_noetig";
      shouldUpdate = true;
    }
  }

  if (shouldUpdate) {
    await supabaseAdmin.from("leads").update(patch).eq("id", id);
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
