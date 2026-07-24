import { isPortalAuthEmailRegistered } from "@/lib/funnel/funnel-portal-otp";
import { normalizeKundenEmail } from "@/lib/kunden/kunde-email";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type MeldeBestaetigungContact = {
  name: string;
  email: string;
  telefon: string | null;
  leadId: string | null;
};

/**
 * Kontaktdaten der Meldung über Tracking-Token laden.
 */
export async function loadMeldeContactByToken(
  token: string
): Promise<MeldeBestaetigungContact | null> {
  const t = token.trim();
  if (!t || !isSupabaseConfigured()) return null;

  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("id, melder_name, melder_email, melder_telefon, email, name, telefon")
    .eq("melde_tracking_token", t)
    .maybeSingle();

  if (error || !data) return null;

  const email = normalizeKundenEmail(
    String(data.melder_email ?? data.email ?? "")
  );
  const name = String(data.melder_name ?? data.name ?? "").trim();
  if (!email && !name) return null;

  return {
    name,
    email,
    telefon: String(data.melder_telefon ?? data.telefon ?? "").trim() || null,
    leadId: data.id ? String(data.id) : null,
  };
}

export async function meldePortalAccountExists(
  email: string | null | undefined
): Promise<boolean> {
  if (!email?.trim()) return false;
  return isPortalAuthEmailRegistered(email);
}
