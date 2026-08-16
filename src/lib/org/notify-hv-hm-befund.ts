/**
 * HV-Glocke (+ optional E-Mail): Hausmeister hat Prüfung abgeschlossen.
 */
import { createHvNotification } from "@/lib/org/create-hv-notification";
import { withPortalDetailDeepLink } from "@/lib/portal2/portal-detail-deep-link";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";
import { Resend } from "resend";

export async function notifyHvHausmeisterBefundFertig(input: {
  leadId: string;
  ergebnis:
    | "selbst_erledigt"
    | "fachfirma_angebot"
    | "fachfirma_akut";
}): Promise<void> {
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      `
      id,
      auftraggeber_kunde_id,
      kunde_objekt_id,
      situation,
      bereiche,
      funnel_daten,
      kontakt_nachricht,
      notizen
    `
    )
    .eq("id", input.leadId)
    .maybeSingle();

  if (!lead?.auftraggeber_kunde_id) return;

  const kundeId = String(lead.auftraggeber_kunde_id);
  const { data: obj } = lead.kunde_objekt_id
    ? await supabaseAdmin
        .from("kunden_objekte")
        .select("titel")
        .eq("id", lead.kunde_objekt_id)
        .maybeSingle()
    : { data: null };

  const objektTitel = String(obj?.titel ?? "").trim() || "Objekt";
  const ergebnisLabel =
    input.ergebnis === "selbst_erledigt"
      ? "selbst erledigt"
      : input.ergebnis === "fachfirma_akut"
        ? "Fachfirma (Akut)"
        : "Fachfirma (Angebot)";

  const titel = `Hausmeister-Prüfung fertig — ${objektTitel}`;
  const body = `Ergebnis: ${ergebnisLabel}. Bitte im Vorgang prüfen.`;
  const link = withPortalDetailDeepLink(
    `/portal?section=vorgaenge&id=${encodeURIComponent(input.leadId)}`,
    null
  );

  await createHvNotification({
    kundeId,
    typ: "hm_befund",
    titel,
    body,
    link,
  });

  const { data: org } = await supabaseAdmin
    .from("kunden")
    .select("email, org_anzeigename, name")
    .eq("id", kundeId)
    .maybeSingle();
  const to = String(org?.email ?? "").trim();
  if (!to || !isValidEmail(to) || !process.env.RESEND_API_KEY) return;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL?.trim() ||
        "Bärenwald <noreply@baerenwald.de>",
      to,
      subject: titel,
      html: `<p>${body}</p><p><a href="${link}">Zum Vorgang</a></p>`,
    });
  } catch (e) {
    console.error("[notifyHvHausmeisterBefundFertig]", e);
  }
}
