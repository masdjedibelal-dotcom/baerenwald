import { NextResponse } from "next/server";

import {
  assertOrgObjekt,
  requireOrgWrite,
} from "@/lib/org/assert-org-objekt";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

const ROLLEN = ["hausmeister", "beirat", "dienstleister", "notfall", "sonstiges"] as const;

export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const objektId = new URL(req.url).searchParams.get("objektId")?.trim();
  if (!objektId) {
    return NextResponse.json({ error: "objektId fehlt." }, { status: 400 });
  }
  if (!(await assertOrgObjekt(session.kunde.id, objektId))) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("objekt_kontakte")
    .select("*")
    .eq("kunde_objekt_id", objektId)
    .eq("aktiv", true)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kontakte: data ?? [] });
}

type Body = {
  id?: string;
  objektId?: string;
  rolle?: string;
  name?: string;
  telefon?: string;
  email?: string;
  notiz?: string;
};

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) return NextResponse.json({ error: write.error }, { status: write.status });

  const body = (await req.json()) as Body;
  const objektId = String(body.objektId ?? "").trim();
  const name = String(body.name ?? "").trim();
  const rolle = String(body.rolle ?? "sonstiges").trim();

  if (!objektId || !name) {
    return NextResponse.json({ error: "Objekt und Name erforderlich." }, { status: 400 });
  }
  if (!ROLLEN.includes(rolle as (typeof ROLLEN)[number])) {
    return NextResponse.json({ error: "Ungültige Rolle." }, { status: 400 });
  }
  if (!(await assertOrgObjekt(session.kunde.id, objektId))) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("objekt_kontakte")
    .insert({
      kunde_id: session.kunde.id,
      kunde_objekt_id: objektId,
      rolle,
      name,
      telefon: body.telefon?.trim() || null,
      email: body.email?.trim() || null,
      notiz: body.notiz?.trim() || null,
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

  const { data: row } = await supabaseAdmin
    .from("objekt_kontakte")
    .select("id")
    .eq("id", id)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name != null) patch.name = String(body.name).trim();
  if (body.rolle != null) patch.rolle = body.rolle;
  if (body.telefon != null) patch.telefon = body.telefon.trim() || null;
  if (body.email != null) patch.email = body.email.trim() || null;
  if (body.notiz != null) patch.notiz = body.notiz.trim() || null;

  const { error } = await supabaseAdmin.from("objekt_kontakte").update(patch).eq("id", id);
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
    .from("objekt_kontakte")
    .update({ aktiv: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
