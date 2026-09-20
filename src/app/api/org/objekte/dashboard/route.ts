import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** KPI-Dashboard für ein Objekt (Kosten, offene Vorgänge, Prüffristen). */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const objektId = new URL(req.url).searchParams.get("objektId")?.trim();
  if (!objektId) {
    return NextResponse.json({ error: "objektId fehlt." }, { status: 400 });
  }

  const {data: objekt, error: __dbErr203_1} = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, titel, freigabe_schwelle_eur")
    .eq("id", objektId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();
  if (__dbErr203_1) logDbError('app/api/org/objekte/dashboard/route:kunden_objekte', __dbErr203_1)
  if (!objekt) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const jahr = new Date().getFullYear();

  const {data: kostenRows, error: __dbErr204_2} = await supabaseAdmin
    .from("v_objekt_kosten")
    .select("jahr, brutto_gesamt, lohnanteil_gesamt, kostentraeger, anzahl_rechnungen")
    .eq("kunde_id", session.kunde.id)
    .eq("kunde_objekt_id", objektId);
  if (__dbErr204_2) logDbError('app/api/org/objekte/dashboard/route:v_objekt_kosten', __dbErr204_2)
  const jahrRows = (kostenRows ?? []).filter(
    (r) => new Date(String(r.jahr)).getFullYear() === jahr
  );
  const bruttoJahr = jahrRows.reduce(
    (sum, r) => sum + Number(r.brutto_gesamt ?? 0),
    0
  );
  const nachTraeger = jahrRows.reduce<Record<string, number>>((acc, r) => {
    const key = String(r.kostentraeger ?? "sonstiges");
    acc[key] = (acc[key] ?? 0) + Number(r.brutto_gesamt ?? 0);
    return acc;
  }, {});

  const {count: offeneVorgaenge, error: __dbErr205_3} = await supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("auftraggeber_kunde_id", session.kunde.id)
    .eq("kunde_objekt_id", objektId)
    .not("vorgang_phase", "in", '("abgeschlossen","abgelehnt")');
  if (__dbErr205_3) logDbError('app/api/org/objekte/dashboard/route:leads', __dbErr205_3)
  const {count: pruefpflichtenFaellig, error: __dbErr206_4} = await supabaseAdmin
    .from("objekt_pruefpflichten")
    .select("id", { count: "exact", head: true })
    .eq("kunde_objekt_id", objektId)
    .eq("status", "aktiv")
    .lte("naechste_faellig", new Date().toISOString().slice(0, 10));
  if (__dbErr206_4) logDbError('app/api/org/objekte/dashboard/route:objekt_pruefpflichten', __dbErr206_4)
  const {count: fremdVorgaenge, error: __dbErr207_5} = await supabaseAdmin
    .from("fremd_vorgaenge")
    .select("id", { count: "exact", head: true })
    .eq("kunde_objekt_id", objektId);
  if (__dbErr207_5) logDbError('app/api/org/objekte/dashboard/route:fremd_vorgaenge', __dbErr207_5)
  return NextResponse.json({
    objekt: {
      id: objekt.id,
      titel: objekt.titel,
      freigabeSchwelleEur: objekt.freigabe_schwelle_eur,
    },
    jahr,
    bruttoJahr,
    nachTraeger,
    offeneVorgaenge: offeneVorgaenge ?? 0,
    pruefpflichtenFaellig: pruefpflichtenFaellig ?? 0,
    fremdVorgaenge: fremdVorgaenge ?? 0,
    kostenHistorie: kostenRows ?? [],
  });
}
