import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { requireOrgAdminSession } from "@/lib/org/require-org-session";
import {
  assertOrgMediaFile,
  uploadOrgPublicImage,
} from "@/lib/portal2/org-media-upload";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * POST — Logo oder Dashboard-Hero hochladen (FormData: kind=logo|hero, file).
 * Speichert in Storage + `kunden.org_logo_url` / `kunden.org_hero_url`.
 */
export async function POST(req: Request) {
  const session = await requireOrgAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const form = await req.formData();
  const kindRaw = String(form.get("kind") ?? "").trim().toLowerCase();
  const kind = kindRaw === "hero" ? "hero" : kindRaw === "logo" ? "logo" : null;
  if (!kind) {
    return NextResponse.json(
      { error: "kind muss logo oder hero sein." },
      { status: 400 }
    );
  }

  const checked = assertOrgMediaFile(form.get("file"));
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: checked.status });
  }

  const uploaded = await uploadOrgPublicImage({
    kind,
    kundeId: session.kunde.id,
    file: checked.file,
  });
  if (!uploaded.ok) {
    return NextResponse.json({ error: uploaded.error }, { status: 500 });
  }

  const column = kind === "logo" ? "org_logo_url" : "org_hero_url";
  const { data, error } = await supabaseAdmin
    .from("kunden")
    .update({ [column]: uploaded.url })
    .eq("id", session.kunde.id)
    .select("org_logo_url, org_hero_url")
    .single();

  if (error) {
    console.error("[branding-media] db", error.message);
    const migrationHint = /org_hero_url/i.test(error.message)
      ? " Spalte org_hero_url fehlt ggf. — Migration 20260720130000_org_hero_url.sql anwenden."
      : "";
    return NextResponse.json(
      {
        error: `Bild gespeichert, aber Stammdaten konnten nicht aktualisiert werden.${migrationHint}`,
      },
      { status: 500 }
    );
  }

  await writeAuditEvent({
    entityType: "kunde",
    entityId: session.kunde.id,
    aktion: kind === "logo" ? "org_logo_hochgeladen" : "org_hero_hochgeladen",
    actorId: session.userId,
    actorRolle: session.rolle,
    kundeId: session.kunde.id,
    payload: { [column]: uploaded.url },
  });

  return NextResponse.json({
    ok: true,
    kind,
    url: uploaded.url,
    branding: data,
  });
}
