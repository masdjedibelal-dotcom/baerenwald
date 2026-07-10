import { NextResponse } from "next/server";

import {
  assertOrgEinheit,
  requireOrgWrite,
} from "@/lib/org/assert-org-objekt";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const objektId = new URL(req.url).searchParams.get("objektId")?.trim();
  const einheitId = new URL(req.url).searchParams.get("einheitId")?.trim();

  if (einheitId) {
    if (!(await assertOrgEinheit(session.kunde.id, einheitId))) {
      return NextResponse.json({ error: "Einheit nicht gefunden." }, { status: 404 });
    }
    const { data, error } = await supabaseAdmin
      .from("einheit_bewohner")
      .select("*")
      .eq("objekt_einheit_id", einheitId)
      .eq("aktiv", true)
      .is("anonymisiert_am", null)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bewohner: data ?? [] });
  }

  if (!objektId) {
    return NextResponse.json({ error: "objektId oder einheitId fehlt." }, { status: 400 });
  }

  const { data: einheiten } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id")
    .eq("kunde_objekt_id", objektId);

  const ids = (einheiten ?? []).map((e) => e.id);
  if (!ids.length) return NextResponse.json({ bewohner: [] });

  const { data, error } = await supabaseAdmin
    .from("einheit_bewohner")
    .select("*, objekt_einheiten(bezeichnung)")
    .in("objekt_einheit_id", ids)
    .eq("kunde_id", session.kunde.id)
    .eq("aktiv", true)
    .is("anonymisiert_am", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bewohner: data ?? [] });
}

type Body = {
  id?: string;
  einheitId?: string;
  name?: string;
  telefon?: string;
  email?: string;
};

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) return NextResponse.json({ error: write.error }, { status: write.status });

  const body = (await req.json()) as Body;
  const einheitId = String(body.einheitId ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!einheitId || !name) {
    return NextResponse.json({ error: "Einheit und Name erforderlich." }, { status: 400 });
  }
  if (!(await assertOrgEinheit(session.kunde.id, einheitId))) {
    return NextResponse.json({ error: "Einheit nicht gefunden." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("einheit_bewohner")
    .insert({
      kunde_id: session.kunde.id,
      objekt_einheit_id: einheitId,
      name,
      telefon: body.telefon?.trim() || null,
      email: body.email?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) return NextResponse.json({ error: write.error }, { status: write.status });

  const body = (await req.json()) as Body;
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id fehlt." }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name != null) patch.name = String(body.name).trim();
  if (body.telefon != null) patch.telefon = body.telefon.trim() || null;
  if (body.email != null) patch.email = body.email.trim() || null;

  const { error } = await supabaseAdmin
    .from("einheit_bewohner")
    .update(patch)
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) return NextResponse.json({ error: write.error }, { status: write.status });

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id fehlt." }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("einheit_bewohner")
    .update({ aktiv: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
