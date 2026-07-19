import { NextResponse } from "next/server";

import {
  assertOrgObjekt,
  requireOrgWrite,
} from "@/lib/org/assert-org-objekt";
import { GPT_VIZ_STORAGE_BUCKET } from "@/lib/gpt-viz/constants";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

const PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * POST — Gebäudefoto hochladen (FormData: objektId, file).
 * Speichert in Storage + `kunden_objekte.cover_url`.
 */
export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) {
    return NextResponse.json({ error: write.error }, { status: write.status });
  }

  const form = await req.formData();
  const objektId = String(form.get("objektId") ?? "").trim();
  const file = form.get("file");

  if (!objektId) {
    return NextResponse.json({ error: "objektId fehlt." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "Datei fehlt." }, { status: 400 });
  }
  if (!PHOTO_TYPES.has(file.type) && !file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Nur Bilder (JPG, PNG, WebP) erlaubt." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Datei zu groß (max. 8 MB)." }, { status: 400 });
  }
  if (!(await assertOrgObjekt(session.kunde.id, objektId))) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `objekt-cover/${session.kunde.id}/${objektId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from(GPT_VIZ_STORAGE_BUCKET)
    .upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: false });

  if (upErr) {
    console.error("[objekt-cover]", upErr.message);
    return NextResponse.json({ error: "Upload fehlgeschlagen." }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin.storage
    .from(GPT_VIZ_STORAGE_BUCKET)
    .getPublicUrl(path);

  const coverUrl = pub.publicUrl;

  const { error: dbErr } = await supabaseAdmin
    .from("kunden_objekte")
    .update({ cover_url: coverUrl })
    .eq("id", objektId)
    .eq("kunde_id", session.kunde.id);

  if (dbErr) {
    console.error("[objekt-cover] db", dbErr.message);
    return NextResponse.json(
      { error: "Foto gespeichert, aber Objekt konnte nicht aktualisiert werden." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, cover_url: coverUrl });
}
