import {
  normalizeKundenEmail,
} from "@/lib/kunden/kunde-email";
import { supabaseAdmin } from "@/lib/supabase";

/** Nutzerfreundliche Meldung — Kunde soll sich an Bärenwald wenden. */
export const KUNDE_PORTAL_GESPERRT_MESSAGE =
  "Der Portal-Zugang für diese Adresse ist gesperrt. Bitte wende dich an uns, wenn du Hilfe brauchst.";

type GesperrtRow = {
  id: string;
  ist_portal_gesperrt?: boolean | null;
  ist_spam?: boolean | null;
};

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

/**
 * Prüft, ob ein Kunde vom Portal ausgeschlossen ist
 * (expliziter Portal-Ausschluss oder Spam-Markierung).
 */
export async function isKundePortalGesperrt(opts: {
  kundeId?: string | null;
  email?: string | null;
}): Promise<boolean> {
  const kundeId = opts.kundeId?.trim() || null;
  const email = opts.email ? normalizeKundenEmail(opts.email) : "";

  if (kundeId) {
    const { data, error } = await supabaseAdmin
      .from("kunden")
      .select("id, ist_portal_gesperrt, ist_spam")
      .eq("id", kundeId)
      .maybeSingle();
    if (error) {
      if (isMissingPortalGesperrtColumn(error)) {
        // Fallback: nur Spam prüfen (ältere DBs)
        const { data: spamRow } = await supabaseAdmin
          .from("kunden")
          .select("id, ist_spam")
          .eq("id", kundeId)
          .maybeSingle();
        return Boolean((spamRow as { ist_spam?: boolean } | null)?.ist_spam);
      }
      throw error;
    }
    const row = data as GesperrtRow | null;
    if (row?.ist_portal_gesperrt || row?.ist_spam) return true;
  }

  if (email) {
    const { data, error } = await supabaseAdmin
      .from("kunden")
      .select("id, ist_portal_gesperrt, ist_spam")
      .ilike("email", email)
      .or("ist_portal_gesperrt.eq.true,ist_spam.eq.true")
      .limit(1)
      .maybeSingle();
    if (error) {
      if (isMissingPortalGesperrtColumn(error)) {
        const { data: spamRow } = await supabaseAdmin
          .from("kunden")
          .select("id, ist_spam")
          .ilike("email", email)
          .eq("ist_spam", true)
          .limit(1)
          .maybeSingle();
        return Boolean(spamRow?.id);
      }
      throw error;
    }
    if (data?.id) return true;
  }

  return false;
}
