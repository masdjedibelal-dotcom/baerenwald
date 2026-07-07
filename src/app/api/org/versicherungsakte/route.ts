import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** Read-only Download der Versicherungsakte (PDF-URL aus CRM). */
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
    .select("id, kunde_id, versicherungsakte_pdf_url, kostentraeger")
    .eq("id", auftragId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!auftrag?.versicherungsakte_pdf_url) {
    return NextResponse.json(
      { error: "Versicherungsakte noch nicht verfügbar." },
      { status: 404 }
    );
  }

  const pdfRes = await fetch(String(auftrag.versicherungsakte_pdf_url));
  if (!pdfRes.ok) {
    return NextResponse.json({ error: "PDF konnte nicht geladen werden." }, { status: 502 });
  }

  const buf = await pdfRes.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="versicherungsakte-${auftragId.slice(0, 8)}.pdf"`,
    },
  });
}
