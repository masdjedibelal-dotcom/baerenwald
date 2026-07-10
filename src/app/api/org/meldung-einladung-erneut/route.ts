import { NextResponse } from "next/server";
import { Resend } from "resend";

import { buildMelderEinladungHtml } from "@/lib/email/meldung-mail-templates";
import { buildEinladungUrl } from "@/lib/org/melde-url";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { isValidEmail } from "@/lib/validation";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = { leadId: string };

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as Body;
  const leadId = String(body.leadId ?? "").trim();
  if (!leadId) {
    return NextResponse.json({ error: "Lead fehlt." }, { status: 400 });
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, einladung_token, einladung_status, melder_name, melder_email, kunde_objekt_id, auftraggeber_kunde_id"
    )
    .eq("id", leadId)
    .eq("auftraggeber_kunde_id", session.kunde.id)
    .maybeSingle();

  if (!lead?.id) {
    return NextResponse.json({ error: "Meldung nicht gefunden." }, { status: 404 });
  }
  if (lead.einladung_status !== "offen" || !lead.einladung_token) {
    return NextResponse.json(
      { error: "Keine offene Einladung für diese Meldung." },
      { status: 400 }
    );
  }
  if (!isValidEmail(lead.melder_email)) {
    return NextResponse.json(
      { error: "Keine gültige Melder-E-Mail hinterlegt." },
      { status: 400 }
    );
  }

  const { data: objekt } = lead.kunde_objekt_id
    ? await supabaseAdmin
        .from("kunden_objekte")
        .select("titel")
        .eq("id", lead.kunde_objekt_id)
        .maybeSingle()
    : { data: null };

  const org = session.kunde;
  const orgName =
    org.org_anzeigename?.trim() || org.name?.trim() || "Auftraggeber";
  const link = buildEinladungUrl(String(lead.einladung_token));
  const melderName = String(lead.melder_name ?? "Melder").trim();
  const objektTitel = String(objekt?.titel ?? "Objekt");

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "E-Mail-Versand nicht konfiguriert." },
      { status: 503 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from:
        process.env.RESEND_FROM_CUSTOMER ??
        "Bärenwald München <anfragen@baerenwaldmuenchen.de>",
      to: String(lead.melder_email).toLowerCase(),
      subject: `Meldung ergänzen — ${objektTitel}`,
      html: buildMelderEinladungHtml({
        melderName,
        orgName,
        objektTitel,
        link,
      }),
    });
  } catch (e) {
    console.error("[meldung-einladung-erneut]", e);
    return NextResponse.json(
      { error: "E-Mail konnte nicht gesendet werden." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, link });
}
