import { buildMelderBestaetigungHtml } from "@/lib/email/meldung-mail-templates";
import { AUTOMATED_CUSTOMER_EMAIL_BCC } from "@/lib/email/resend-bcc";
import { meldeStatusUrl } from "@/lib/melde/melde-tracking";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";
import { Resend } from "resend";

/** Mieter-Mail: neuer Bautagebuch-Eintrag am Vorgang. */
export async function notifyMieterBautagebuchEintrag(input: {
  leadId: string;
  handwerkerName: string;
  eintragTitel: string;
  auftragTitel: string;
}): Promise<void> {
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, melder_email, melder_name, melde_tracking_token, kunde_objekt_id, auftraggeber_kunde_id, anlass"
    )
    .eq("id", input.leadId)
    .maybeSingle();

  if (!lead?.melder_email || !isValidEmail(String(lead.melder_email))) return;

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
  const referenz = String(lead.id).slice(0, 8).toUpperCase();
  const subjectPrefix =
    orgName && orgName !== "Hausverwaltung" ? `[${orgName}] ` : "";

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from:
      process.env.RESEND_FROM_CUSTOMER ??
      "Bärenwald München <anfragen@baerenwaldmuenchen.de>",
    to: String(lead.melder_email).toLowerCase(),
    bcc: AUTOMATED_CUSTOMER_EMAIL_BCC,
    subject: `${subjectPrefix}Neuer Fortschritt — ${objektTitel}`,
    html: buildMelderBestaetigungHtml({
      melderName: String(lead.melder_name ?? "Mieter"),
      orgName,
      objektTitel,
      kategorie: "Bautagebuch",
      referenz,
      statusLink,
      introNote: `${input.handwerkerName} hat einen Bautagebuch-Eintrag zu „${input.auftragTitel}“ veröffentlicht: ${input.eintragTitel}. Sie können den Fortschritt direkt einsehen.`,
    }),
  });
}
