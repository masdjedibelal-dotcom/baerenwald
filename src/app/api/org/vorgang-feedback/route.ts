import { NextResponse } from "next/server";

import { sendHvMaengelInternMail } from "@/lib/partner/partner-mail";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { vorgangFeedbackBereit } from "@/lib/portal/vorgang-feedback-eligibility";
import { supabaseAdmin } from "@/lib/supabase";
import { writeAuditEvent } from "@/lib/audit/write-audit-event";

type Body = {
  leadId?: string;
  feedbackTyp?: "bewertung" | "maengel";
  sterne?: number;
  freitext?: string;
};

/** HV: Feedback oder Mängelmeldung nach Handwerker-Abschluss. */
export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const leadId = String(body.leadId ?? "").trim();
  const feedbackTyp = body.feedbackTyp === "maengel" ? "maengel" : "bewertung";
  const sterne = body.sterne != null ? Number(body.sterne) : null;
  const freitext = String(body.freitext ?? "").trim() || null;

  if (!leadId) {
    return NextResponse.json({ error: "leadId fehlt." }, { status: 400 });
  }

  if (feedbackTyp === "bewertung") {
    if (!sterne || !Number.isFinite(sterne) || sterne < 1 || sterne > 5) {
      return NextResponse.json({ error: "Bewertung (1–5) erforderlich." }, { status: 400 });
    }
  } else if (!freitext || freitext.length < 5) {
    return NextResponse.json(
      { error: "Bitte beschreibe die Mängel (mind. 5 Zeichen)." },
      { status: 400 }
    );
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, auftraggeber_kunde_id, vorgang_phase, hv_meldung_status")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead || lead.auftraggeber_kunde_id !== session.kunde.id) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id, titel, status, fortschritt")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: positionen } = auftrag
    ? await supabaseAdmin
        .from("auftrag_positionen")
        .select("handwerker_id, handwerker_status")
        .eq("auftrag_id", auftrag.id)
    : { data: [] as Array<{ handwerker_id: string | null; handwerker_status: string | null }> };

  const bereit = vorgangFeedbackBereit({
    leadVorgangPhase: lead.vorgang_phase,
    hv_meldung_status: lead.hv_meldung_status,
    auftragStatus: auftrag?.status,
    auftragFortschritt: auftrag?.fortschritt,
    positionen,
  });

  if (!bereit) {
    return NextResponse.json(
      { error: "Feedback erst nach Handwerker-Abschluss möglich." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("hv_vorgang_feedback").insert({
    lead_id: leadId,
    auftrag_id: auftrag?.id ?? null,
    kunde_id: session.kunde.id,
    feedback_typ: feedbackTyp,
    sterne: feedbackTyp === "bewertung" ? sterne : null,
    freitext,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Sie haben bereits eine Bewertung abgegeben." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (feedbackTyp === "maengel" && freitext) {
    await sendHvMaengelInternMail({
      hvName: session.kunde.org_anzeigename?.trim() || session.kunde.name?.trim() || "Hausverwaltung",
      leadId,
      auftragTitel: auftrag?.titel,
      freitext,
    });
  }

  await writeAuditEvent({
    entityType: "lead",
    entityId: leadId,
    aktion: feedbackTyp === "maengel" ? "hv_maengel" : "hv_feedback",
    kundeId: session.kunde.id,
    actorId: session.userId,
    actorRolle: session.rolle ?? "sachbearbeiter",
    payload: { feedbackTyp, sterne, freitextLength: freitext?.length ?? 0 },
  });

  return NextResponse.json({ ok: true });
}
