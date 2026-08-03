import { NextResponse } from "next/server";

import { notifyHvMieterEvent } from "@/lib/org/notify-hv-mieter-event";
import { notifyCrmOrgPortal } from "@/lib/org/notify-crm-org";
import { canOfferKleinreparatur } from "@/lib/org/hv-meldung-workflow";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { requireOrgWrite } from "@/lib/org/assert-org-objekt";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";
import { Resend } from "resend";

export const runtime = "nodejs";

type Aktion =
  | "angebot_einfordern"
  | "ablehnen"
  | "kleinreparatur_freigeben";

type Body = {
  leadId: string;
  aktion: Aktion;
};

/**
 * HV-Aktion auf neuer Meldung: Angebot einfordern / Ablehnen / (Legacy) Kleinreparatur.
 */
export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) {
    return NextResponse.json({ error: write.error }, { status: write.status });
  }

  const body = (await req.json()) as Body;
  const leadId = String(body.leadId ?? "").trim();
  const aktion = body.aktion;
  if (
    !leadId ||
    !["angebot_einfordern", "ablehnen", "kleinreparatur_freigeben"].includes(
      aktion
    )
  ) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const orgId = session.kunde.id;
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, auftraggeber_kunde_id, kunde_objekt_id, hv_meldung_status, anlass, preis_max, preis_unsicher, melder_name, melder_email, funnel_daten"
    )
    .eq("id", leadId)
    .maybeSingle();

  if (!lead || lead.auftraggeber_kunde_id !== orgId) {
    return NextResponse.json({ error: "Meldung nicht gefunden." }, { status: 404 });
  }
  if (lead.anlass !== "meldung") {
    return NextResponse.json({ error: "Kein Meldungs-Vorgang." }, { status: 400 });
  }
  if ((lead.hv_meldung_status ?? "neu") !== "neu") {
    return NextResponse.json(
      { error: "Für diese Meldung ist die Aktion nicht mehr möglich." },
      { status: 409 }
    );
  }

  if (
    aktion === "kleinreparatur_freigeben" &&
    !canOfferKleinreparatur(session.kunde, lead.preis_max)
  ) {
    return NextResponse.json(
      {
        error:
          "Kleinreparatur ist nicht verfügbar (Einstellung aus oder Betrag über Schwelle).",
      },
      { status: 400 }
    );
  }

  const status =
    aktion === "angebot_einfordern"
      ? "angebot_eingefordert"
      : aktion === "ablehnen"
        ? "abgelehnt"
        : "kleinreparatur";

  const patch: Record<string, string> = { hv_meldung_status: status };
  if (aktion === "ablehnen") {
    patch.org_freigabe_status = "abgelehnt";
  }

  const { error: updErr } = await supabaseAdmin
    .from("leads")
    .update(patch)
    .eq("id", leadId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  let objektTitel = "Objekt";
  if (lead.kunde_objekt_id) {
    const { data: obj } = await supabaseAdmin
      .from("kunden_objekte")
      .select("titel")
      .eq("id", lead.kunde_objekt_id)
      .maybeSingle();
    objektTitel = String(obj?.titel ?? "Objekt");
  }

  if (aktion === "angebot_einfordern" || aktion === "kleinreparatur_freigeben") {
    void notifyCrmOrgPortal({ leadId, typ: "meldung" });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const orgEmail = session.kunde.email?.trim() ?? "";
  if (
    aktion === "kleinreparatur_freigeben" &&
    resendKey &&
    isValidEmail(orgEmail)
  ) {
    const portalPath = `/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}`;
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from:
          process.env.RESEND_FROM_SYSTEM ??
          "System <system@baerenwaldmuenchen.de>",
        to: orgEmail,
        subject: `Kleinreparatur — ${objektTitel}`,
        html: `<p>Kleinreparatur für <strong>${objektTitel}</strong>${
          lead.melder_name ? ` (${lead.melder_name})` : ""
        } freigegeben.</p><p><a href="${portalPath}">Zum Vorgang</a></p>`,
      });
    } catch (e) {
      console.error("[meldung-aktion] org mail:", e);
    }
  }

  if (aktion === "ablehnen") {
    await notifyHvMieterEvent({
      leadId,
      typ: "meldung_abgelehnt",
      titel: `Meldung abgelehnt — ${objektTitel}`,
      body: `Sie haben die Meldung abgelehnt. Bitte informieren Sie ${
        lead.melder_name ?? "den Mieter"
      } direkt.`,
    });
  }

  return NextResponse.json({ ok: true, status });
}
