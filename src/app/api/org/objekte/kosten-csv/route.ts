import { NextResponse } from "next/server";

import { buildObjektKostenCsv } from "@/lib/org/objektakte/build-objekt-kosten-csv";
import { loadObjektFinanzPortal } from "@/lib/org/objektakte/load-objekt-finanz-portal";
import { requireOrganisationSession } from "@/lib/org/require-org-session";

export const runtime = "nodejs";

/** CSV-Export Kostenübersicht je Objekt (Semikolon, UTF-8 BOM). */
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

  const csv = buildObjektKostenCsv({
    objektTitel: payload.objektTitel,
    objektAdresse: payload.objektAdresse,
    von: payload.von,
    bis: payload.bis,
    rows: payload.csvRows,
    summeRechnungen: payload.gesamtKosten,
  });

  const slug = payload.objektTitel
    .replace(/[^\wäöüÄÖÜß]+/gi, "-")
    .slice(0, 24)
    .replace(/^-+|-+$/g, "");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="Kosten_${slug || "Objekt"}_${von}_${bis}.csv"`,
    },
  });
}
