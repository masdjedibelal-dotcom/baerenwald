import { NextResponse } from "next/server";

import {
  assertOrgLead,
  assertOrgObjekt,
  requireOrgWrite,
} from "@/lib/org/assert-org-objekt";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** Akten-Notizen / Wiedervorlagen am Objekt oder Vorgang. */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const objektId = url.searchParams.get("objektId")?.trim();
  const leadId = url.searchParams.get("leadId")?.trim();

  let query = supabaseAdmin
    .from("akten_notizen")
    .select("*")
    .eq("kunde_id", session.kunde.id)
    .order("created_at", { ascending: false });

  if (leadId) {
    if (!(await assertOrgLead(session.kunde.id, leadId))) {
      return NextResponse.json({ error: "Vorgang nicht gefunden." }, { status: 404 });
    }
    query = query.eq("lead_id", leadId);
  } else {
    if (!objektId) {
      return NextResponse.json(
        { error: "objektId oder leadId fehlt." },
        { status: 400 }
      );
    }
    if (!(await assertOrgObjekt(session.kunde.id, objektId))) {
      return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
    }
    query = query.eq("bezug_typ", "objekt").eq("kunde_objekt_id", objektId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ notizen: data ?? [] });
}

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) {
    return NextResponse.json({ error: write.error }, { status: write.status });
  }

  const body = (await req.json()) as {
    text?: string;
    leadId?: string;
    objektId?: string;
    wiedervorlageAm?: string | null;
  };
  const text = String(body.text ?? "").trim();
  if (text.length < 2) {
    return NextResponse.json({ error: "Text erforderlich." }, { status: 400 });
  }

  const leadId = body.leadId?.trim();
  const objektId = body.objektId?.trim();

  if (leadId) {
    const lead = await assertOrgLead(session.kunde.id, leadId);
    if (!lead) {
      return NextResponse.json({ error: "Vorgang nicht gefunden." }, { status: 404 });
    }
    const { data, error } = await supabaseAdmin
      .from("akten_notizen")
      .insert({
        kunde_id: session.kunde.id,
        bezug_typ: "vorgang",
        lead_id: leadId,
        kunde_objekt_id: lead.kunde_objekt_id,
        text,
        wiedervorlage_am: body.wiedervorlageAm || null,
        erstellt_von: session.userId,
      })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data.id });
  }

  if (!objektId || !(await assertOrgObjekt(session.kunde.id, objektId))) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("akten_notizen")
    .insert({
      kunde_id: session.kunde.id,
      bezug_typ: "objekt",
      kunde_objekt_id: objektId,
      text,
      wiedervorlage_am: body.wiedervorlageAm || null,
      erstellt_von: session.userId,
    })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) {
    return NextResponse.json({ error: write.error }, { status: write.status });
  }

  const body = (await req.json()) as {
    id?: string;
    text?: string;
    wiedervorlageAm?: string | null;
    erledigt?: boolean;
  };
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id fehlt." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.text != null) patch.text = String(body.text).trim();
  if (body.wiedervorlageAm !== undefined) {
    patch.wiedervorlage_am = body.wiedervorlageAm || null;
  }
  if (body.erledigt) patch.erledigt_am = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("akten_notizen")
    .update(patch)
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
