import { NextResponse } from "next/server";

import { generateBautagebuchVersicherungPdf } from "@/lib/org/generate-bautagebuch-versicherung-pdf";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** PDF-Export Bautagebuch für Versicherung. */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const auftragId = url.searchParams.get("auftragId")?.trim();
  if (!auftragId) {
    return NextResponse.json({ error: "auftragId fehlt." }, { status: 400 });
  }

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id, kunde_id, titel, lead_id, versicherungs_nr, kostentraeger")
    .eq("id", auftragId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!auftrag) {
    return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  }

  let versNr = auftrag.versicherungs_nr ? String(auftrag.versicherungs_nr) : null;
  if (auftrag.lead_id) {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("versicherungs_nr")
      .eq("id", auftrag.lead_id)
      .maybeSingle();
    if (!versNr && lead?.versicherungs_nr) {
      versNr = String(lead.versicherungs_nr);
    }
  }

  const { data: rows } = await supabaseAdmin
    .from("auftrag_bautagebuch_eintraege")
    .select("titel, beschreibung, datum, foto_urls, eintrag_typ")
    .eq("auftrag_id", auftragId)
    .order("datum", { ascending: true });

  const pdfBytes = await generateBautagebuchVersicherungPdf({
    orgName: session.kunde.name?.trim() || "Verwaltung",
    objektTitel: String(auftrag.titel ?? "Vorgang"),
    versicherungsNr: versNr,
    schadenNr: versNr,
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
