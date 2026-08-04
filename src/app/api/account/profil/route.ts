import { NextResponse } from "next/server";

import { requireAccountSession } from "@/lib/account/require-account-session";
import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

type Body = {
  name?: string;
  telefon?: string;
};

/** B2 — Profil Name/Telefon für verknüpften Kundenstamm. */
export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 503 });
  }

  const session = await requireAccountSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  if (session.kind !== "kunde") {
    return NextResponse.json(
      { error: "Partner-Profil bitte über Firmendaten speichern." },
      { status: 400 }
    );
  }

  const body = (await req.json()) as Body;
  const patch: Record<string, string> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "Name zu kurz." }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ error: "Name zu lang." }, { status: 400 });
    }
    patch.name = name;
  }

  if (typeof body.telefon === "string") {
    const telefon = body.telefon.trim();
    if (telefon.length > 40) {
      return NextResponse.json({ error: "Telefon zu lang." }, { status: 400 });
    }
    patch.telefon = telefon;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("kunden")
    .update(patch)
    .eq("id", session.entityId)
    .select("id, name, email, telefon")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditEvent({
    entityType: "kunde",
    entityId: session.entityId,
    aktion: "profil_geaendert",
    actorId: session.userId,
    actorRolle: "portal",
    kundeId: session.entityId,
    payload: { fields: Object.keys(patch) },
  });

  return NextResponse.json({ ok: true, profil: data });
}
