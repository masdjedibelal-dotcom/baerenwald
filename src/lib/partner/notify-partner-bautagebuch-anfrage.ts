import { createPartnerNotification } from "@/lib/partner/create-partner-notification";
import type { PartnerBautagebuchAnfrageItem } from "@/lib/partner/get-partner-data";
import { partnerNotificationVorgangKey } from "@/lib/partner/partner-notifications";
import { partnerVorgangPortalPath } from "@/lib/partner/partner-site-url";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export async function notifyPartnerBautagebuchAnfrage(opts: {
  auftragId: string;
  handwerkerId: string;
  notiz?: string | null;
  /** Zeile existiert bereits (nur Glocke nachziehen). */
  skipDbInsert?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const auftragId = opts.auftragId.trim();
  const handwerkerId = opts.handwerkerId.trim();
  if (!auftragId || !handwerkerId) {
    return { ok: false, error: "auftragId und handwerkerId erforderlich." };
  }

  if (!opts.skipDbInsert) {
    const { data: existing } = await supabaseAdmin
      .from("partner_bautagebuch_anfragen")
      .select("id")
      .eq("auftrag_id", auftragId)
      .eq("handwerker_id", handwerkerId)
      .is("erledigt_at", null)
      .maybeSingle();

    if (existing?.id) {
      await supabaseAdmin
        .from("partner_bautagebuch_anfragen")
        .update({
          notiz: opts.notiz?.trim() || null,
        })
        .eq("id", existing.id);
    } else {
      const { error: insErr } = await supabaseAdmin
        .from("partner_bautagebuch_anfragen")
        .insert({
          auftrag_id: auftragId,
          handwerker_id: handwerkerId,
          notiz: opts.notiz?.trim() || null,
        });
      if (insErr) return { ok: false, error: insErr.message };
    }
  }

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("titel")
    .eq("id", auftragId)
    .maybeSingle();

  const projektName =
    String((auftrag as { titel?: string } | null)?.titel ?? "").trim() || "Auftrag";

  const notify = await createPartnerNotification({
    handwerkerId,
    typ: "bautagebuch",
    projektName,
    leistungName: "Bitte Tagebucheintrag erstellen",
    link: partnerVorgangPortalPath(auftragId),
  });

  if (!notify.ok) return notify;
  return { ok: true };
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
    const link = partnerVorgangPortalPath(bt.auftrag_id);
    const vorgangKey = partnerNotificationVorgangKey(link);
    if (!vorgangKey) continue;

    const { data: unreadRows } = await supabaseAdmin
      .from("notifications")
      .select("id, link")
      .eq("handwerker_id", handwerkerId)
      .eq("gelesen", false)
      .order("created_at", { ascending: false })
      .limit(30);

    const hatUngelesen = (unreadRows ?? []).some(
      (row) => partnerNotificationVorgangKey(String(row.link ?? "")) === vorgangKey
    );
    if (hatUngelesen) continue;

    const { data: bautagebuchRows } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("handwerker_id", handwerkerId)
      .eq("typ", "bautagebuch")
      .ilike("link", `%id=${vorgangKey}%`)
      .limit(1);

    if ((bautagebuchRows ?? []).length > 0) continue;

    await notifyPartnerBautagebuchAnfrage({
      auftragId: bt.auftrag_id,
      handwerkerId,
      notiz: bt.notiz,
      skipDbInsert: true,
    });
  }
}
