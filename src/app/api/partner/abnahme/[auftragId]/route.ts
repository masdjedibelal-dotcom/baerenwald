import { NextResponse } from "next/server";

import { getPartnerAbnahmeStatus } from "@/app/actions/partner-abnahmeprotokoll";

export const runtime = "nodejs";

/** GET /api/partner/abnahme/[auftragId] */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ auftragId: string }> }
) {
  const { auftragId } = await params;
  const url = new URL(req.url);
  const protokoll = url.searchParams.get("protokoll");
  const r = await getPartnerAbnahmeStatus(auftragId, protokoll);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  }
  return NextResponse.json(r);
}
