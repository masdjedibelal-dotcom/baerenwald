import { NextResponse } from "next/server";

import { notifyHvMieterEvent } from "@/lib/org/notify-hv-mieter-event";
import { MIETER_EMAIL_ENABLED } from "@/lib/melde/mieter-mail-policy";
import { notifyCrmOrgPortal } from "@/lib/org/notify-crm-org";
import type { HvMeldungStatus } from "@/lib/org/hv-meldung-workflow";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

type Aktion = "angebot_einfordern" | "ablehnen";

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

  if (!leadId || !["angebot_einfordern", "ablehnen"].includes(aktion)) {
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

  const nextStatus: HvMeldungStatus =
    aktion === "angebot_einfordern" ? "angebot_eingefordert" : "abgelehnt";

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

  if (aktion === "angebot_einfordern") {
    void notifyCrmOrgPortal({ leadId, typ: "meldung" });
  }

  if (aktion === "ablehnen" && !MIETER_EMAIL_ENABLED) {
    await notifyHvMieterEvent({
      leadId,
      typ: "meldung_abgelehnt",
      titel: `Meldung abgelehnt — ${objektTitel}`,
      body: `Sie haben die Meldung abgelehnt. Bitte informieren Sie ${lead.melder_name ?? "den Mieter"} direkt.`,
    });
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
