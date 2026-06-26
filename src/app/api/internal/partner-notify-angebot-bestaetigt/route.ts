import { NextResponse } from "next/server";

import { notifyHandwerkerAngebotBestaetigt } from "@/lib/partner/notify-partner-angebot-bestaetigt";

function authorize(request: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

/**
 * POST — vom CRM nach Bestätigung einer HW-Einreichung.
 * Body: { "anfrageId": "<angebot_handwerker.id>", "bitteBestaetigen": true }
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { anfrageId?: string; bitteBestaetigen?: boolean };
  try {
    body = (await request.json()) as { anfrageId?: string; bitteBestaetigen?: boolean };
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger Body" }, { status: 400 });
  }

  const result = await notifyHandwerkerAngebotBestaetigt(String(body.anfrageId ?? ""), {
    bitteBestaetigen: Boolean(body.bitteBestaetigen),
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
