import { NextResponse } from "next/server";

import { notifyPartnerBautagebuchAnfrage } from "@/lib/partner/notify-partner-bautagebuch-anfrage";

function authorize(request: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

/**
 * POST — CRM fordert Tagebucheintrag vom Handwerker an.
 * Body: { auftragId, handwerkerId, notiz? }
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger Body" }, { status: 400 });
  }

  const auftragId = String(body.auftragId ?? "").trim();
  const handwerkerId = String(body.handwerkerId ?? "").trim();
  const notiz = body.notiz != null ? String(body.notiz) : null;

  if (!auftragId || !handwerkerId) {
    return NextResponse.json(
      { ok: false, error: "auftragId und handwerkerId fehlen." },
      { status: 400 }
    );
  }

  const result = await notifyPartnerBautagebuchAnfrage({
    auftragId,
    handwerkerId,
    notiz,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
