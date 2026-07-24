import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";
import { writeAuditEvent } from "@/lib/audit/write-audit-event";

type Body = { leadId?: string; grund?: string };

/** Vorgang zurückziehen / stornieren */
export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as Body;
  const leadId = String(body.leadId ?? "").trim();
  const grund = String(body.grund ?? "").trim();
  if (!leadId || grund.length < 5) {
    return NextResponse.json({ error: "Grund erforderlich (min. 5 Zeichen)." }, { status: 400 });
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, auftraggeber_kunde_id, hv_meldung_status, vorgang_phase")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead || lead.auftraggeber_kunde_id !== session.kunde.id) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const inAusfuehrung =
    lead.hv_meldung_status === "notmassnahme" ||
    lead.vorgang_phase === "beauftragt" ||
    lead.vorgang_phase === "in_bearbeitung";

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("leads")
    .update({
      storniert_am: now,
      storniert_grund: grund,
      storniert_von: session.rolle ?? "hv",
      hv_meldung_status: "abgelehnt",
      vorgang_phase: "abgelehnt",
      org_freigabe_status: "abgelehnt",
    })
    .eq("id", leadId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditEvent({
    entityType: "lead",
    entityId: leadId,
    aktion: "vorgang_storniert",
    kundeId: session.kunde.id,
    actorId: session.userId,
    actorRolle: session.rolle,
    payload: { grund, inAusfuehrung },
  });

  return NextResponse.json({
    ok: true,
    hinweis: inAusfuehrung
      ? "Storno erfasst — Bärenwald prüft mögliche Abbruchkosten."
      : "Vorgang zurückgezogen.",
  });
}
