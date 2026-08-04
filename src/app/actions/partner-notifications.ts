"use server";

import { revalidatePath } from "next/cache";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import {
  countUnreadPartnerNotificationsByVorgang,
  dedupePartnerNotificationsByVorgang,
  partnerNotificationVorgangKey,
  type PartnerNotificationRow,
} from "@/lib/partner/partner-notifications";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export async function fetchPartnerNotifications(): Promise<{
  ok: boolean;
  items: PartnerNotificationRow[];
  unread: number;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { ok: false, items: [], unread: 0, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, items: [], unread: 0, error: "Nicht angemeldet." };

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, items: [], unread: 0, error: link.error };

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("id, handwerker_id, typ, projekt_name, leistung_name, gelesen, link, created_at")
    .eq("handwerker_id", link.handwerkerId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { ok: false, items: [], unread: 0, error: error.message };

  const items = dedupePartnerNotificationsByVorgang(
    (data ?? []) as PartnerNotificationRow[]
  );
  const unread = countUnreadPartnerNotificationsByVorgang(
    (data ?? []) as PartnerNotificationRow[]
  );
  return { ok: true, items, unread };
}

export async function markPartnerNotificationRead(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Nicht angemeldet." };

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from("notifications")
    .select("id, link")
    .eq("id", id.trim())
    .eq("handwerker_id", link.handwerkerId)
    .maybeSingle();

  if (fetchErr || !row) {
    return { ok: false, error: fetchErr?.message ?? "Benachrichtigung nicht gefunden." };
  }

  const vorgangKey = partnerNotificationVorgangKey(row.link as string | null);

  const { data: unreadRows } = await supabaseAdmin
    .from("notifications")
    .select("id, link")
    .eq("handwerker_id", link.handwerkerId)
    .eq("gelesen", false);

  const idsToMark = vorgangKey
    ? (unreadRows ?? [])
        .filter(
          (r) =>
            partnerNotificationVorgangKey(String(r.link ?? "")) === vorgangKey
        )
        .map((r) => String(r.id))
    : [id.trim()];

  if (!idsToMark.length) return { ok: true };

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ gelesen: true })
    .in("id", idsToMark)
    .eq("handwerker_id", link.handwerkerId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/partner");
  return { ok: true };
}

export async function markAllPartnerNotificationsRead(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Nicht angemeldet." };

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ gelesen: true })
    .eq("handwerker_id", link.handwerkerId)
    .eq("gelesen", false);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/partner");
  return { ok: true };
}
