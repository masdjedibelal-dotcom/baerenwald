import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { PDF_UI_ERROR, renderPdfViaCrm } from "@/lib/pdf/render-via-crm";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** PDF-Export Bautagebuch für Versicherung — Auth Portal, Render CRM (O5). */
export async function GET(req: Request) {
  try {
    return await handleBautagebuchVersicherungGet(req);
  } catch (e) {
    console.error("[bautagebuch-versicherung] 500:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : PDF_UI_ERROR },
      { status: 500 }
    );
  }
}

async function handleBautagebuchVersicherungGet(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const auftragId = url.searchParams.get("auftragId")?.trim();
  if (!auftragId) {
    return NextResponse.json({ error: "auftragId fehlt." }, { status: 400 });
  }

  const {data: auftrag, error: __dbErr160_1} = await supabaseAdmin
    .from("auftraege")
    .select("id, kunde_id, titel, lead_id, versicherungs_nr, kostentraeger")
    .eq("id", auftragId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();
  if (__dbErr160_1) logDbError('app/api/org/bautagebuch-versicherung/route:auftraege', __dbErr160_1)
  if (!auftrag) {
    return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  }

  let versNr = auftrag.versicherungs_nr ? String(auftrag.versicherungs_nr) : null;
  let schadenNr: string | null = null;
  if (auftrag.lead_id) {
    const {data: lead, error: __dbErr161_2} = await supabaseAdmin
      .from("leads")
      .select("versicherungs_nr, schaden_nr")
      .eq("id", auftrag.lead_id)
      .maybeSingle();
    if (__dbErr161_2) logDbError('app/api/org/bautagebuch-versicherung/route:leads', __dbErr161_2)
    if (!versNr && lead?.versicherungs_nr) {
      versNr = String(lead.versicherungs_nr);
    }
    if (lead?.schaden_nr) {
      schadenNr = String(lead.schaden_nr).trim() || null;
    }
  }

  const {data: rows, error: __dbErr162_3} = await supabaseAdmin
    .from("auftrag_bautagebuch_eintraege")
    .select("titel, beschreibung, datum, foto_urls, eintrag_typ")
    .eq("auftrag_id", auftragId)
    .order("datum", { ascending: true });
  if (__dbErr162_3) logDbError('app/api/org/bautagebuch-versicherung/route:auftrag_bautagebuch_eintraege', __dbErr162_3)
  const pdfBytes = await renderPdfViaCrm("bautagebuch-versicherung", {
    orgName: session.kunde.name?.trim() || "Verwaltung",
    objektTitel: String(auftrag.titel ?? "Vorgang"),
    versicherungsNr: versNr,
    schadenNr,
    eintraege: (rows ?? []).map((r) => ({
      datum: String(r.datum ?? ""),
      titel: String(r.titel ?? "Eintrag"),
      text: String(r.beschreibung ?? "").trim(),
      fotoCount: Array.isArray(r.foto_urls) ? r.foto_urls.length : 0,
      typ: r.eintrag_typ ? String(r.eintrag_typ) : null,
    })),
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bautagebuch-versicherung-${auftragId.slice(0, 8)}.pdf"`,
    },
  });
}
