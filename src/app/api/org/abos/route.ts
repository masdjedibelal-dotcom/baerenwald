import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

/** Aktive Abos der Organisation (S13 / Leistungen). */
export async function GET() {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { data, error } = await supabaseAdmin
    .from("objekt_abos")
    .select(
      "id, produkt_slug, status, start_am, end_am, kuendigung_eingereicht_am, kuendigungsfrist_wochen, kunde_objekt_id, kunden_objekte(titel)"
    )
    .eq("kunde_id", session.kunde.id)
    .in("status", ["aktiv", "gekuendigt"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const abos = (data ?? []).map((row) => {
    const obj = row.kunden_objekte as { titel?: string } | null;
    return {
      id: row.id,
      produktSlug: row.produkt_slug,
      status: row.status,
      startAm: row.start_am,
      endAm: row.end_am,
      kuendigungEingereichtAm: row.kuendigung_eingereicht_am,
      kuendigungsfristWochen: row.kuendigungsfrist_wochen,
      objektId: row.kunde_objekt_id,
      objektTitel: obj?.titel ?? "Objekt",
    };
  });

  return NextResponse.json({ abos });
}
