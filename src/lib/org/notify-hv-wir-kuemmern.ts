import { buildOrgWirKuemmernUnsHtml } from "@/lib/email/meldung-mail-templates";
import { sendBrandedMail } from "@/lib/email/send-branded-mail";
import { withPortalDetailDeepLink } from "@/lib/portal2/portal-detail-deep-link";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";
import { Resend } from "resend";

/**
 * Nach HV-Klick „Direkt Bärenwald“ / „Hausmeister“:
 * Bestätigung „Wir kümmern uns …“ — nicht die informative Direktauftrag-Mail
 * (die nur beim Bypass ohne Freigabe-Aktion Sinn ergibt).
 */
export async function notifyHvWirKuemmernUns(input: {
  leadId: string;
}): Promise<void> {
  const leadId = input.leadId.trim();
  if (!leadId) return;

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, auftraggeber_kunde_id, kunde_objekt_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead?.auftraggeber_kunde_id) return;

  const kundeId = String(lead.auftraggeber_kunde_id);
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const { data: orgKunde } = await supabaseAdmin
    .from("kunden")
    .select("email, name, org_anzeigename")
    .eq("id", kundeId)
    .maybeSingle();

  const orgEmail = String(orgKunde?.email ?? "").trim();
  if (!orgEmail || !isValidEmail(orgEmail)) return;

  let objektTitel = "Objekt";
  if (lead.kunde_objekt_id) {
    const { data: obj } = await supabaseAdmin
      .from("kunden_objekte")
      .select("titel")
      .eq("id", lead.kunde_objekt_id)
      .maybeSingle();
    objektTitel = String(obj?.titel ?? "Objekt");
  }

  const portalPath = withPortalDetailDeepLink(
    `/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}`,
    null
  );

  const resend = new Resend(resendKey);
  try {
    await sendBrandedMail(resend, {
      from:
        process.env.RESEND_FROM_SYSTEM ??
        "System <system@baerenwaldmuenchen.de>",
      to: orgEmail,
      subject: `Wir kümmern uns um Ihren Vorgang — ${objektTitel}`,
      html: buildOrgWirKuemmernUnsHtml({
        objektTitel,
        portalPath,
      }),
    });
  } catch (e) {
    console.error("[notifyHvWirKuemmernUns] mail:", e);
  }
}
