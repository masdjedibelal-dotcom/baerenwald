import { NextResponse } from "next/server";

import { buildEinladungUrl } from "@/lib/org/melde-url";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { MIETER_EMAIL_ENABLED } from "@/lib/melde/mieter-mail-policy";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = { leadId: string };

/** Einladungs-Link erneut abrufen — kein Mieter-Mail-Versand (Standard). */
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
      "id, einladung_token, einladung_status, melder_name, kunde_objekt_id, auftraggeber_kunde_id"
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

  const link = buildEinladungUrl(String(lead.einladung_token));

  if (MIETER_EMAIL_ENABLED) {
    return NextResponse.json(
      { error: "Mieter-Mail-Versand ist derzeit deaktiviert." },
      { status: 501 }
    );
  }

  return NextResponse.json({ ok: true, link });
}
