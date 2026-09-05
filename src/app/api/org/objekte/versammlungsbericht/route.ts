import { NextResponse } from "next/server";

import { generateVersammlungsberichtPdf } from "@/lib/org/generate-versammlungsbericht-pdf";
import { loadVersammlungsberichtPortal } from "@/lib/org/objektakte/load-versammlungsbericht-portal";
import { requireOrganisationSession } from "@/lib/org/require-org-session";

export const runtime = "nodejs";

/** Versammlungsbericht als PDF (pdf-lib). Rendert immer — auch leerer Zeitraum. */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const objektId = url.searchParams.get("objektId")?.trim();
  const von = url.searchParams.get("von")?.trim() ?? "";
  const bis = url.searchParams.get("bis")?.trim() ?? "";
  const einzelpreise = url.searchParams.get("einzelpreise") !== "0";

  if (!objektId) {
    return NextResponse.json({ error: "objektId fehlt." }, { status: 400 });
  }

  const payload = await loadVersammlungsberichtPortal({
    kundeId: session.kunde.id,
    objektId,
    von,
    bis,
    einzelpreise,
  });

  if (!payload) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const pdf = await generateVersammlungsberichtPdf(payload);
  const slug = payload.objektTitel.replace(/[^\wäöüß\-]+/gi, "_").slice(0, 40);

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Versammlungsbericht_${slug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
