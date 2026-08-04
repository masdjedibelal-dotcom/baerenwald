"use server";

import { revalidatePath } from "next/cache";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export type PartnerTodoActionResult = { ok: true } | { ok: false; error: string };

async function requireHandwerkerId(): Promise<
  { ok: true; handwerkerId: string } | { ok: false; error: string }
> {
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

  return { ok: true, handwerkerId: link.handwerkerId };
}

export async function createPartnerTodo(titel: string): Promise<PartnerTodoActionResult> {
  const auth = await requireHandwerkerId();
  if (!auth.ok) return auth;

  const clean = titel.trim();
  if (!clean) return { ok: false, error: "Bitte einen Text eingeben." };

  const supabase = await createClient();
  const { data: maxRow } = await supabase
    .from("partner_todos")
    .select("sort_order")
    .eq("handwerker_id", auth.handwerkerId)
    .eq("erledigt", false)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (Number(maxRow?.sort_order ?? 0) || 0) + 1;

  const { error } = await supabase.from("partner_todos").insert({
    handwerker_id: auth.handwerkerId,
    titel: clean,
    sort_order: sortOrder,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/partner");
  return { ok: true };
}

export async function togglePartnerTodo(
  id: string,
  erledigt: boolean
): Promise<PartnerTodoActionResult> {
  const auth = await requireHandwerkerId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("partner_todos")
    .update({ erledigt })
    .eq("id", id)
    .eq("handwerker_id", auth.handwerkerId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/partner");
  return { ok: true };
}

export async function deletePartnerTodo(id: string): Promise<PartnerTodoActionResult> {
  const auth = await requireHandwerkerId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("partner_todos")
    .delete()
    .eq("id", id)
    .eq("handwerker_id", auth.handwerkerId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/partner");
  return { ok: true };
}
