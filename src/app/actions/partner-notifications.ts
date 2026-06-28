"use server";

import { revalidatePath } from "next/cache";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import type { PartnerNotificationRow } from "@/lib/partner/partner-notifications";
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

  const items = (data ?? []) as PartnerNotificationRow[];
  const unread = items.filter((n) => !n.gelesen).length;
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

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ gelesen: true })
    .eq("id", id.trim())
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
