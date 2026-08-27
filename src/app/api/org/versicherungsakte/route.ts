import { NextResponse } from "next/server";

import {
  ensureVersicherungsakteForAuftrag,
  ensureVersicherungsakteForLead,
} from "@/lib/org/ensure-versicherungsakte";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

async function loadOrgAuftrag(auftragId: string, kundeId: string) {
  return supabaseAdmin
    .from("auftraege")
    .select("id, kunde_id, versicherungsakte_pdf_url, kostentraeger, lead_id")
    .eq("id", auftragId)
    .eq("kunde_id", kundeId)
    .maybeSingle();
}

async function loadOrgLead(leadId: string, kundeId: string) {
  return supabaseAdmin
    .from("leads")
    .select(
      "id, auftraggeber_kunde_id, kunde_id, versicherungsakte_pdf_url, kostentraeger"
    )
    .eq("id", leadId)
    .maybeSingle()
    .then(async (r) => {
      const lead = r.data;
      if (!lead) return { data: null as typeof r.data, error: r.error };
      const owner =
        String(lead.auftraggeber_kunde_id ?? "") === kundeId ||
        String(lead.kunde_id ?? "") === kundeId;
      return { data: owner ? lead : null, error: r.error };
    });
}

/** PDF der Schadenakte herunterladen (ggf. zuvor erzeugen). */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const auftragId = url.searchParams.get("auftragId")?.trim();
  const leadId = url.searchParams.get("leadId")?.trim();

  if (!auftragId && !leadId) {
    return NextResponse.json(
      { error: "auftragId oder leadId fehlt." },
      { status: 400 }
    );
  }

  let pdfUrl = "";
  let fileKey = "";

  if (leadId) {
    const { data: lead } = await loadOrgLead(leadId, session.kunde.id);
    if (!lead) {
      return NextResponse.json({ error: "Vorgang nicht gefunden." }, { status: 404 });
    }
    pdfUrl = lead.versicherungsakte_pdf_url
      ? String(lead.versicherungsakte_pdf_url)
      : "";
    const regenerate = url.searchParams.get("regenerate") === "1";
    if (!pdfUrl || regenerate) {
      const generated = await ensureVersicherungsakteForLead(leadId, {
        actorId: session.userId,
        actorRolle: session.rolle,
      });
      if (!generated.ok) {
        return NextResponse.json({ error: generated.message }, { status: 404 });
      }
      pdfUrl = generated.url;
    }
    fileKey = leadId.slice(0, 8);
  } else if (auftragId) {
    const { data: auftrag } = await loadOrgAuftrag(auftragId, session.kunde.id);
    if (!auftrag) {
      return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
    }
    pdfUrl = auftrag.versicherungsakte_pdf_url
      ? String(auftrag.versicherungsakte_pdf_url)
      : "";
    if (!pdfUrl) {
      const generated = await ensureVersicherungsakteForAuftrag(auftragId, {
        actorId: session.userId,
        actorRolle: session.rolle,
      });
      if (!generated.ok) {
        return NextResponse.json({ error: generated.message }, { status: 404 });
      }
      pdfUrl = generated.url;
    }
    fileKey = auftragId.slice(0, 8);
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
      "Content-Disposition": `attachment; filename="versicherungsakte-${fileKey}.pdf"`,
    },
  });
}

/** Schadenakte neu erzeugen / aktualisieren. */
export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: { auftragId?: string; leadId?: string };
  try {
    body = (await req.json()) as { auftragId?: string; leadId?: string };
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const auftragId = String(body.auftragId ?? "").trim();
  const leadId = String(body.leadId ?? "").trim();

  if (leadId) {
    const { data: lead } = await loadOrgLead(leadId, session.kunde.id);
    if (!lead) {
      return NextResponse.json({ error: "Vorgang nicht gefunden." }, { status: 404 });
    }
    const result = await ensureVersicherungsakteForLead(leadId, {
      actorId: session.userId,
      actorRolle: session.rolle,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, url: result.url });
  }

  if (!auftragId) {
    return NextResponse.json(
      { error: "auftragId oder leadId fehlt." },
      { status: 400 }
    );
  }

  const { data: auftrag } = await loadOrgAuftrag(auftragId, session.kunde.id);
  if (!auftrag) {
    return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  }

  const result = await ensureVersicherungsakteForAuftrag(auftragId, {
    actorId: session.userId,
    actorRolle: session.rolle,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, url: result.url });
}
