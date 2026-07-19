import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

type Body = {
  leadId: string;
  aktion: "freigegeben" | "abgelehnt";
};

/**
 * D8 — Eigentümer-Kostenfreigabe am Vorgang.
 * Sichtbarkeit: Lead muss einem zugeordneten Objekt gehören.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = (await req.json()) as Body;
  const leadId = String(body.leadId ?? "").trim();
  const aktion = body.aktion;
  if (!leadId || (aktion !== "freigegeben" && aktion !== "abgelehnt")) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { data: kunde } = await supabaseAdmin
    .from("kunden")
    .select("id, portal_modus")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!kunde?.id) {
    return NextResponse.json({ error: "Kein Kundenkonto." }, { status: 403 });
  }

  const modus = String(
    (kunde as { portal_modus?: string }).portal_modus ?? ""
  ).toLowerCase();
  if (modus !== "eigentuemer") {
    return NextResponse.json(
      { error: "Nur für Eigentümer-Zugang." },
      { status: 403 }
    );
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, kunde_objekt_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: "Vorgang nicht gefunden." }, { status: 404 });
  }

  const objektId = String(
    (lead as { kunde_objekt_id?: string | null }).kunde_objekt_id ?? ""
  ).trim();
  if (!objektId) {
    return NextResponse.json(
      { error: "Vorgang ohne Objekt — keine Freigabe." },
      { status: 403 }
    );
  }

  const { data: zuord, error: zuordErr } = await supabaseAdmin
    .from("eigentuemer_objekte")
    .select("id")
    .eq("kunde_id", kunde.id)
    .eq("kunde_objekt_id", objektId)
    .maybeSingle();

  if (zuordErr) {
    return NextResponse.json(
      {
        error:
          "Zuordnungstabelle fehlt noch (Migration D8). Freigabe nicht speicherbar.",
      },
      { status: 503 }
    );
  }

  if (!zuord) {
    return NextResponse.json(
      { error: "Kein Zugriff auf diesen Vorgang." },
      { status: 403 }
    );
  }

  const { error: updErr } = await supabaseAdmin
    .from("leads")
    .update({ eigentuemer_freigabe_status: aktion })
    .eq("id", leadId);

  if (updErr) {
    return NextResponse.json(
      {
        error:
          updErr.message.includes("eigentuemer_freigabe_status")
            ? "Freigabe-Feld fehlt noch (Migration D8)."
            : updErr.message,
      },
      { status: 503 }
    );
  }

  await writeAuditEvent({
    entityType: "lead",
    entityId: leadId,
    aktion:
      aktion === "freigegeben"
        ? "eigentuemer_kostenfreigabe"
        : "eigentuemer_kostenfreigabe_abgelehnt",
    actorId: user.id,
    actorRolle: "eigentuemer",
    kundeId: kunde.id,
    payload: { objekt_id: objektId },
  });

  return NextResponse.json({ ok: true, status: aktion });
}
