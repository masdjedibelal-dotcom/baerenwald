import { NextResponse } from "next/server";

import {
  notifyHandwerkerAngebotAntwort,
  type PartnerAngebotAntwortTyp,
} from "@/lib/partner/notify-partner-angebot-antwort";

function authorize(request: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

/**
 * POST — vom CRM nach Rückfrage oder Ablehnung einer HW-Einreichung.
 * Body: { anfrageId, typ: "rueckfrage"|"abgelehnt", crmNotiz, betreff? }
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    anfrageId?: string;
    typ?: PartnerAngebotAntwortTyp;
    crmNotiz?: string;
    betreff?: string;
    cc?: string[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger Body" }, { status: 400 });
  }

  const typ = body.typ;
  if (typ !== "rueckfrage" && typ !== "abgelehnt") {
    return NextResponse.json({ ok: false, error: "typ muss rueckfrage oder abgelehnt sein" }, { status: 400 });
  }

  const result = await notifyHandwerkerAngebotAntwort({
    anfrageId: String(body.anfrageId ?? ""),
    typ,
    crmNotiz: String(body.crmNotiz ?? ""),
    betreff: body.betreff?.trim() || undefined,
    cc: Array.isArray(body.cc) ? body.cc.filter(Boolean) : undefined,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
