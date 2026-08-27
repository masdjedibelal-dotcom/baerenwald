import { NextResponse } from "next/server";

import { loadObjektFinanzPortal } from "@/lib/org/objektakte/load-objekt-finanz-portal";
import { requireOrganisationSession } from "@/lib/org/require-org-session";

export const runtime = "nodejs";

/** Kosten & Belege — KPIs und Belegliste für Zeitraum. */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const objektId = url.searchParams.get("objektId")?.trim();
  const von = url.searchParams.get("von")?.trim() ?? "";
  const bis = url.searchParams.get("bis")?.trim() ?? "";

  if (!objektId || !von || !bis) {
    return NextResponse.json(
      { error: "objektId, von und bis erforderlich." },
      { status: 400 }
    );
  }

  const payload = await loadObjektFinanzPortal({
    kundeId: session.kunde.id,
    objektId,
    von,
    bis,
  });

  if (!payload) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(payload);
}
