import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** HV-Vorgangssuche (E7). */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json({ ergebnisse: [] });
  }

  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select(
      "id, kontakt_name, melder_name, melder_einheit, anlass, status, hv_meldung_status, kunde_objekt_id, created_at, situation, bereiche"
    )
    .eq("auftraggeber_kunde_id", session.kunde.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: objekte } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, titel, kostenstelle_nr")
    .eq("kunde_id", session.kunde.id);

  const objMap = new Map((objekte ?? []).map((o) => [String(o.id), o]));

  const ergebnisse = (leads ?? [])
    .filter((l) => {
      const obj = l.kunde_objekt_id ? objMap.get(String(l.kunde_objekt_id)) : null;
      const hay = [
        l.id,
        l.kontakt_name,
        l.melder_name,
        l.melder_einheit,
        l.anlass,
        l.status,
        obj?.titel,
        obj?.kostenstelle_nr,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .slice(0, 20)
    .map((l) => {
      const obj = l.kunde_objekt_id ? objMap.get(String(l.kunde_objekt_id)) : null;
      return {
        id: l.id,
        titel: l.melder_name ?? l.kontakt_name ?? "Vorgang",
        untertitel: obj?.titel ?? "",
        anlass: l.anlass,
        status: l.hv_meldung_status ?? l.status,
        created_at: l.created_at,
      };
    });

  return NextResponse.json({ ergebnisse });
}
