import { NextResponse } from "next/server";

import {
  assertNoDuplicatePruefpflicht,
  normalizeTypInput,
  resolveActorFromSession,
  resolveGewerkIdByName,
} from "@/lib/org/pruefpflichten-helpers";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

type Body = {
  objektId?: string;
  typ?: string;
  typSchluessel?: string;
  typLabel?: string;
  intervallMonate?: number;
  letztePruefung?: string;
  naechsteFaellig?: string;
  notiz?: string;
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

/** Prüfpflichten je Objekt. */
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
    if (/objekt_pruefpflichten|does not exist/i.test(error.message)) {
      return NextResponse.json({ items: [] });
    }
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
  const normalized = normalizeTypInput(body);

  if (!objektId || !normalized) {
    return NextResponse.json(
      { error: "objektId und Typ erforderlich." },
      { status: 400 }
    );
  }

  if (!(await assertObjekt(session.kunde.id, objektId))) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  if (
    normalized.typSchluessel &&
    !(await assertNoDuplicatePruefpflicht({
      objektId,
      typSchluessel: normalized.typSchluessel,
    }))
  ) {
    return NextResponse.json(
      { error: `${normalized.typ} existiert bereits für dieses Objekt.` },
      { status: 409 }
    );
  }

  const actor = await resolveActorFromSession(session);
  const gewerkId = await resolveGewerkIdByName(normalized.gewerkName);
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("objekt_pruefpflichten")
    .insert({
      kunde_objekt_id: objektId,
      typ: normalized.typ,
      typ_schluessel: normalized.typSchluessel,
      gewerk_id: gewerkId,
      intervall_monate: body.intervallMonate ?? null,
      letzte_pruefung: body.letztePruefung ?? null,
      naechste_faellig: body.naechsteFaellig ?? null,
      notiz: body.notiz?.trim() || null,
      quelle: "manuell",
      geaendert_am: now,
      geaendert_von_name: actor.name,
      geaendert_von_quelle: actor.quelle,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
