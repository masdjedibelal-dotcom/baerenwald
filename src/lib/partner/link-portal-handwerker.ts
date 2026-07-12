import { findHandwerkerForRegistration } from "@/lib/partner/partner-registration-eligibility";
import { PARTNER_AUTH_COPY } from "@/lib/partner/partner-auth-copy";
import { supabaseAdmin } from "@/lib/supabase";

export type LinkPortalHandwerkerResult =
  | { ok: true; handwerkerId: string }
  | { ok: false; error: string; signOut?: boolean };

/**
 * Verknüpft Auth-User mit handwerker.auth_user_id.
 * Voraussetzung: Handwerker/Partner im CRM mit dieser E-Mail — kein Extra-Freischalten.
 */
export async function linkPortalHandwerkerToAuthUser(opts: {
  userId: string;
  email: string;
}): Promise<LinkPortalHandwerkerResult> {
  const email = opts.email.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: PARTNER_AUTH_COPY.errors.keineEmailImKonto };
  }

  const { data: byAuth } = await supabaseAdmin
    .from("handwerker")
    .select("id")
    .eq("auth_user_id", opts.userId)
    .maybeSingle();

  if (byAuth?.id) {
    return { ok: true, handwerkerId: String(byAuth.id) };
  }

  const byEmail = await findHandwerkerForRegistration(email);

  if (!byEmail?.id) {
    return {
      ok: false,
      error: PARTNER_AUTH_COPY.errors.betriebNichtAngelegt,
    };
  }

  const existingAuth = byEmail.auth_user_id as string | null | undefined;
  if (existingAuth && existingAuth !== opts.userId) {
    return {
      ok: false,
      error: PARTNER_AUTH_COPY.errors.emailVerknuepft,
      signOut: true,
    };
  }

  const { error: upErr } = await supabaseAdmin
    .from("handwerker")
    .update({ auth_user_id: opts.userId })
    .eq("id", byEmail.id);

  if (upErr) return { ok: false, error: upErr.message };

  return { ok: true, handwerkerId: String(byEmail.id) };
}
