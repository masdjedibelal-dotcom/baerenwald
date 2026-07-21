import { buildOrgHvMieterEventHtml } from "@/lib/email/meldung-mail-templates";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";
import { Resend } from "resend";

export type HvMieterEventTyp =
  | "status_change"
  | "bautagebuch"
  | "meldung_abgelehnt"
  | "termin_hinweis";

/** Statt Mieter-Mail: Glocke + HV-E-Mail (Bärenwald-Branding ok). */
export async function notifyHvMieterEvent(input: {
  leadId: string;
  typ: HvMieterEventTyp;
  titel: string;
  body: string;
}): Promise<void> {
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, melder_name, kunde_objekt_id, auftraggeber_kunde_id")
    .eq("id", input.leadId)
    .maybeSingle();

  if (!lead?.auftraggeber_kunde_id) return;

  const kundeId = String(lead.auftraggeber_kunde_id);
  const portalPath = `/portal?section=vorgaenge&id=${encodeURIComponent(input.leadId)}`;

  await supabaseAdmin.from("hv_notifications").insert({
    kunde_id: kundeId,
    typ: input.typ,
    titel: input.titel,
    body: input.body,
    link: portalPath,
  });

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

  const resend = new Resend(resendKey);
  try {
    await resend.emails.send({
      from:
        process.env.RESEND_FROM_SYSTEM ??
        "System <system@baerenwaldmuenchen.de>",
      to: orgEmail,
      subject: input.titel,
      html: buildOrgHvMieterEventHtml({
        objektTitel,
        melderName: lead.melder_name ? String(lead.melder_name) : undefined,
        eventTitel: input.titel,
        eventBody: input.body,
        portalPath,
      }),
    });
  } catch (e) {
    console.error("[notifyHvMieterEvent] mail:", e);
  }
}
