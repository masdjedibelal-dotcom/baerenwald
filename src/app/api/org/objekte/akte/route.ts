import { NextResponse } from "next/server";

import { loadObjektAktePortal } from "@/lib/org/objektakte/load-objekt-akte-portal";
import { requireOrganisationSession } from "@/lib/org/require-org-session";

export const runtime = "nodejs";

/** Read-only: Anlagen, Historie, KPIs für HV-Objekt-Detail. */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const objektId = new URL(req.url).searchParams.get("objektId")?.trim();
  if (!objektId) {
    return NextResponse.json({ error: "objektId fehlt." }, { status: 400 });
  }

  const payload = await loadObjektAktePortal(session.kunde.id, objektId);
  if (!payload) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(payload);
}
