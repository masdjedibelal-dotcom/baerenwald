import { NextResponse } from "next/server";

import {
  assertOrgObjekt,
  requireOrgWrite,
} from "@/lib/org/assert-org-objekt";
import { GPT_VIZ_STORAGE_BUCKET } from "@/lib/gpt-viz/constants";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

const KATEGORIEN = ["versicherung", "vertrag", "protokoll", "grundbuch", "sonstiges"] as const;

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
    .from("objekt_dokumente")
    .select("*")
    .eq("kunde_objekt_id", objektId)
    .eq("status", "aktiv")
    .order("ablauf_datum", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dokumente: data ?? [] });
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
  const kategorie = String(form.get("kategorie") ?? "sonstiges").trim();
  const ablaufDatum = String(form.get("ablaufDatum") ?? "").trim() || null;
  const file = form.get("file");

  if (!objektId || !titel) {
    return NextResponse.json({ error: "Objekt und Titel erforderlich." }, { status: 400 });
  }
  if (!KATEGORIEN.includes(kategorie as (typeof KATEGORIEN)[number])) {
    return NextResponse.json({ error: "Ungültige Kategorie." }, { status: 400 });
  }
  if (!(await assertOrgObjekt(session.kunde.id, objektId))) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  let storageUrl: string | null = null;
  let storagePath: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Datei zu groß (max. 15 MB)." }, { status: 400 });
    }
    const ext = file.name.split(".").pop()?.slice(0, 8) || "bin";
    storagePath = `objekt-akte/${session.kunde.id}/${objektId}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabaseAdmin.storage
      .from(GPT_VIZ_STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });
    if (upErr) {
      return NextResponse.json({ error: "Upload fehlgeschlagen." }, { status: 500 });
    }
    const { data: pub } = supabaseAdmin.storage
      .from(GPT_VIZ_STORAGE_BUCKET)
      .getPublicUrl(storagePath);
    storageUrl = pub.publicUrl;
  }

  const { data, error } = await supabaseAdmin
    .from("objekt_dokumente")
    .insert({
      kunde_id: session.kunde.id,
      kunde_objekt_id: objektId,
      kategorie,
      titel,
      ablauf_datum: ablaufDatum,
      storage_path: storagePath,
      storage_url: storageUrl,
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
    .from("objekt_dokumente")
    .update({ status: "archiviert", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
