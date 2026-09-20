import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from "@/lib/supabase";

/** Alle Auth-User einer HV-Organisation (Hauptkonto + aktive Mitglieder). */
export async function resolveOrgAuthUserIds(
  kundeId: string
): Promise<string[]> {
  const id = kundeId.trim();
  if (!id) return [];

  const ids = new Set<string>();

  const {data: kunde, error: __dbErr494_1} = await supabaseAdmin
    .from("kunden")
    .select("auth_user_id")
    .eq("id", id)
    .maybeSingle();
  if (__dbErr494_1) logDbError('lib/push/resolve-recipients:kunden', __dbErr494_1)
  const main = String(kunde?.auth_user_id ?? "").trim();
  if (main) ids.add(main);

  const {data: mitglieder, error: __dbErr495_2} = await supabaseAdmin
    .from("kunden_mitglieder")
    .select("auth_user_id")
    .eq("kunde_id", id)
    .eq("aktiv", true);
  if (__dbErr495_2) logDbError('lib/push/resolve-recipients:kunden_mitglieder', __dbErr495_2)
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
  const {data, error: __dbErr496_3} = await supabaseAdmin
    .from("handwerker")
    .select("auth_user_id")
    .eq("id", id)
    .maybeSingle();
  if (__dbErr496_3) logDbError('lib/push/resolve-recipients:handwerker', __dbErr496_3)
  const uid = String(data?.auth_user_id ?? "").trim();
  return uid || null;
}
