import { findHandwerkerForRegistration } from "@/lib/partner/partner-registration-eligibility";
import {
  HANDWERKER_PORTAL_GESPERRT_MESSAGE,
  isHandwerkerPortalGesperrt,
} from "@/lib/partner/handwerker-portal-gesperrt";
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

  try {
    const gesperrt = await isHandwerkerPortalGesperrt({ email });
    if (gesperrt) {
      return {
        ok: false,
        error: HANDWERKER_PORTAL_GESPERRT_MESSAGE,
        signOut: true,
      };
    }
  } catch (e) {
    console.error("[linkPortalHandwerker] Portal-Sperre-Check fehlgeschlagen:", e);
  }

  const { data: byAuth } = await supabaseAdmin
    .from("handwerker")
    .select("id, ist_portal_gesperrt")
    .eq("auth_user_id", opts.userId)
    .maybeSingle();

  if (byAuth?.id) {
    if ((byAuth as { ist_portal_gesperrt?: boolean | null }).ist_portal_gesperrt) {
      return {
        ok: false,
        error: HANDWERKER_PORTAL_GESPERRT_MESSAGE,
        signOut: true,
      };
    }
    return { ok: true, handwerkerId: String(byAuth.id) };
  }

  const byEmail = await findHandwerkerForRegistration(email);

  if (!byEmail?.id) {
    return {
      ok: false,
      error: PARTNER_AUTH_COPY.errors.betriebNichtAngelegt,
    };
  }

  if ((byEmail as { ist_portal_gesperrt?: boolean | null }).ist_portal_gesperrt) {
    return {
      ok: false,
      error: HANDWERKER_PORTAL_GESPERRT_MESSAGE,
      signOut: true,
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
