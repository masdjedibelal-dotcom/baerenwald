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

  const { data, error } = await supabaseAdmin
    .from("handwerker")
    .select("id, email, auth_user_id")
    .ilike("email", normalized)
    .not("email", "is", null)
    .limit(1)
    .maybeSingle();

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

  if (hw.auth_user_id) {
    return {
      ok: false,
      error: PARTNER_AUTH_COPY.errors.bereitsRegistriert,
    };
  }

  return { ok: true };
}
