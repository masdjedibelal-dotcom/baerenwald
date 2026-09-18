import { NextResponse } from "next/server";

import { uploadMeldungMedia } from "@/lib/org/meldung-storage";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Foto/Video-Upload für HV-Direkt-Meldung (vor persist).
 * Speichert unter `meldung/hv-{kundeId}/…` — analog Melder-Funnel.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Storage nicht verfügbar." }, { status: 503 });
  }

  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei." }, { status: 400 });
  }

  const folder = `hv-${session.kunde.id}`;
  const uploaded = await uploadMeldungMedia(folder, file);
  if (!uploaded.ok) {
    return NextResponse.json({ error: uploaded.error }, { status: 400 });
  }

  return NextResponse.json({
    url: uploaded.publicUrl,
    typ: uploaded.typ,
  });
}
