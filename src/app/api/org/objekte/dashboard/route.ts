import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

/** S3 Objekt-Dashboard: Kosten aus v_objekt_kosten + Vorgangs-Zähler. */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const objektId = new URL(req.url).searchParams.get("objektId")?.trim();
  if (!objektId) {
    return NextResponse.json({ error: "objektId fehlt." }, { status: 400 });
  }

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, titel, freigabe_schwelle_eur")
    .eq("id", objektId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!objekt) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const jahr = new Date().getFullYear();
  const { data: kostenRows } = await supabaseAdmin
    .from("v_objekt_kosten")
    .select("jahr, brutto_gesamt, lohnanteil_gesamt, kostentraeger, anzahl_rechnungen")
    .eq("kunde_id", session.kunde.id)
    .eq("kunde_objekt_id", objektId);

  const jahrRows = (kostenRows ?? []).filter((r) => {
    const y = new Date(String(r.jahr)).getFullYear();
    return y === jahr;
  });

  const bruttoJahr = jahrRows.reduce((s, r) => s + Number(r.brutto_gesamt ?? 0), 0);
  const nachTraeger = jahrRows.reduce<Record<string, number>>((acc, r) => {
    const key = String(r.kostentraeger ?? "sonstiges");
    acc[key] = (acc[key] ?? 0) + Number(r.brutto_gesamt ?? 0);
    return acc;
  }, {});

  const { count: offeneVorgaenge } = await supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("auftraggeber_kunde_id", session.kunde.id)
    .eq("kunde_objekt_id", objektId)
    .not("vorgang_phase", "in", '("abgeschlossen","abgelehnt")');

  const { count: pruefpflichtenFaellig } = await supabaseAdmin
    .from("objekt_pruefpflichten")
    .select("id", { count: "exact", head: true })
    .eq("kunde_objekt_id", objektId)
    .eq("status", "aktiv")
    .lte("naechste_faellig", new Date().toISOString().slice(0, 10));

  const { count: fremdVorgaenge } = await supabaseAdmin
    .from("fremd_vorgaenge")
    .select("id", { count: "exact", head: true })
    .eq("kunde_objekt_id", objektId);

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
