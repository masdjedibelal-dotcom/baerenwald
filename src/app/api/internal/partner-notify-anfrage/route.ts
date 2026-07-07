import { NextResponse } from "next/server";

import { notifyHandwerkerNewAnfrage } from "@/lib/partner/notify-partner-anfrage";
import { createPartnerNotification } from "@/lib/partner/create-partner-notification";
import { partnerOffenPortalPath } from "@/lib/partner/partner-site-url";
import { supabaseAdmin } from "@/lib/supabase";

function authorize(request: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

/**
 * POST — vom CRM nach Versand/Zuweisung einer Handwerker-Anfrage aufrufen.
 * Body: { "anfrageId": "<angebot_handwerker.id>" }
 *
 * @deprecated Bitte `/api/internal/partner-notify` nutzen — Route bleibt für Legacy-CRM.
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { anfrageId?: string };
  try {
    body = (await request.json()) as { anfrageId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger Body" }, { status: 400 });
  }

  const anfrageId = String(body.anfrageId ?? "").trim();
  const result = await notifyHandwerkerNewAnfrage(anfrageId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  const { data: row } = await supabaseAdmin
    .from("angebot_handwerker")
    .select("handwerker_id, angebote(notizen, leads(plz))")
    .eq("id", anfrageId)
    .maybeSingle();

  if (row?.handwerker_id) {
    await createPartnerNotification({
      handwerkerId: String(row.handwerker_id),
      typ: "neu",
      projektName: "Neue Anfrage",
      link: partnerOffenPortalPath(anfrageId),
    });
  }

  return NextResponse.json({ ok: true, deprecated: true });
}
