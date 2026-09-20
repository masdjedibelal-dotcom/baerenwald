import { logDbError } from '@/lib/errors/log-db-error'
import { buildOrgWirKuemmernUnsHtml } from "@/lib/email/meldung-mail-templates";
import { sendBrandedMail } from "@/lib/email/send-branded-mail";
import { withPortalDetailDeepLink } from "@/lib/portal2/portal-detail-deep-link";
import { buildSubject } from "@/lib/shared-domain/build-subject";
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

  const {data: lead, error: __dbErr327_1} = await supabaseAdmin
    .from("leads")
    .select("id, auftraggeber_kunde_id, kunde_objekt_id")
    .eq("id", leadId)
    .maybeSingle();
  if (__dbErr327_1) logDbError('lib/org/notify-hv-wir-kuemmern:leads', __dbErr327_1)
  if (!lead?.auftraggeber_kunde_id) return;

  const kundeId = String(lead.auftraggeber_kunde_id);
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const {data: orgKunde, error: __dbErr328_2} = await supabaseAdmin
    .from("kunden")
    .select("email, name, org_anzeigename")
    .eq("id", kundeId)
    .maybeSingle();
  if (__dbErr328_2) logDbError('lib/org/notify-hv-wir-kuemmern:kunden', __dbErr328_2)
  const orgEmail = String(orgKunde?.email ?? "").trim();
  if (!orgEmail || !isValidEmail(orgEmail)) return;

  let objektTitel = "Objekt";
  if (lead.kunde_objekt_id) {
    const {data: obj, error: __dbErr329_3} = await supabaseAdmin
      .from("kunden_objekte")
      .select("titel")
      .eq("id", lead.kunde_objekt_id)
      .maybeSingle();
    if (__dbErr329_3) logDbError('lib/org/notify-hv-wir-kuemmern:kunden_objekte', __dbErr329_3)
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
      subject: buildSubject({
        objekt: objektTitel,
        ereignis: "Wir kümmern uns",
      }),
      html: buildOrgWirKuemmernUnsHtml({
        objektTitel,
        portalPath,
      }),
    });
  } catch (e) {
    console.error("[notifyHvWirKuemmernUns] mail:", e);
  }
}
