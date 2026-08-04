import { NextResponse } from "next/server";

import {
  assertOrgObjekt,
  requireOrgWrite,
} from "@/lib/org/assert-org-objekt";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import {
  assertOrgMediaFile,
  uploadOrgPublicImage,
} from "@/lib/portal2/org-media-upload";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

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
  const checked = assertOrgMediaFile(form.get("file"));

  if (!objektId) {
    return NextResponse.json({ error: "objektId fehlt." }, { status: 400 });
  }
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: checked.status });
  }
  if (!(await assertOrgObjekt(session.kunde.id, objektId))) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const uploaded = await uploadOrgPublicImage({
    kind: "objekt-cover",
    kundeId: session.kunde.id,
    file: checked.file,
    scopeId: objektId,
  });
  if (!uploaded.ok) {
    return NextResponse.json({ error: uploaded.error }, { status: 500 });
  }

  const coverUrl = uploaded.url;

  const { error: dbErr } = await supabaseAdmin
    .from("kunden_objekte")
    .update({ cover_url: coverUrl })
    .eq("id", objektId)
    .eq("kunde_id", session.kunde.id);

  if (dbErr) {
    console.error("[objekt-cover] db", dbErr.message);
    const migrationHint = /cover_url/i.test(dbErr.message)
      ? " Spalte cover_url fehlt ggf. — Migration 20260719170000_objekt_cover_url.sql anwenden."
      : "";
    return NextResponse.json(
      {
        error: `Foto gespeichert, aber Objekt konnte nicht aktualisiert werden.${migrationHint}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, cover_url: coverUrl });
}
