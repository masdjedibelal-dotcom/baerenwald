import { NextResponse } from "next/server";

import { createPartnerNotification } from "@/lib/partner/create-partner-notification";
import type { PartnerNotificationTyp } from "@/lib/partner/partner-notifications";
import { notifyHandwerkerNewAnfrage } from "@/lib/partner/notify-partner-anfrage";
import { notifyHandwerkerAngebotBestaetigt } from "@/lib/partner/notify-partner-angebot-bestaetigt";
import { notifyHandwerkerLeistungZuweisung } from "@/lib/partner/notify-partner-zuweisung";
import { notifyHandwerkerAngebotAntwort } from "@/lib/partner/notify-partner-angebot-antwort";
import { partnerOffenPortalPath, partnerVorgangPortalPath } from "@/lib/partner/partner-site-url";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

function authorize(request: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

const VALID_TYP: PartnerNotificationTyp[] = [
  "neu",
  "geaendert",
  "entfernt",
  "erinnerung",
  "bautagebuch",
];

/**
 * POST — vereinheitlichte CRM-Benachrichtigung (Glocke + max. 1 Mail).
 * Body: { handwerkerId, typ, projektName, leistungName?, link }
 *
 * Legacy-Aliase (optional, für schrittweise CRM-Migration):
 * - anfrageId → notify + link zu Offen
 * - auftragId + handwerkerId → Zuweisung
 *
 * Wichtig: Spezialisierte Mails (Anfrage/Zuweisung) ersetzen die generische
 * Glocken-Mail — sonst kommen zwei E-Mails an.
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

  /** Legacy: partner-notify-anfrage */
  const anfrageId = String(body.anfrageId ?? "").trim();
  if (anfrageId && !body.handwerkerId) {
    const legacy = await notifyHandwerkerNewAnfrage(anfrageId);
    if (!legacy.ok) {
      return NextResponse.json(legacy, { status: 422 });
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
        sendMail: false,
      });
    }
    return NextResponse.json({ ok: true });
  }

  const handwerkerId = String(body.handwerkerId ?? "").trim();
  const typ = String(body.typ ?? "") as PartnerNotificationTyp;
  const projektName = String(body.projektName ?? body.projekt_name ?? "").trim();
  let link = String(body.link ?? "").trim();

  if (!handwerkerId) {
    return NextResponse.json({ ok: false, error: "handwerkerId fehlt." }, { status: 400 });
  }
  if (!VALID_TYP.includes(typ)) {
    return NextResponse.json({ ok: false, error: "typ ungültig." }, { status: 400 });
  }
  if (!link && anfrageId) {
    link = partnerOffenPortalPath(anfrageId);
  }
  const auftragId = String(body.auftragId ?? "").trim();
  if (!link && auftragId) {
    link = partnerVorgangPortalPath(auftragId);
  }
  if (!link) {
    return NextResponse.json({ ok: false, error: "link fehlt." }, { status: 400 });
  }

  const willSendSpecialMail =
    isSupabaseConfigured() &&
    ((anfrageId && typ === "neu") ||
      (Boolean(auftragId) && (typ === "neu" || typ === "geaendert")) ||
      Boolean(anfrageId && body.bitteBestaetigen) ||
      (anfrageId && (typ === "geaendert" || body.typ === "rueckfrage")));

  const result = await createPartnerNotification({
    handwerkerId,
    typ,
    projektName: projektName || "Projekt",
    leistungName: body.leistungName != null ? String(body.leistungName) : null,
    link,
    sendMail: !willSendSpecialMail,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  /** Spezialisierte Mails (eine pro Event) — Glocken-Mail oben ggf. unterdrückt. */
  if (anfrageId && typ === "neu" && isSupabaseConfigured()) {
    const mail = await notifyHandwerkerNewAnfrage(anfrageId);
    if (!mail.ok) {
      return NextResponse.json(mail, { status: 422 });
    }
  }
  if (anfrageId && body.bitteBestaetigen) {
    const mail = await notifyHandwerkerAngebotBestaetigt(anfrageId, {
      bitteBestaetigen: true,
    });
    if (!mail.ok) {
      return NextResponse.json(mail, { status: 422 });
    }
  }
  if (auftragId && (typ === "neu" || typ === "geaendert")) {
    const mail = await notifyHandwerkerLeistungZuweisung({
      auftragId,
      handwerkerId,
      positionIds: Array.isArray(body.positionIds)
        ? body.positionIds.map(String)
        : undefined,
      variant: typ === "geaendert" ? "aenderung" : "neu",
    });
    if (!mail.ok) {
      return NextResponse.json(mail, { status: 422 });
    }
  }
  if (anfrageId && (typ === "geaendert" || body.typ === "rueckfrage")) {
    const mail = await notifyHandwerkerAngebotAntwort({
      anfrageId,
      typ: "rueckfrage",
      crmNotiz: String(body.crmNotiz ?? ""),
    });
    if (!mail.ok) {
      return NextResponse.json(mail, { status: 422 });
    }
  }

  return NextResponse.json({ ok: true, notificationId: result.notificationId });
}
