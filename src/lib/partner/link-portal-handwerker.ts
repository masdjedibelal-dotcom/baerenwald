import { logDbError } from '@/lib/errors/log-db-error'
import { findHandwerkerForRegistration } from "@/lib/partner/partner-registration-eligibility";
import {
  HANDWERKER_PORTAL_GESPERRT_MESSAGE,
  isHandwerkerPortalGesperrt,
} from "@/lib/partner/handwerker-portal-gesperrt";
import { PARTNER_AUTH_COPY } from "@/lib/partner/partner-auth-copy";
import {
  BAERENWALD_PRIMARY_STAFF_EMAIL,
  canonicalBaerenwaldPrimaryStaffEmail,
} from "@/lib/auth/baerenwald-primary-staff";
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

  const {data: byAuth, error: __dbErr386_1} = await supabaseAdmin
    .from("handwerker")
    .select("id, ist_portal_gesperrt")
    .eq("auth_user_id", opts.userId)
    .maybeSingle();
  if (__dbErr386_1) logDbError('lib/partner/link-portal-handwerker:handwerker', __dbErr386_1)
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

  // Primary-Staff-Aliase zuerst über kanonische CRM-Mail auflösen
  const staffCanonical = canonicalBaerenwaldPrimaryStaffEmail(email);
  const byEmail = await findHandwerkerForRegistration(staffCanonical ?? email);

  if (!byEmail?.id && staffCanonical) {
    const {data: staffHw, error: __dbErr387_2} = await supabaseAdmin
      .from("handwerker")
      .select("id, email, auth_user_id, ist_portal_gesperrt")
      .ilike("email", BAERENWALD_PRIMARY_STAFF_EMAIL)
      .limit(1)
      .maybeSingle();
    if (__dbErr387_2) logDbError('lib/partner/link-portal-handwerker:handwerker', __dbErr387_2)
    if (staffHw?.id) {
      if ((staffHw as { ist_portal_gesperrt?: boolean | null }).ist_portal_gesperrt) {
        return {
          ok: false,
          error: HANDWERKER_PORTAL_GESPERRT_MESSAGE,
          signOut: true,
        };
      }
      const existingAuth = staffHw.auth_user_id as string | null | undefined;
      if (existingAuth && existingAuth !== opts.userId) {
        // Alias-Login → gleiches Betriebskonto freigeben
        return { ok: true, handwerkerId: String(staffHw.id) };
      }
      if (!existingAuth) {
        const { error: __dbErr388_3 } = await supabaseAdmin
          .from("handwerker")
          .update({ auth_user_id: opts.userId })
          .eq("id", staffHw.id);
        if (__dbErr388_3) logDbError('lib/partner/link-portal-handwerker:handwerker', __dbErr388_3)
      }
      return { ok: true, handwerkerId: String(staffHw.id) };
    }
  }

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
    if (staffCanonical) {
      return { ok: true, handwerkerId: String(byEmail.id) };
    }
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
  if (upErr) logDbError('lib/partner/link-portal-handwerker:handwerker', upErr)

  if (upErr) return { ok: false, error: upErr.message };

  return { ok: true, handwerkerId: String(byEmail.id) };
}
