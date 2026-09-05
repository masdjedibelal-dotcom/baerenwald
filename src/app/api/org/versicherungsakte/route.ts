import { NextResponse } from "next/server";

import {
  ensureVersicherungsakteForAuftrag,
  ensureVersicherungsakteForLead,
  getVersicherungPdfReadinessForLead,
} from "@/lib/org/ensure-versicherungsakte";
import {
  phasePdfFilename,
  type VersicherungPdfPhase,
} from "@/lib/org/versicherung-pdf-readiness";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function parsePhase(raw: string | null): VersicherungPdfPhase {
  return raw === "ursache" ? "ursache" : "meldung";
}

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

/** Status oder PDF der Versicherungs-Teilakte. */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const auftragId = url.searchParams.get("auftragId")?.trim();
  const leadIdParam = url.searchParams.get("leadId")?.trim();
  const phase = parsePhase(url.searchParams.get("phase"));
  const statusOnly = url.searchParams.get("status") === "1";

  if (!auftragId && !leadIdParam) {
    return NextResponse.json(
      { error: "auftragId oder leadId fehlt." },
      { status: 400 }
    );
  }

  let leadId = leadIdParam ?? "";

  if (!leadId && auftragId) {
    const { data: auftrag } = await loadOrgAuftrag(auftragId, session.kunde.id);
    if (!auftrag) {
      return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
    }
    leadId = auftrag.lead_id ? String(auftrag.lead_id) : "";
    if (!leadId) {
      return NextResponse.json(
        { error: "Auftrag ohne Lead — Schadenakte nicht möglich." },
        { status: 400 }
      );
    }
  }

  const { data: lead } = await loadOrgLead(leadId, session.kunde.id);
  if (!lead) {
    return NextResponse.json({ error: "Vorgang nicht gefunden." }, { status: 404 });
  }

  if (statusOnly) {
    const readiness = await getVersicherungPdfReadinessForLead(leadId);
    if ("error" in readiness) {
      return NextResponse.json({ error: readiness.error }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...readiness });
  }

  const regenerate = url.searchParams.get("regenerate") === "1";
  const generated = await ensureVersicherungsakteForLead(leadId, {
    actorId: session.userId,
    actorRolle: session.rolle,
    phase,
  });
  if (!generated.ok) {
    return NextResponse.json({ error: generated.message }, { status: 400 });
  }

  // regenerate-Flag: ensure schreibt immer neu; ohne Flag ebenfalls neu (Teil-PDF klein)
  void regenerate;

  const pdfRes = await fetch(generated.url);
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
      "Content-Disposition": `attachment; filename="${phasePdfFilename(leadId, phase)}"`,
    },
  });
}

/** Teil-PDF neu erzeugen. */
export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: { auftragId?: string; leadId?: string; phase?: string };
  try {
    body = (await req.json()) as {
      auftragId?: string;
      leadId?: string;
      phase?: string;
    };
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const phase = parsePhase(body.phase ?? null);
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
      phase,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, url: result.url, phase: result.phase });
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
    phase,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, url: result.url, phase: result.phase });
}
