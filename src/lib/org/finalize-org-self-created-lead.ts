/**
 * Nach Persist einer Org-/HV-eigenen Anfrage.
 *
 * Start bleibt wie Mieter-Meldung bei `hv_meldung_status = neu`, damit HV
 * Ablehnen / Hausmeister / Direkt Bärenwald wählen kann.
 * Nur Akut/Direktauftrag setzt Bypass-Flags (CRM-Notify erst nach HV-Aktion
 * bzw. über Melde-Persist bei Sofortmaßnahme).
 */

import { leadIstMeldeDirektauftrag } from "@/lib/funnel/melde-direktauftrag";
import { effektiveNotfallDirekt } from "@/lib/org/org-direktauftrag";
import { normalizeAkutFallIds } from "@/lib/org/sofortmassnahme-faelle";
import { supabaseAdmin } from "@/lib/supabase";

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

  const anlass = String(lead.anlass ?? "").toLowerCase();
  if (anlass !== "meldung") return;

  if (!leadIstMeldeDirektauftrag(lead)) return;

  let notfallDirektAktiv = true;
  const kundeId = String(lead.auftraggeber_kunde_id ?? "").trim();
  const objektId = String(lead.kunde_objekt_id ?? "").trim();
  if (kundeId) {
    const { data: org } = await supabaseAdmin
      .from("kunden")
      .select("notfall_direkt, akut_fall_ids")
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
    const allowed = normalizeAkutFallIds(
      (org as { akut_fall_ids?: unknown } | null)?.akut_fall_ids
    );
    if (!allowed.length) {
      notfallDirektAktiv = false;
    }
  }

  if (!notfallDirektAktiv) return;

  await supabaseAdmin
    .from("leads")
    .update({
      freigabe_bypass_grund: "akut",
      org_freigabe_status: "nicht_noetig",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}
