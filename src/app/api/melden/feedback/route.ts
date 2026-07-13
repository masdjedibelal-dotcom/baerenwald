import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { vorgangFeedbackBereit } from "@/lib/portal/vorgang-feedback-eligibility";

type Body = { token?: string; sterne?: number; freitext?: string };

/** Mieter-Feedback nach abgeschlossenem Vorgang (S11). */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  const sterne = Number(body.sterne);
  const freitext = String(body.freitext ?? "").trim() || null;

  if (!token || !Number.isFinite(sterne) || sterne < 1 || sterne > 5) {
    return NextResponse.json({ error: "Bewertung (1–5) erforderlich." }, { status: 400 });
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, vorgang_phase, hv_meldung_status")
    .eq("melde_tracking_token", token)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id, status, fortschritt")
    .eq("lead_id", lead.id)
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
      { error: "Feedback erst nach Abschluss der Arbeiten möglich." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("mieter_feedback").upsert(
    {
      lead_id: lead.id,
      auftrag_id: auftrag?.id ?? null,
      sterne,
      freitext,
    },
    { onConflict: "lead_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
