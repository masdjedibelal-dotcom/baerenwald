import { NextResponse } from "next/server";

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
    .select("id, bezeichnung, wohnflaeche_m2, sort_order, aktiv")
    .eq("kunde_objekt_id", objektId)
    .eq("aktiv", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ einheiten: data ?? [] });
}

type Body = {
  objektId?: string;
  bezeichnung?: string;
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
    wohnflaeche_m2: body.wohnflaeche_m2 ?? null,
  });

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
