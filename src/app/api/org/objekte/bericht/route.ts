import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { PDF_UI_ERROR, renderPdfViaCrm } from "@/lib/pdf/render-via-crm";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** S12: Eigentümer-Jahresbericht als PDF — Auth Portal, Render CRM (O5). */
export async function GET(req: Request) {
  try {
    return await handleEigentuemerBerichtGet(req);
  } catch (e) {
    console.error("[eigentuemer-bericht] 500:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : PDF_UI_ERROR },
      { status: 500 }
    );
  }
}

async function handleEigentuemerBerichtGet(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const objektId = url.searchParams.get("objektId")?.trim();
  const jahrParam = url.searchParams.get("jahr");
  const jahr = jahrParam ? Number(jahrParam) : new Date().getFullYear();

  if (!objektId || !Number.isFinite(jahr)) {
    return NextResponse.json({ error: "objektId und jahr erforderlich." }, { status: 400 });
  }

  const {data: objekt, error: __dbErr199_1} = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, titel, strasse, hausnummer, plz, ort")
    .eq("id", objektId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();
  if (__dbErr199_1) logDbError('app/api/org/objekte/bericht/route:kunden_objekte', __dbErr199_1)
  if (!objekt) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const {data: kostenRows, error: __dbErr200_2} = await supabaseAdmin
    .from("v_objekt_kosten")
    .select("jahr, brutto_gesamt, kostentraeger, anzahl_rechnungen")
    .eq("kunde_id", session.kunde.id)
    .eq("kunde_objekt_id", objektId);
  if (__dbErr200_2) logDbError('app/api/org/objekte/bericht/route:v_objekt_kosten', __dbErr200_2)
  const jahrRows = (kostenRows ?? []).filter((r) => {
    return new Date(String(r.jahr)).getFullYear() === jahr;
  });

  const bruttoGesamt = jahrRows.reduce((s, r) => s + Number(r.brutto_gesamt ?? 0), 0);
  const anzahlRechnungen = jahrRows.reduce(
    (s, r) => s + Number(r.anzahl_rechnungen ?? 0),
    0
  );
  const nachTraeger = jahrRows.reduce<Record<string, number>>((acc, r) => {
    const key = String(r.kostentraeger ?? "sonstiges");
    acc[key] = (acc[key] ?? 0) + Number(r.brutto_gesamt ?? 0);
    return acc;
  }, {});

  const jahrStart = `${jahr}-01-01`;
  const jahrEnd = `${jahr}-12-31`;

  const {count: anzahlVorgaenge, error: __dbErr201_3} = await supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("auftraggeber_kunde_id", session.kunde.id)
    .eq("kunde_objekt_id", objektId)
    .gte("created_at", jahrStart)
    .lte("created_at", `${jahrEnd}T23:59:59`);
  if (__dbErr201_3) logDbError('app/api/org/objekte/bericht/route:leads', __dbErr201_3)
  const {count: pruefpflichtenFaellig, error: __dbErr202_4} = await supabaseAdmin
    .from("objekt_pruefpflichten")
    .select("id", { count: "exact", head: true })
    .eq("kunde_objekt_id", objektId)
    .eq("status", "aktiv")
    .lte("naechste_faellig", `${jahr}-12-31`);
  if (__dbErr202_4) logDbError('app/api/org/objekte/bericht/route:objekt_pruefpflichten', __dbErr202_4)
  const adresse = [objekt.strasse, objekt.hausnummer].filter(Boolean).join(" ");
  const plzOrt = [objekt.plz, objekt.ort].filter(Boolean).join(" ");

  const bytes = await renderPdfViaCrm("eigentuemer-bericht", {
    orgName:
      session.kunde.org_anzeigename?.trim() ||
      session.kunde.name?.trim() ||
      "Verwaltung",
    objektTitel: objekt.titel,
    objektAdresse: [adresse, plzOrt].filter(Boolean).join(", ") || undefined,
    jahr,
    bruttoGesamt,
    nachTraeger,
    anzahlVorgaenge: anzahlVorgaenge ?? 0,
    anzahlRechnungen,
    pruefpflichtenFaellig: pruefpflichtenFaellig ?? 0,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="jahresbericht-${objektId.slice(0, 8)}-${jahr}.pdf"`,
    },
  });
}
