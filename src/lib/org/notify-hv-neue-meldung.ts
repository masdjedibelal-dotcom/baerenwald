import { buildOrgHvMieterEventHtml } from "@/lib/email/meldung-mail-templates";
import { sendBrandedMail } from "@/lib/email/send-branded-mail";
import { createHvNotification } from "@/lib/org/create-hv-notification";
import {
  buildMeldeVorgangTitel,
  formatMeldeNotifTitel,
  MELDE_NOTIF_COPY,
} from "@/lib/org/melde-vorgang-titel";
import { withPortalDetailDeepLink } from "@/lib/portal2/portal-detail-deep-link";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";
import { Resend } from "resend";

/**
 * HV-Glocke (+ optional E-Mail): neue Meldung vom Mieter/Melder-Link.
 * Nicht bei HV-eigener Erfassung (`erfassung_von = organisation`).
 */
export async function notifyHvNeueMeldung(input: {
  leadId: string;
}): Promise<void> {
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      `
      id,
      auftraggeber_kunde_id,
      kunde_objekt_id,
      melder_name,
      melder_einheit,
      situation,
      bereiche,
      funnel_daten,
      kontakt_nachricht,
      notizen,
      erfassung_von,
      kanal
    `
    )
    .eq("id", input.leadId)
    .maybeSingle();

  if (!lead?.auftraggeber_kunde_id) return;

  // Eigene HV-Anlage → keine Glocken-Meldung an sich selbst
  const erfassung = String(lead.erfassung_von ?? "").toLowerCase();
  const kanal = String(lead.kanal ?? "").toLowerCase();
  if (erfassung === "organisation" || kanal === "hv_direkt") return;

  const kundeId = String(lead.auftraggeber_kunde_id);
  const vorgangTitel = buildMeldeVorgangTitel({
    situation: lead.situation,
    bereiche: (lead.bereiche as string[] | null) ?? null,
    funnelDaten: lead.funnel_daten,
    beschreibung:
      (lead.kontakt_nachricht as string | null) ??
      (lead.notizen as string | null) ??
      null,
  });
  const bezug =
    vorgangTitel && vorgangTitel !== "Meldung"
      ? vorgangTitel
      : String(lead.kontakt_nachricht ?? lead.notizen ?? "").trim() ||
        "Neue Meldung";

  const titel = formatMeldeNotifTitel(MELDE_NOTIF_COPY.neueMeldung, {
    titel: bezug,
  });

  const melder = String(lead.melder_name ?? "").trim();
  const einheit = String(lead.melder_einheit ?? "").trim();
  const wer = [melder || null, einheit ? `WE ${einheit}` : null]
    .filter(Boolean)
    .join(" · ");

  const body = wer
    ? `${wer} hat eine neue Meldung eingereicht — bitte prüfen.`
    : "Eine neue Meldung wurde eingereicht — bitte prüfen.";

  const link = withPortalDetailDeepLink(
    `/portal?section=vorgaenge&id=${encodeURIComponent(input.leadId)}`,
    null
  );

  // Kein Doppel-Eintrag innerhalb kurzer Zeit (Retry / Duplicate-Warning)
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: existing } = await supabaseAdmin
    .from("hv_notifications")
    .select("id")
    .eq("kunde_id", kundeId)
    .eq("typ", "neue_meldung")
    .ilike("link", `%id=${input.leadId}%`)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return;

  await createHvNotification({
    kundeId,
    typ: "neue_meldung",
    titel,
    body,
    link,
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
    await sendBrandedMail(resend, {
      from:
        process.env.RESEND_FROM_SYSTEM ??
        "System <system@baerenwaldmuenchen.de>",
      to: orgEmail,
      subject: titel,
      html: buildOrgHvMieterEventHtml({
        objektTitel,
        melderName: melder || undefined,
        eventTitel: titel,
        eventBody: body,
        portalPath: link,
      }),
    });
  } catch (e) {
    console.error("[notifyHvNeueMeldung] mail:", e);
  }
}
