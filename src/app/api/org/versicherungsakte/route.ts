import { NextResponse } from "next/server";

import { ensureVersicherungsakteForAuftrag } from "@/lib/org/ensure-versicherungsakte";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

async function loadAuftragForOrg(auftragId: string, kundeId: string) {
  return supabaseAdmin
    .from("auftraege")
    .select("id, kunde_id, versicherungsakte_pdf_url, kostentraeger, lead_id")
    .eq("id", auftragId)
    .eq("kunde_id", kundeId)
    .maybeSingle();
}

/** Download der Schadenakte; erzeugt sie bei Bedarf neu. */
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

  const { data: auftrag } = await loadAuftragForOrg(auftragId, session.kunde.id);

  if (!auftrag) {
    return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  }

  let pdfUrl = auftrag.versicherungsakte_pdf_url
    ? String(auftrag.versicherungsakte_pdf_url)
    : "";

  if (!pdfUrl) {
    const created = await ensureVersicherungsakteForAuftrag(auftragId, {
      actorId: session.userId,
      actorRolle: session.rolle,
    });
    if (!created.ok) {
      return NextResponse.json({ error: created.message }, { status: 404 });
    }
    pdfUrl = created.url;
  }

  const pdfRes = await fetch(pdfUrl);
  if (!pdfRes.ok) {
    return NextResponse.json(
      { error: "PDF konnte nicht geladen werden." },
      { status: 502 }
    );
  }

  const buf = await pdfRes.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="versicherungsakte-${auftragId.slice(0, 8)}.pdf"`,
    },
  });
}

/** Explizit Schadenakte erzeugen/aktualisieren. */
export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: { auftragId?: string };
  try {
    body = (await req.json()) as { auftragId?: string };
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const auftragId = String(body.auftragId ?? "").trim();
  if (!auftragId) {
    return NextResponse.json({ error: "auftragId fehlt." }, { status: 400 });
  }

  const { data: auftrag } = await loadAuftragForOrg(auftragId, session.kunde.id);
  if (!auftrag) {
    return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  }

  const created = await ensureVersicherungsakteForAuftrag(auftragId, {
    actorId: session.userId,
    actorRolle: session.rolle,
  });
  if (!created.ok) {
    return NextResponse.json({ error: created.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, url: created.url });
}
