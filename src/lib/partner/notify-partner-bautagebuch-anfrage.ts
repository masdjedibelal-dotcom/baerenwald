import { logDbError } from '@/lib/errors/log-db-error'
import { createPartnerNotification } from "@/lib/partner/create-partner-notification";
import { partnerNotificationVorgangKey } from "@/lib/partner/partner-notifications";
import { partnerVorgangPortalPath } from "@/lib/partner/partner-site-url";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/** Legacy: CRM fordert kein Bautagebuch mehr an — Typ nur für Nachzieh-Notify. */
type PartnerBautagebuchAnfrageItem = {
  id: string;
  auftrag_id: string;
  notiz: string | null;
  created_at: string;
  position_ids?: string[];
};

export async function notifyPartnerBautagebuchAnfrage(opts: {
  auftragId: string;
  handwerkerId: string;
  notiz?: string | null;
  positionIds?: string[] | null;
  anfrageId?: string | null;
  /** Zeile existiert bereits (nur Glocke nachziehen). */
  skipDbInsert?: boolean;
}): Promise<{ ok: boolean; error?: string; anfrageId?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const auftragId = opts.auftragId.trim();
  const handwerkerId = opts.handwerkerId.trim();
  if (!auftragId || !handwerkerId) {
    return { ok: false, error: "auftragId und handwerkerId erforderlich." };
  }

  const positionIds = Array.from(
    new Set((opts.positionIds ?? []).map((id) => id.trim()).filter(Boolean))
  );

  let anfrageId = opts.anfrageId?.trim() || null;

  if (!opts.skipDbInsert) {
    const {data: existing, error: __dbErr402_1} = await supabaseAdmin
      .from("partner_bautagebuch_anfragen")
      .select("id")
      .eq("auftrag_id", auftragId)
      .eq("handwerker_id", handwerkerId)
      .is("erledigt_at", null)
      .maybeSingle();
    if (__dbErr402_1) logDbError('lib/partner/notify-partner-bautagebuch-anfrage:partner_bautagebuch_anfragen', __dbErr402_1)
    if (existing?.id) {
      anfrageId = String(existing.id);
      const updatePayload: Record<string, unknown> = {
        notiz: opts.notiz?.trim() || null,
      };
      if (positionIds.length) updatePayload.position_ids = positionIds;
      const { error: __dbErr407_6 } = await supabaseAdmin
        .from("partner_bautagebuch_anfragen")
        .update(updatePayload)
        .eq("id", existing.id);
      if (__dbErr407_6) logDbError('lib/partner/notify-partner-bautagebuch-anfrage:partner_bautagebuch_anfragen', __dbErr407_6)
    } else {
      const insertPayload: Record<string, unknown> = {
        auftrag_id: auftragId,
        handwerker_id: handwerkerId,
        notiz: opts.notiz?.trim() || null,
      };
      if (positionIds.length) insertPayload.position_ids = positionIds;
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from("partner_bautagebuch_anfragen")
        .insert(insertPayload)
        .select("id")
        .single();
      if (insErr) logDbError('lib/partner/notify-partner-bautagebuch-anfrage:partner_bautagebuch_anfragen', insErr)
      if (insErr) return { ok: false, error: insErr.message };
      anfrageId = inserted?.id ? String(inserted.id) : null;
    }
  } else if (!anfrageId) {
    const {data: existing, error: __dbErr403_2} = await supabaseAdmin
      .from("partner_bautagebuch_anfragen")
      .select("id")
      .eq("auftrag_id", auftragId)
      .eq("handwerker_id", handwerkerId)
      .is("erledigt_at", null)
      .maybeSingle();
    if (__dbErr403_2) logDbError('lib/partner/notify-partner-bautagebuch-anfrage:partner_bautagebuch_anfragen', __dbErr403_2)
    anfrageId = existing?.id ? String(existing.id) : null;
  }

  const {data: auftrag, error: __dbErr404_3} = await supabaseAdmin
    .from("auftraege")
    .select("titel")
    .eq("id", auftragId)
    .maybeSingle();
  if (__dbErr404_3) logDbError('lib/partner/notify-partner-bautagebuch-anfrage:auftraege', __dbErr404_3)
  const projektName =
    String((auftrag as { titel?: string } | null)?.titel ?? "").trim() ||
    "Auftrag";

  const notify = await createPartnerNotification({
    handwerkerId,
    typ: "bautagebuch",
    projektName,
    leistungName: "Bitte Update geben — Bautagebuch",
    link: partnerVorgangPortalPath(auftragId, {
      focus: "bautagebuch",
      anfrageId,
    }),
    // CRM-Pfad sendet die Mail; dieser Helper oft aus Portal-Sync → Mail ok, aber klar als Update.
    sendMail: !opts.skipDbInsert,
  });

  if (!notify.ok) return notify;
  return { ok: true, anfrageId: anfrageId ?? undefined };
}

/** Einmalige Glocke, wenn CRM nur die DB-Zeile angelegt hat (ohne Notify-API). */
export async function ensurePartnerBautagebuchNotifications(opts: {
  handwerkerId: string;
  anfragen: PartnerBautagebuchAnfrageItem[];
  titelByAuftragId: Map<string, string>;
}): Promise<void> {
  if (!isSupabaseConfigured() || !opts.anfragen.length) return;

  const handwerkerId = opts.handwerkerId.trim();
  if (!handwerkerId) return;

  for (const bt of opts.anfragen) {
    const link = partnerVorgangPortalPath(bt.auftrag_id, {
      focus: "bautagebuch",
      anfrageId: bt.id,
    });
    const vorgangKey = partnerNotificationVorgangKey(link);
    if (!vorgangKey) continue;

    const {data: unreadRows, error: __dbErr405_4} = await supabaseAdmin
      .from("notifications")
      .select("id, link")
      .eq("handwerker_id", handwerkerId)
      .eq("gelesen", false)
      .order("created_at", { ascending: false })
      .limit(30);
    if (__dbErr405_4) logDbError('lib/partner/notify-partner-bautagebuch-anfrage:notifications', __dbErr405_4)
    const hatUngelesen = (unreadRows ?? []).some(
      (row) =>
        partnerNotificationVorgangKey(String(row.link ?? "")) === vorgangKey
    );
    if (hatUngelesen) continue;

    const {data: existingNotifs, error: __dbErr406_5} = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("handwerker_id", handwerkerId)
      .in("typ", ["bautagebuch", "erinnerung"])
      .ilike("link", `%id=${vorgangKey}%`)
      .limit(1);
    if (__dbErr406_5) logDbError('lib/partner/notify-partner-bautagebuch-anfrage:notifications', __dbErr406_5)
    if ((existingNotifs ?? []).length > 0) continue;

    await notifyPartnerBautagebuchAnfrage({
      auftragId: bt.auftrag_id,
      handwerkerId,
      notiz: bt.notiz,
      anfrageId: bt.id,
      positionIds: bt.position_ids,
      skipDbInsert: true,
    });
  }
}
