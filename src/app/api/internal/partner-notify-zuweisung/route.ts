import { NextResponse } from "next/server";

import { notifyHandwerkerLeistungZuweisung } from "@/lib/partner/notify-partner-zuweisung";
import { createPartnerNotification } from "@/lib/partner/create-partner-notification";
import { partnerOffenPortalPath, partnerVorgangPortalPath } from "@/lib/partner/partner-site-url";
import { supabaseAdmin } from "@/lib/supabase";

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

  const auftragId = String(body.auftragId ?? "").trim();
  const handwerkerId = String(body.handwerkerId ?? "").trim();
  if (handwerkerId && auftragId) {
    const { data: auftrag } = await supabaseAdmin
      .from("auftraege")
      .select("angebot_id, angebote(notizen)")
      .eq("id", auftragId)
      .maybeSingle();
    const angebotId = auftrag?.angebot_id ? String(auftrag.angebot_id) : null;
    let link = partnerVorgangPortalPath(auftragId);
    if (angebotId) {
      const { data: hw } = await supabaseAdmin
        .from("angebot_handwerker")
        .select("id")
        .eq("angebot_id", angebotId)
        .eq("handwerker_id", handwerkerId)
        .maybeSingle();
      if (hw?.id) link = partnerOffenPortalPath(String(hw.id));
    }
    await createPartnerNotification({
      handwerkerId,
      typ: "neu",
      projektName: "Neue Leistung",
      link,
      // Mail kommt schon von notifyHandwerkerLeistungZuweisung
      sendMail: false,
    });
  }

  return NextResponse.json({ ok: true, deprecated: true });
}
