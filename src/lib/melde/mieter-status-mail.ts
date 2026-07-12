import { buildMelderBestaetigungHtml } from "@/lib/email/meldung-mail-templates";
import { AUTOMATED_CUSTOMER_EMAIL_BCC } from "@/lib/email/resend-bcc";
import { meldeStatusUrl } from "@/lib/melde/melde-tracking";
import {
  mieterStatusLabel,
  resolveMieterStatusStufe,
  type MieterStatusStufe,
} from "@/lib/vorgang/vorgang-phase";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";
import { Resend } from "resend";

const MAIL_STUFEN = new Set<MieterStatusStufe>(["beauftragt", "erledigt"]);

/** A5 — Mieter-Mail bei Statuswechsel Beauftragt/Erledigt. */
export async function notifyMieterStatusChange(leadId: string): Promise<void> {
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, melder_email, melder_name, melde_tracking_token, hv_meldung_status, vorgang_phase, org_freigabe_status, kunde_objekt_id, auftraggeber_kunde_id"
    )
    .eq("id", leadId)
    .maybeSingle();

  if (!lead?.melder_email || !isValidEmail(String(lead.melder_email))) return;

  const stufe = resolveMieterStatusStufe(lead);
  if (!MAIL_STUFEN.has(stufe)) return;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  let objektTitel = "Objekt";
  if (lead.kunde_objekt_id) {
    const { data: obj } = await supabaseAdmin
      .from("kunden_objekte")
      .select("titel")
      .eq("id", lead.kunde_objekt_id)
      .maybeSingle();
    objektTitel = String(obj?.titel ?? "Objekt");
  }

  let orgName = "Hausverwaltung";
  if (lead.auftraggeber_kunde_id) {
    const { data: org } = await supabaseAdmin
      .from("kunden")
      .select("name, org_anzeigename")
      .eq("id", lead.auftraggeber_kunde_id)
      .maybeSingle();
    orgName = String(org?.org_anzeigename ?? org?.name ?? "Hausverwaltung");
  }

  const token = lead.melde_tracking_token ? String(lead.melde_tracking_token) : null;
  const statusLink = token ? meldeStatusUrl(token) : undefined;
  const label = mieterStatusLabel(stufe);

  const resend = new Resend(resendKey);
  const subjectPrefix = orgName && orgName !== "Hausverwaltung" ? `[${orgName}] ` : "";
  await resend.emails.send({
    from:
      process.env.RESEND_FROM_CUSTOMER ??
      "Bärenwald München <anfragen@baerenwaldmuenchen.de>",
    to: String(lead.melder_email).toLowerCase(),
    bcc: AUTOMATED_CUSTOMER_EMAIL_BCC,
    subject: `${subjectPrefix}Meldung: ${label} — ${objektTitel}`,
    html: buildMelderBestaetigungHtml({
      melderName: String(lead.melder_name ?? "Mieter"),
      orgName,
      objektTitel,
      kategorie: label,
      referenz: String(lead.id).slice(0, 8).toUpperCase(),
      statusLink,
      introNote: `Ihre Hausverwaltung ${orgName} bearbeitet die Meldung über Bärenwald.`,
    }),
  });
}

/** Setzt kanonische Phase und triggert Mieter-Mail. */
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
