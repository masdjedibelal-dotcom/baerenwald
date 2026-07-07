import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = { aboId?: string };

function berechneEndAm(fristWochen: number): string {
  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const end = new Date(monthEnd);
  end.setDate(end.getDate() + fristWochen * 7);
  return end.toISOString().slice(0, 10);
}

/** Abo-Kündigung: end_am = Monatsende + Kündigungsfrist (Wochen). */
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

  const aboId = String(body.aboId ?? "").trim();
  if (!aboId) {
    return NextResponse.json({ error: "aboId fehlt." }, { status: 400 });
  }

  const { data: abo } = await supabaseAdmin
    .from("objekt_abos")
    .select("id, status, kuendigungsfrist_wochen, produkt_slug")
    .eq("id", aboId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!abo) {
    return NextResponse.json({ error: "Abo nicht gefunden." }, { status: 404 });
  }
  if (abo.status !== "aktiv") {
    return NextResponse.json({ error: "Abo ist nicht aktiv." }, { status: 400 });
  }

  const frist = Number(abo.kuendigungsfrist_wochen ?? 4);
  const endAm = berechneEndAm(frist);
  const nowIso = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("objekt_abos")
    .update({
      status: "gekuendigt",
      end_am: endAm,
      kuendigung_eingereicht_am: nowIso,
      updated_at: nowIso,
    })
    .eq("id", aboId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditEvent({
    entityType: "objekt_abo",
    entityId: aboId,
    aktion: "abo_gekuendigt",
    actorId: session.userId,
    kundeId: session.kunde.id,
    payload: { endAm, fristWochen: frist, produktSlug: abo.produkt_slug },
  });

  return NextResponse.json({ ok: true, endAm, status: "gekuendigt" });
}
