import { NextResponse } from "next/server";

import { createPartnerNotification } from "@/lib/partner/create-partner-notification";
import { notifyHandwerkerNewAnfrage } from "@/lib/partner/notify-partner-anfrage";
import { notifyHandwerkerAngebotAntwort } from "@/lib/partner/notify-partner-angebot-antwort";
import { notifyHandwerkerAngebotBestaetigt } from "@/lib/partner/notify-partner-angebot-bestaetigt";
import { notifyHandwerkerLeistungZuweisung } from "@/lib/partner/notify-partner-zuweisung";
import type { PartnerNotificationTyp } from "@/lib/partner/partner-notifications";
import {
  partnerOffenPortalPath,
  partnerVorgangPortalPath,
} from "@/lib/partner/partner-site-url";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const NOTIFY_TYPEN: PartnerNotificationTyp[] = [
  "neu",
  "geaendert",
  "entfernt",
  "erinnerung",
  "bautagebuch",
];

function authorize(request: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

type Body = {
  anfrageId?: string;
  handwerkerId?: string;
  typ?: string;
  projektName?: string;
  projekt_name?: string;
  leistungName?: string;
  link?: string;
  auftragId?: string;
  positionIds?: string[];
  bitteBestaetigen?: boolean;
  crmNotiz?: string;
  /** false = nur In-App (CRM hat Spezial-Mail bereits gesendet) */
  sendMail?: boolean;
};

/**
 * CRM → Partner: einheitliche Notify-Route (In-App + optional Spezial-Mails).
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger Body" }, { status: 400 });
  }

  const anfrageId = String(body.anfrageId ?? "").trim();

  // Legacy-Kurzpfad: nur anfrageId → New-Anfrage-Mail + In-App ohne Doppel-Mail
  if (anfrageId && !body.handwerkerId) {
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
        sendMail: false,
      });
    }

    return NextResponse.json({ ok: true });
  }

  const handwerkerId = String(body.handwerkerId ?? "").trim();
  const typ = String(body.typ ?? "") as PartnerNotificationTyp;
  const projektName = String(
    body.projektName ?? body.projekt_name ?? ""
  ).trim();
  let link = String(body.link ?? "").trim();

  if (!handwerkerId) {
    return NextResponse.json(
      { ok: false, error: "handwerkerId fehlt." },
      { status: 400 }
    );
  }
  if (!NOTIFY_TYPEN.includes(typ)) {
    return NextResponse.json(
      { ok: false, error: "typ ungültig." },
      { status: 400 }
    );
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

  // Bautagebuch: nie Zuweisungs-/Änderungspfad, nie generische „bitte bestätigen“-Mail
  // (CRM sendet die spezialisierte Tagebuch-Mail selbst).
  const isBautagebuch =
    typ === "bautagebuch" ||
    (typ === "erinnerung" &&
      /bitte\s+update\s+geben|bautagebuch|focus=bautagebuch/i.test(
        `${body.leistungName ?? ""} ${link}`
      ));

  const skipGenericMail =
    body.sendMail === false ||
    isBautagebuch ||
    (isSupabaseConfigured() &&
      ((anfrageId && typ === "neu") ||
        (!!auftragId && (typ === "neu" || typ === "geaendert")) ||
        !!(anfrageId && body.bitteBestaetigen) ||
        (anfrageId && (typ === "geaendert" || body.typ === "rueckfrage"))));

  const notify = await createPartnerNotification({
    handwerkerId,
    typ: isBautagebuch ? "bautagebuch" : typ,
    projektName: projektName || "Projekt",
    leistungName:
      body.leistungName != null ? String(body.leistungName) : null,
    link,
    sendMail: body.sendMail === true ? true : !skipGenericMail,
  });

  if (!notify.ok) {
    return NextResponse.json(notify, { status: 422 });
  }

  if (anfrageId && typ === "neu" && isSupabaseConfigured()) {
    const result = await notifyHandwerkerNewAnfrage(anfrageId);
    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }
  }

  if (anfrageId && body.bitteBestaetigen) {
    const result = await notifyHandwerkerAngebotBestaetigt(anfrageId, {
      bitteBestaetigen: true,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }
  }

  if (auftragId && (typ === "neu" || typ === "geaendert")) {
    const result = await notifyHandwerkerLeistungZuweisung({
      auftragId,
      handwerkerId,
      positionIds: Array.isArray(body.positionIds)
        ? body.positionIds.map(String)
        : undefined,
      variant: typ === "geaendert" ? "aenderung" : "neu",
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }
  }

  if (anfrageId && (typ === "geaendert" || body.typ === "rueckfrage")) {
    const result = await notifyHandwerkerAngebotAntwort({
      anfrageId,
      typ: "rueckfrage",
      crmNotiz: String(body.crmNotiz ?? ""),
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }
  }

  return NextResponse.json({
    ok: true,
    notificationId: notify.notificationId,
  });
}
