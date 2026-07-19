import { PARTNER_AUTH_COPY } from "@/lib/partner/partner-auth-copy";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerRegistrationCheckResult =
  | { ok: true }
  | { ok: false; error: string };

function normalizePartnerEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Partner im CRM-Stamm — hinterlegte E-Mail reicht, kein manuelles Freischalten. */
export async function findHandwerkerForRegistration(email: string) {
  if (!isSupabaseConfigured()) return null;

  const normalized = normalizePartnerEmail(email);
  if (!normalized.includes("@")) return null;

  const withPortal = await supabaseAdmin
    .from("handwerker")
    .select("id, email, auth_user_id, ist_portal_gesperrt")
    .ilike("email", normalized)
    .not("email", "is", null)
    .limit(1)
    .maybeSingle();

  let data = withPortal.data;
  let error = withPortal.error;

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    const missingCol =
      error.code === "42703" ||
      error.code === "PGRST204" ||
      msg.includes("ist_portal_gesperrt");
    if (missingCol) {
      const fallback = await supabaseAdmin
        .from("handwerker")
        .select("id, email, auth_user_id")
        .ilike("email", normalized)
        .not("email", "is", null)
        .limit(1)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }
  }

  if (error || !data?.id) return null;
  const stored = String(data.email ?? "").trim();
  if (!stored) return null;

  return data;
}

export async function verifyPartnerRegistrationEmail(
  email: string
): Promise<PartnerRegistrationCheckResult> {
  const hw = await findHandwerkerForRegistration(email);
  if (!hw) {
    return {
      ok: false,
      error: PARTNER_AUTH_COPY.errors.betriebNichtAngelegt,
    };
  }

  if ((hw as { ist_portal_gesperrt?: boolean | null }).ist_portal_gesperrt) {
    return {
      ok: false,
      error: PARTNER_AUTH_COPY.errors.portalGesperrt,
    };
  }

  if (hw.auth_user_id) {
    return {
      ok: false,
      error: PARTNER_AUTH_COPY.errors.bereitsRegistriert,
    };
  }

  return { ok: true };
}
