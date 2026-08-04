import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";
import { writeAuditEvent } from "@/lib/audit/write-audit-event";

type Body = { leadId?: string; text?: string };

/** GET/POST Kommentare HV ↔ Bärenwald am Vorgang */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const leadId = new URL(req.url).searchParams.get("leadId")?.trim();
  if (!leadId) {
    return NextResponse.json({ error: "leadId fehlt." }, { status: 400 });
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, auftraggeber_kunde_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead || lead.auftraggeber_kunde_id !== session.kunde.id) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("vorgang_kommentare")
    .select("id, actor_rolle, actor_name, text, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ kommentare: data ?? [] });
}

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as Body;
  const leadId = String(body.leadId ?? "").trim();
  const text = String(body.text ?? "").trim();
  if (!leadId || text.length < 2) {
    return NextResponse.json({ error: "Text zu kurz." }, { status: 400 });
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, auftraggeber_kunde_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead || lead.auftraggeber_kunde_id !== session.kunde.id) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const rolle = session.rolle ?? "sachbearbeiter";
  const { data: row, error } = await supabaseAdmin
    .from("vorgang_kommentare")
    .insert({
      lead_id: leadId,
      kunde_id: session.kunde.id,
      actor_rolle: rolle,
      actor_name: session.kunde.org_anzeigename ?? session.kunde.name,
      text,
    })
    .select("id, actor_rolle, actor_name, text, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditEvent({
    entityType: "lead",
    entityId: leadId,
    aktion: "vorgang_kommentar",
    kundeId: session.kunde.id,
    actorId: session.userId,
    actorRolle: rolle,
    payload: { textLength: text.length },
  });

  return NextResponse.json({ kommentar: row });
}
