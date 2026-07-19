import { notifyHvMieterEvent } from "@/lib/org/notify-hv-mieter-event";
import {
  mieterStatusLabel,
  resolveMieterStatusStufe,
  type MieterStatusStufe,
} from "@/lib/vorgang/vorgang-phase";
import { MIETER_EMAIL_ENABLED } from "@/lib/melde/mieter-mail-policy";
import { supabaseAdmin } from "@/lib/supabase";

const MAIL_STUFEN = new Set<MieterStatusStufe>(["beauftragt", "erledigt"]);

/** Statuswechsel Beauftragt/Erledigt — HV statt Mieter (Standard). */
export async function notifyMieterStatusChange(leadId: string): Promise<void> {
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, melder_name, hv_meldung_status, vorgang_phase, org_freigabe_status, kunde_objekt_id, auftraggeber_kunde_id"
    )
    .eq("id", leadId)
    .maybeSingle();

  if (!lead?.auftraggeber_kunde_id) return;

  const stufe = resolveMieterStatusStufe(lead);
  if (!MAIL_STUFEN.has(stufe)) return;

  if (MIETER_EMAIL_ENABLED) {
    // Legacy-Pfad: buildMelderBestaetigungHtml — siehe Git-Historie / meldung-mail-templates.ts
    return;
  }

  const label = mieterStatusLabel(stufe);
  const melder = lead.melder_name ? String(lead.melder_name) : "Mieter";

  await notifyHvMieterEvent({
    leadId,
    typ: "status_change",
    titel: `Meldung: ${label}`,
    body: `Der Vorgang für ${melder} ist jetzt „${label}“. Bitte informieren Sie den Mieter bei Bedarf und geben Sie den Status-Link weiter.`,
  });
}

/** Setzt kanonische Phase und triggert HV-Benachrichtigung. */
export async function setLeadVorgangPhase(
  leadId: string,
  phase: string
): Promise<void> {
  await supabaseAdmin
    .from("leads")
    .update({ vorgang_phase: phase, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  await notifyMieterStatusChange(leadId);
}
