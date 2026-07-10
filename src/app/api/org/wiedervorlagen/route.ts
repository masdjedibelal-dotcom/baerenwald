import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { requireOrgWrite } from "@/lib/org/assert-org-objekt";
import { supabaseAdmin } from "@/lib/supabase";

/** Offene Wiedervorlagen für Startseite „Heute“. */
export async function GET() {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("akten_notizen")
    .select(
      "id, text, wiedervorlage_am, kunde_objekt_id, lead_id, kunden_objekte(titel)"
    )
    .eq("kunde_id", session.kunde.id)
    .is("erledigt_am", null)
    .not("wiedervorlage_am", "is", null)
    .lte("wiedervorlage_am", today)
    .order("wiedervorlage_am", { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? []).map((row) => {
    const obj = row.kunden_objekte as { titel?: string } | null;
    return {
      id: row.id,
      text: row.text,
      wiedervorlageAm: row.wiedervorlage_am,
      objektId: row.kunde_objekt_id,
      leadId: row.lead_id,
      objektTitel: obj?.titel ?? "Objekt",
    };
  });

  return NextResponse.json({ items, count: items.length });
}

export async function PATCH(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) return NextResponse.json({ error: write.error }, { status: write.status });

  const body = (await req.json()) as { id?: string };
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id fehlt." }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("akten_notizen")
    .update({ erledigt_am: new Date().toISOString() })
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
