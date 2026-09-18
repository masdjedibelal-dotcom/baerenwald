import "server-only";

import { normalizeKundenEmail } from "@/lib/kunden/kunde-email";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type ReclaimOrphanPortalAuthResult = "none" | "linked" | "deleted";

async function findAuthUserByEmail(email: string) {
  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    const found = users.find(
      (u) => (u.email ?? "").toLowerCase() === email && !u.deleted_at
    );
    if (found) return found;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function isAuthUserLinkedToPortal(userId: string): Promise<boolean> {
  const [kunde, hw, mitglied] = await Promise.all([
    supabaseAdmin
      .from("kunden")
      .select("id")
      .eq("auth_user_id", userId)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("handwerker")
      .select("id")
      .eq("auth_user_id", userId)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("kunden_mitglieder")
      .select("id")
      .eq("auth_user_id", userId)
      .eq("aktiv", true)
      .limit(1)
      .maybeSingle(),
  ]);

  return Boolean(kunde.data?.id || hw.data?.id || mitglied.data?.id);
}

/**
 * Entfernt verwaiste Auth-User (z. B. abgebrochene Partner-Registrierung ohne Handwerker-Stamm),
 * damit CRM-eingeladene HV/Kunden sich neu registrieren können.
 */
export async function reclaimOrphanPortalAuthUser(
  emailRaw: string
): Promise<ReclaimOrphanPortalAuthResult> {
  if (!isSupabaseConfigured()) return "none";

  const email = normalizeKundenEmail(emailRaw);
  if (!email) return "none";

  const user = await findAuthUserByEmail(email);
  if (!user?.id) return "none";

  if (await isAuthUserLinkedToPortal(user.id)) return "linked";

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[reclaimOrphanPortalAuthUser]", error.message);
    return "linked";
  }

  await supabaseAdmin.from("funnel_portal_otp").delete().eq("email", email);

  return "deleted";
}

export async function ensurePortalRegistrationEmailAvailable(
  emailRaw: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = normalizeKundenEmail(emailRaw);
  if (!email) return { ok: false, error: "Ungültige E-Mail." };

  // Zuerst verwaiste Auth-User entfernen (CRM-Kunde gelöscht, Auth blieb).
  // Danach erst „bereits registriert“ prüfen — sonst blockiert ein Orphan ewig.
  const reclaimed = await reclaimOrphanPortalAuthUser(email);
  if (reclaimed === "linked") {
    return {
      ok: false,
      error: "Diese E-Mail ist bereits registriert. Bitte melden Sie sich an.",
    };
  }

  const { isPortalAuthEmailRegistered } = await import(
    "@/lib/funnel/funnel-portal-otp"
  );
  if (await isPortalAuthEmailRegistered(email)) {
    return {
      ok: false,
      error: "Diese E-Mail ist bereits registriert. Bitte melden Sie sich an.",
    };
  }

  return { ok: true };
}
