import { NextResponse } from "next/server";

import { notifyHandwerkerLeistungZuweisung } from "@/lib/partner/notify-partner-zuweisung";

function authorize(request: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

/**
 * POST — vom CRM nach Handwerker-Zuweisung an einer Leistung.
 * Body: { auftragId, handwerkerId, positionId?, positionIds? }
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    auftragId?: string;
    handwerkerId?: string;
    positionId?: string;
    positionIds?: string[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger Body" }, { status: 400 });
  }

  const result = await notifyHandwerkerLeistungZuweisung({
    auftragId: String(body.auftragId ?? ""),
    handwerkerId: String(body.handwerkerId ?? ""),
    positionId: body.positionId,
    positionIds: body.positionIds,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
