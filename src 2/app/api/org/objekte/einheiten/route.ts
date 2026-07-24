import { NextResponse } from "next/server";

import { assertOrgEinheit } from "@/lib/org/assert-org-objekt";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const objektId = new URL(req.url).searchParams.get("objektId")?.trim();
  if (!objektId) {
    return NextResponse.json({ error: "objektId fehlt." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id, bezeichnung, etage, wohnflaeche_m2, sort_order, aktiv")
    .eq("kunde_objekt_id", objektId)
    .eq("aktiv", true)
    .order("sort_order", { ascending: true });

  if (error) {
    // Fallback falls Etage-Migration noch nicht live ist
    if (/etage/i.test(error.message)) {
      const fallback = await supabaseAdmin
        .from("objekt_einheiten")
        .select("id, bezeichnung, wohnflaeche_m2, sort_order, aktiv")
        .eq("kunde_objekt_id", objektId)
        .eq("aktiv", true)
        .order("sort_order", { ascending: true });
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      }
      return NextResponse.json({ einheiten: fallback.data ?? [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ einheiten: data ?? [] });
}

type Body = {
  objektId?: string;
  id?: string;
  bezeichnung?: string;
  etage?: string | null;
  wohnflaeche_m2?: number;
};

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as Body;
  const objektId = String(body.objektId ?? "").trim();
  const bezeichnung = String(body.bezeichnung ?? "").trim();
  if (!objektId || !bezeichnung) {
    return NextResponse.json({ error: "Objekt und Bezeichnung erforderlich." }, { status: 400 });
  }

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id")
    .eq("id", objektId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!objekt) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("objekt_einheiten").insert({
    kunde_objekt_id: objektId,
    bezeichnung,
    etage: body.etage?.trim() || null,
    wohnflaeche_m2: body.wohnflaeche_m2 ?? null,
  });

  if (error) {
    if (/etage/i.test(error.message)) {
      const retry = await supabaseAdmin.from("objekt_einheiten").insert({
        kunde_objekt_id: objektId,
        bezeichnung,
        wohnflaeche_m2: body.wohnflaeche_m2 ?? null,
      });
      if (retry.error) {
        return NextResponse.json({ error: retry.error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as Body;
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id fehlt." }, { status: 400 });
  }

  if (!(await assertOrgEinheit(session.kunde.id, id))) {
    return NextResponse.json({ error: "Einheit nicht gefunden." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (body.bezeichnung !== undefined) {
    patch.bezeichnung = String(body.bezeichnung).trim() || null;
  }
  if (body.etage !== undefined) {
    patch.etage = body.etage?.trim() || null;
  }
  if (body.wohnflaeche_m2 !== undefined) {
    patch.wohnflaeche_m2 = body.wohnflaeche_m2;
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("objekt_einheiten")
    .update(patch)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("objekt_einheiten")
    .update({ aktiv: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
