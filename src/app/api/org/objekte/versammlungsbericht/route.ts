import { NextResponse } from "next/server";

import { loadVersammlungsberichtPortal } from "@/lib/org/objektakte/load-versammlungsbericht-portal";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { PDF_UI_ERROR, renderPdfViaCrm } from "@/lib/pdf/render-via-crm";

export const runtime = "nodejs";

/** Versammlungsbericht als PDF — Auth Portal, Render CRM (O5). */
export async function GET(req: Request) {
  try {
    return await handleVersammlungsberichtGet(req);
  } catch (e) {
    console.error("[versammlungsbericht] 500:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : PDF_UI_ERROR },
      { status: 500 }
    );
  }
}

async function handleVersammlungsberichtGet(req: Request) {
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

  const pdf = await renderPdfViaCrm("versammlung", payload as unknown as Record<string, unknown>);
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
