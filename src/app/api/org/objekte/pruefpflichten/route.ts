import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

type Body = {
  objektId?: string;
  typ?: string;
  intervallMonate?: number;
  letztePruefung?: string;
  naechsteFaellig?: string;
};

async function assertObjekt(kundeId: string, objektId: string) {
  const { data } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id")
    .eq("id", objektId)
    .eq("kunde_id", kundeId)
    .maybeSingle();
  return Boolean(data);
}

/** Prüfpflichten je Objekt (4.2). */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const objektId = new URL(req.url).searchParams.get("objektId")?.trim();
  if (!objektId) {
    return NextResponse.json({ error: "objektId fehlt." }, { status: 400 });
  }

  if (!(await assertObjekt(session.kunde.id, objektId))) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("objekt_pruefpflichten")
    .select("*")
    .eq("kunde_objekt_id", objektId)
    .eq("status", "aktiv")
    .order("naechste_faellig", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as Body;
  const objektId = String(body.objektId ?? "").trim();
  const typ = String(body.typ ?? "").trim();

  if (!objektId || !typ) {
    return NextResponse.json({ error: "objektId und typ erforderlich." }, { status: 400 });
  }

  if (!(await assertObjekt(session.kunde.id, objektId))) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("objekt_pruefpflichten")
    .insert({
      kunde_objekt_id: objektId,
      typ,
      intervall_monate: body.intervallMonate ?? null,
      letzte_pruefung: body.letztePruefung ?? null,
      naechste_faellig: body.naechsteFaellig ?? null,
      quelle: "manuell",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
