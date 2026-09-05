import { supabaseAdmin } from "@/lib/supabase";
import { PARTNER_AUTH_COPY } from "@/lib/partner/partner-auth-copy";

/** Nutzerfreundliche Meldung — Partner sollen Bärenwald kontaktieren. */
export const HANDWERKER_PORTAL_GESPERRT_MESSAGE =
  PARTNER_AUTH_COPY.errors.portalGesperrt;

type GesperrtRow = { id: string; ist_portal_gesperrt?: boolean | null };

function isMissingPortalGesperrtColumn(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    msg.includes("ist_portal_gesperrt") ||
    (msg.includes("column") && msg.includes("does not exist"))
  );
}

/** Prüft, ob ein Partner (per ID / E-Mail) vom Portal ausgeschlossen ist. */
export async function isHandwerkerPortalGesperrt(opts: {
  handwerkerId?: string | null;
  email?: string | null;
}): Promise<boolean> {
  const handwerkerId = opts.handwerkerId?.trim() || null;
  const email = opts.email?.trim().toLowerCase() || "";

  if (handwerkerId) {
    const { data, error } = await supabaseAdmin
      .from("handwerker")
      .select("id, ist_portal_gesperrt")
      .eq("id", handwerkerId)
      .maybeSingle();
    if (error) {
      if (isMissingPortalGesperrtColumn(error)) return false;
      throw error;
    }
    if ((data as GesperrtRow | null)?.ist_portal_gesperrt) return true;
  }

  if (email) {
    const { data, error } = await supabaseAdmin
      .from("handwerker")
      .select("id, ist_portal_gesperrt")
      .ilike("email", email)
      .eq("ist_portal_gesperrt", true)
      .limit(1)
      .maybeSingle();
    if (error) {
      if (isMissingPortalGesperrtColumn(error)) return false;
      throw error;
    }
    if (data?.id) return true;
  }

  return false;
}
