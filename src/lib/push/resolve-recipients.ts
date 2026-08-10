import { supabaseAdmin } from "@/lib/supabase";

/** Alle Auth-User einer HV-Organisation (Hauptkonto + aktive Mitglieder). */
export async function resolveOrgAuthUserIds(
  kundeId: string
): Promise<string[]> {
  const id = kundeId.trim();
  if (!id) return [];

  const ids = new Set<string>();

  const { data: kunde } = await supabaseAdmin
    .from("kunden")
    .select("auth_user_id")
    .eq("id", id)
    .maybeSingle();
  const main = String(kunde?.auth_user_id ?? "").trim();
  if (main) ids.add(main);

  const { data: mitglieder } = await supabaseAdmin
    .from("kunden_mitglieder")
    .select("auth_user_id")
    .eq("kunde_id", id)
    .eq("aktiv", true);
  for (const m of mitglieder ?? []) {
    const uid = String(m.auth_user_id ?? "").trim();
    if (uid) ids.add(uid);
  }

  return Array.from(ids);
}

/** Auth-User eines Handwerker-Kontos. */
export async function resolveHandwerkerAuthUserId(
  handwerkerId: string
): Promise<string | null> {
  const id = handwerkerId.trim();
  if (!id) return null;
  const { data } = await supabaseAdmin
    .from("handwerker")
    .select("auth_user_id")
    .eq("id", id)
    .maybeSingle();
  const uid = String(data?.auth_user_id ?? "").trim();
  return uid || null;
}
