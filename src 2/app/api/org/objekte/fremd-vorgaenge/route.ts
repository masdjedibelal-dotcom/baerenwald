import { NextResponse } from "next/server";

import {
  assertOrgObjekt,
  requireOrgWrite,
} from "@/lib/org/assert-org-objekt";
import { GPT_VIZ_STORAGE_BUCKET } from "@/lib/gpt-viz/constants";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

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
    .from("fremd_vorgaenge")
    .select("*")
    .eq("kunde_objekt_id", objektId)
    .order("datum", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) return NextResponse.json({ error: write.error }, { status: write.status });

  const form = await req.formData();
  const objektId = String(form.get("objektId") ?? "").trim();
  const titel = String(form.get("titel") ?? "").trim();
  const datum = String(form.get("datum") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const kategorie = String(form.get("kategorie") ?? "sonstiges").trim();
  const betragRaw = String(form.get("betrag") ?? "").trim();
  const notiz = String(form.get("notiz") ?? "").trim() || null;
  const file = form.get("file");

  if (!objektId || !titel) {
    return NextResponse.json({ error: "Objekt und Titel erforderlich." }, { status: 400 });
  }
  if (!(await assertOrgObjekt(session.kunde.id, objektId))) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  let dokumentUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    const path = `fremd-vorgang/${session.kunde.id}/${objektId}/${Date.now()}-${file.name.slice(0, 40)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabaseAdmin.storage
      .from(GPT_VIZ_STORAGE_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (!upErr) {
      const { data: pub } = supabaseAdmin.storage.from(GPT_VIZ_STORAGE_BUCKET).getPublicUrl(path);
      dokumentUrl = pub.publicUrl;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("fremd_vorgaenge")
    .insert({
      kunde_id: session.kunde.id,
      kunde_objekt_id: objektId,
      titel,
      datum,
      kategorie,
      betrag: betragRaw ? Number(betragRaw) : null,
      notiz,
      dokument_url: dokumentUrl,
      quelle: "extern",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
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
    .from("fremd_vorgaenge")
    .delete()
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
