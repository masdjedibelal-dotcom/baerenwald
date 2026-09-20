import { logDbError } from '@/lib/errors/log-db-error'
import { notifyHvMieterEvent } from "@/lib/org/notify-hv-mieter-event";
import {
  MELDE_NOTIF_COPY,
  formatMeldeNotifTitel,
} from "@/lib/org/melde-vorgang-titel";
import { notifyPortalLeadUser } from "@/lib/portal/notify-portal-lead-user";
import {
  mieterStatusLabel,
  resolveMieterStatusStufe,
  type MieterStatusStufe,
} from "@/lib/vorgang/vorgang-phase";
import { MIETER_EMAIL_ENABLED } from "@/lib/melde/mieter-mail-policy";
import { supabaseAdmin } from "@/lib/supabase";

const MAIL_STUFEN = new Set<MieterStatusStufe>(["beauftragt", "erledigt"]);

/** Statuswechsel Beauftragt/Erledigt — HV + Portal-Glocke für verknüpften Kunden. */
export async function notifyMieterStatusChange(leadId: string): Promise<void> {
  const {data: lead, error: __dbErr266_1} = await supabaseAdmin
    .from("leads")
    .select(
      "id, melder_name, hv_meldung_status, vorgang_phase, org_freigabe_status, kunde_objekt_id, auftraggeber_kunde_id"
    )
    .eq("id", leadId)
    .maybeSingle();
  if (__dbErr266_1) logDbError('lib/melde/mieter-status-mail:leads', __dbErr266_1)
  if (!lead) return;

  const stufe = resolveMieterStatusStufe(lead);
  if (!MAIL_STUFEN.has(stufe)) return;

  if (MIETER_EMAIL_ENABLED) {
    // Legacy-Pfad: buildMelderBestaetigungHtml — siehe Git-Historie / meldung-mail-templates.ts
    return;
  }

  const label = mieterStatusLabel(stufe);
  const melder = lead.melder_name ? String(lead.melder_name) : "Mieter";

  if (lead.auftraggeber_kunde_id) {
    await notifyHvMieterEvent({
      leadId,
      typ: "status_change",
      titel: `Meldung: ${label}`,
      body: `Der Vorgang für ${melder} ist jetzt „${label}“. Bitte informieren Sie den Mieter bei Bedarf und geben Sie den Status-Link weiter.`,
    });
  }

  const portalTitel = formatMeldeNotifTitel(MELDE_NOTIF_COPY.statusWechsel, {
    titel: label,
  });
  await notifyPortalLeadUser({
    leadId,
    typ: "status",
    titel: portalTitel,
    text: `Ihr Vorgang ist jetzt „${label}“.`,
    deepLinkTab: "uebersicht",
  });

  const { notifyPortalEigentuemer } = await import(
    "@/lib/portal/notify-portal-eigentuemer"
  );
  const abgeschlossen = stufe === "erledigt";
  await notifyPortalEigentuemer({
    leadId,
    kind: abgeschlossen ? "abgeschlossen" : "update",
    titel: abgeschlossen
      ? formatMeldeNotifTitel(MELDE_NOTIF_COPY.partnerErledigt, {
          titel: label,
        })
      : portalTitel,
    text: abgeschlossen
      ? `Der Vorgang für ${melder} wurde abgeschlossen.`
      : `Update: Der Vorgang für ${melder} ist jetzt „${label}“.`,
    deepLinkTab: "uebersicht",
    kundeObjektId:
      lead.kunde_objekt_id != null ? String(lead.kunde_objekt_id) : null,
  });
}

/** Setzt kanonische Phase und triggert HV-Benachrichtigung. */
export async function setLeadVorgangPhase(
  leadId: string,
  phase: string
): Promise<void> {
  const { error: __dbErr267_2 } = await supabaseAdmin
    .from("leads")
    .update({ vorgang_phase: phase, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (__dbErr267_2) logDbError('lib/melde/mieter-status-mail:leads', __dbErr267_2)
  await notifyMieterStatusChange(leadId);
}
