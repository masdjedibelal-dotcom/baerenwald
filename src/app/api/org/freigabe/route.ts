import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { requireOrgFreigabeSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";
import { freigabeEntscheiden } from "@/teo/hv/vorgang-aktionen";

export const runtime = "nodejs";

type FreigabeAktion = "freigegeben" | "abgelehnt" | "beschluss_ausstehend";

type PostBody = {
  leadId: string;
  aktion: FreigabeAktion;
  betrag_eur?: number | null;
  notiz?: string | null;
  beschluss_versammlung_am?: string | null;
  beschluss_protokoll_url?: string | null;
};

type PatchBody = {
  leadId: string;
  beschluss_versammlung_am?: string | null;
  beschluss_protokoll_url?: string | null;
};


function parseIsoDate(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

/**
 * HV-Angebots-Freigabe / Ablehnung / Beschluss-Parkzustand.
 */
export async function POST(req: Request) {
  const session = await requireOrgFreigabeSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as PostBody;
  const leadId = String(body.leadId ?? "").trim();
  const aktion = body.aktion;
  if (
    !leadId ||
    (aktion !== "freigegeben" &&
      aktion !== "abgelehnt" &&
      aktion !== "beschluss_ausstehend")
  ) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const r = await freigabeEntscheiden(session.kunde.id, leadId, aktion, {
    userId: session.userId,
    rolle: session.rolle,
    betragEur: body.betrag_eur ?? null,
    notiz: body.notiz ?? null,
    beschlussAm: body.beschluss_versammlung_am ?? null,
    protokollUrl: body.beschluss_protokoll_url ?? null,
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, status: r.status });
}

/** Meta-Felder im Beschluss-Parkzustand aktualisieren. */
export async function PATCH(req: Request) {
  const session = await requireOrgFreigabeSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as PatchBody;
  const leadId = String(body.leadId ?? "").trim();
  if (!leadId) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const orgId = session.kunde.id;
  const {data: lead, error: __dbErr175_1} = await supabaseAdmin
    .from("leads")
    .select("id, auftraggeber_kunde_id, kunde_id, org_freigabe_status")
    .eq("id", leadId)
    .maybeSingle();
  if (__dbErr175_1) logDbError('app/api/org/freigabe/route:leads', __dbErr175_1)
  if (!lead || (lead.auftraggeber_kunde_id !== orgId && lead.kunde_id !== orgId)) {
    return NextResponse.json({ error: "Lead nicht gefunden." }, { status: 404 });
  }

  if ((lead.org_freigabe_status ?? "").trim() !== "beschluss_ausstehend") {
    return NextResponse.json(
      { error: "Meta-Felder nur im Beschluss-Parkzustand änderbar." },
      { status: 409 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.beschluss_versammlung_am !== undefined) {
    patch.beschluss_versammlung_am = parseIsoDate(body.beschluss_versammlung_am);
  }
  if (body.beschluss_protokoll_url !== undefined) {
    const url = body.beschluss_protokoll_url?.trim();
    patch.beschluss_protokoll_url = url || null;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Keine Felder zum Aktualisieren." }, { status: 400 });
  }

  const { error: updErr } = await supabaseAdmin
    .from("leads")
    .update(patch)
    .eq("id", leadId);
  if (updErr) logDbError('app/api/org/freigabe/route:leads', updErr)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
