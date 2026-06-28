import { NextResponse } from "next/server";

import {
  buildMelderAbgelehntHtml,
  buildOrgAngebotEingefordertHtml,
  buildOrgKleinreparaturHtml,
} from "@/lib/email/meldung-mail-templates";
import { notifyCrmOrgPortal } from "@/lib/org/notify-crm-org";
import {
  canOfferKleinreparatur,
  type HvMeldungStatus,
} from "@/lib/org/hv-meldung-workflow";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { isValidEmail } from "@/lib/validation";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

type Aktion = "angebot_einfordern" | "ablehnen" | "kleinreparatur_freigeben";

type Body = {
  leadId: string;
  aktion: Aktion;
  notiz?: string;
};

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
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

  const current = (lead.hv_meldung_status ?? "neu") as HvMeldungStatus;
  if (current !== "neu") {
    return NextResponse.json(
      { error: "Für diese Meldung ist die Aktion nicht mehr möglich." },
      { status: 409 }
    );
  }

  if (aktion === "kleinreparatur_freigeben") {
    if (
      !canOfferKleinreparatur(session.kunde, lead.preis_max as number | null)
    ) {
      return NextResponse.json(
        {
          error:
            "Kleinreparatur ist nicht verfügbar (Einstellung aus oder Betrag über Schwelle).",
        },
        { status: 400 }
      );
    }
  }

  let nextStatus: HvMeldungStatus;
  if (aktion === "angebot_einfordern") nextStatus = "angebot_eingefordert";
  else if (aktion === "ablehnen") nextStatus = "abgelehnt";
  else nextStatus = "kleinreparatur";

  const patch: Record<string, unknown> = {
    hv_meldung_status: nextStatus,
  };
  if (aktion === "ablehnen") {
    patch.org_freigabe_status = "abgelehnt";
  }

  await supabaseAdmin.from("leads").update(patch).eq("id", leadId);

  const { data: objekt } = lead.kunde_objekt_id
    ? await supabaseAdmin
        .from("kunden_objekte")
        .select("titel")
        .eq("id", lead.kunde_objekt_id)
        .maybeSingle()
    : { data: null };

  const objektTitel = String(objekt?.titel ?? "Objekt");
  const orgName =
    session.kunde.org_anzeigename?.trim() ||
    session.kunde.name?.trim() ||
    "Hausverwaltung";
  const portalPath = `/portal?section=freigabe&id=${leadId}`;

  if (aktion === "angebot_einfordern" || aktion === "kleinreparatur_freigeben") {
    void notifyCrmOrgPortal({ leadId, typ: "meldung" });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const orgEmail = session.kunde.email?.trim() ?? "";

  if (resendKey && isValidEmail(orgEmail)) {
    const resend = new Resend(resendKey);
    try {
      if (aktion === "angebot_einfordern") {
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_SYSTEM ??
            "System <system@baerenwaldmuenchen.de>",
          to: orgEmail,
          subject: `Angebot eingefordert — ${objektTitel}`,
          html: buildOrgAngebotEingefordertHtml({
            orgName,
            objektTitel,
            melderName: lead.melder_name ?? undefined,
            portalPath,
          }),
        });
      } else if (aktion === "kleinreparatur_freigeben") {
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_SYSTEM ??
            "System <system@baerenwaldmuenchen.de>",
          to: orgEmail,
          subject: `Kleinreparatur — ${objektTitel}`,
          html: buildOrgKleinreparaturHtml({
            objektTitel,
            melderName: lead.melder_name ?? undefined,
            portalPath,
          }),
        });
      }
    } catch (e) {
      console.error("[meldung-aktion] org mail:", e);
    }
  }

  const melderEmail = String(lead.melder_email ?? "").trim();
  if (
    aktion === "ablehnen" &&
    resendKey &&
    isValidEmail(melderEmail)
  ) {
    const resend = new Resend(resendKey);
    try {
      await resend.emails.send({
        from:
          process.env.RESEND_FROM_CUSTOMER ??
          "Bärenwald München <anfragen@baerenwaldmuenchen.de>",
        to: melderEmail.toLowerCase(),
        subject: `Meldung abgeschlossen — ${objektTitel}`,
        html: buildMelderAbgelehntHtml({
          melderName: lead.melder_name ?? "Mieter",
          orgName,
          objektTitel,
        }),
      });
    } catch (e) {
      console.error("[meldung-aktion] melder mail:", e);
    }
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
