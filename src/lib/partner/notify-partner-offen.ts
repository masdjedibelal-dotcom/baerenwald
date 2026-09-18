import { createPartnerNotification } from "@/lib/partner/create-partner-notification";
import type { PartnerVorgangItem } from "@/lib/partner/build-partner-vorgaenge";
import type { PartnerOffenItem } from "@/lib/partner/partner-offen-status";
import { partnerNotificationVorgangKey } from "@/lib/partner/partner-notifications";
import { partnerVorgangPortalPath } from "@/lib/partner/partner-site-url";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

type OffenNotifyTarget = {
  vorgangId: string;
  projektName: string;
  leistungName?: string | null;
  typ: "neu" | "geaendert";
};

function collectOffenNotifyTargets(
  offen: PartnerOffenItem[],
  vorgaenge: PartnerVorgangItem[]
): OffenNotifyTarget[] {
  const byId = new Map<string, OffenNotifyTarget>();

  for (const entry of offen) {
    if (entry.kind === "angebot") {
      const item = entry.item;
      const vorgangId = (item.auftrag_id?.trim() || item.id).trim();
      if (!vorgangId) continue;
      byId.set(vorgangId, {
        vorgangId,
        projektName: item.listen_titel || item.angebot_titel || "Anfrage",
        leistungName: item.gewerk_name || null,
        typ: item.offen_karten_typ === "nachreichung" ? "geaendert" : "neu",
      });
      continue;
    }

    const a = entry.item;
    const vorgangId = a.id.trim();
    if (!vorgangId) continue;
    byId.set(vorgangId, {
      vorgangId,
      projektName: a.listen_titel || a.titel || "Auftrag",
      leistungName: a.positionen[0]?.leistung_name ?? null,
      typ: !a.handwerker_bestaetigt_at?.trim() ? "neu" : "geaendert",
    });
  }

  for (const v of vorgaenge) {
    if (v.state !== "neu") continue;
    if (v.handwerker_bestaetigt_at?.trim()) continue;
    const vorgangId = v.id.trim();
    if (!vorgangId || byId.has(vorgangId)) continue;
    byId.set(vorgangId, {
      vorgangId,
      projektName: v.auftrag.listen_titel || v.auftrag.titel || "Auftrag",
      leistungName:
        v.anfrage?.gewerk_name ??
        v.auftrag.positionen[0]?.leistung_name ??
        null,
      typ: "neu",
    });
  }

  return Array.from(byId.values());
}

/**
 * Einmalige Partner-Glocke für offene Annahmen / Nachreichungen,
 * wenn CRM die Zuweisung ohne Notify-API angelegt hat.
 */
export async function ensurePartnerOffenNotifications(opts: {
  handwerkerId: string;
  offen: PartnerOffenItem[];
  vorgaenge?: PartnerVorgangItem[];
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const handwerkerId = opts.handwerkerId.trim();
  if (!handwerkerId) return;

  const targets = collectOffenNotifyTargets(
    opts.offen,
    opts.vorgaenge ?? []
  );
  if (!targets.length) return;

  const { data: unreadRows } = await supabaseAdmin
    .from("notifications")
    .select("id, link, typ")
    .eq("handwerker_id", handwerkerId)
    .eq("typ", "neu")
    .order("created_at", { ascending: false })
    .limit(80);

  const unreadKeys = new Set(
    (unreadRows ?? [])
      .map((row) => partnerNotificationVorgangKey(String(row.link ?? "")))
      .filter((k): k is string => Boolean(k))
  );

  for (const target of targets) {
    if (target.typ !== "neu") continue;
    const link = partnerVorgangPortalPath(target.vorgangId);
    const vorgangKey = partnerNotificationVorgangKey(link);
    if (!vorgangKey || unreadKeys.has(vorgangKey)) continue;

    const result = await createPartnerNotification({
      handwerkerId,
      typ: "neu",
      projektName: target.projektName,
      leistungName: target.leistungName,
      link,
      sendMail: false,
    });

    if (result.ok) unreadKeys.add(vorgangKey);
  }
}
