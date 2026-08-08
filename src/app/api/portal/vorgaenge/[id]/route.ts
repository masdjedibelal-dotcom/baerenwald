import { NextResponse } from "next/server";

import { requireAccountSession } from "@/lib/account/require-account-session";
import { getPortalVorgangDetail } from "@/lib/portal/get-portal-vorgang-detail";
import { requireOrganisationSession } from "@/lib/org/require-org-session";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Detail on demand inkl. Signed URLs (Bautagebuch, Abnahme, Befund).
 * Query: ?hv=1 für Organisations-Portal.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const vorgangId = String(id ?? "").trim();
  if (!vorgangId) {
    return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
  }

  const hv = new URL(req.url).searchParams.get("hv") === "1";

  let kundeId: string;
  if (hv) {
    const session = await requireOrganisationSession();
    if (!session.ok) {
      return NextResponse.json(
        { error: session.error },
        { status: session.status }
      );
    }
    kundeId = session.kunde.id;
  } else {
    const session = await requireAccountSession();
    if (!session.ok || session.kind !== "kunde") {
      return NextResponse.json(
        { error: session.ok ? "Kein Kundenportal." : session.error },
        { status: session.ok ? 403 : session.status }
      );
    }
    kundeId = session.entityId;
  }

  const detail = await getPortalVorgangDetail({
    sessionKundeId: kundeId,
    vorgangId,
    hvPortalMode: hv,
  });

  if (!detail) {
    return NextResponse.json({ error: "Vorgang nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    item: detail.item,
    partnerBefund: detail.partnerBefund ?? null,
  });
}
