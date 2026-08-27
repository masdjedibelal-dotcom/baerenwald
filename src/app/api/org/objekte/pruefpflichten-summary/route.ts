import { NextResponse } from "next/server";

import { resolvePruefpflichtBadge } from "@/lib/org/pruefpflichten-catalog";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** Fällige Prüfpflichten (überfällig + bald fällig) je Objekt — für Listen- und Tab-Badges. */
export async function GET() {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { data: objekte, error: objErr } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id")
    .eq("kunde_id", session.kunde.id);

  if (objErr) {
    return NextResponse.json({ error: objErr.message }, { status: 500 });
  }

  const ids = (objekte ?? []).map((o) => String(o.id));
  if (!ids.length) {
    return NextResponse.json({ byObjektId: {} as Record<string, number> });
  }

  const { data: rows, error } = await supabaseAdmin
    .from("objekt_pruefpflichten")
    .select("kunde_objekt_id, naechste_faellig")
    .in("kunde_objekt_id", ids)
    .eq("status", "aktiv");

  if (error) {
    if (/objekt_pruefpflichten|does not exist/i.test(error.message)) {
      return NextResponse.json({ byObjektId: {} as Record<string, number> });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byObjektId: Record<string, number> = {};
  for (const row of rows ?? []) {
    const oid = String(row.kunde_objekt_id ?? "");
    if (!oid) continue;
    const badge = resolvePruefpflichtBadge(
      row.naechste_faellig as string | null | undefined
    );
    if (badge === "ueberfaellig" || badge === "bald_faellig") {
      byObjektId[oid] = (byObjektId[oid] ?? 0) + 1;
    }
  }

  return NextResponse.json({ byObjektId });
}
