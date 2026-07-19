import {
  normalizeKundenEmail,
} from "@/lib/kunden/kunde-email";
import { supabaseAdmin } from "@/lib/supabase";

/** Nutzerfreundliche Meldung (kein „Spam“ nach außen). */
export const KUNDE_GESPERRT_MESSAGE =
  "Diese Kontaktadresse ist gesperrt. Bitte wende dich an uns, wenn du Hilfe brauchst.";

type SpamRow = { id: string; ist_spam?: boolean | null };

function isMissingIstSpamColumn(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    msg.includes("ist_spam") ||
    (msg.includes("column") && msg.includes("does not exist"))
  );
}

/** Prüft, ob ein Kunde (per ID / E-Mail / Telefon) als Spam markiert ist. */
export async function isKundeAlsSpamGesperrt(opts: {
  kundeId?: string | null;
  email?: string | null;
  telefon?: string | null;
}): Promise<boolean> {
  const kundeId = opts.kundeId?.trim() || null;
  const email = opts.email ? normalizeKundenEmail(opts.email) : "";
  const telefon = opts.telefon?.trim() || "";

  if (kundeId) {
    const { data, error } = await supabaseAdmin
      .from("kunden")
      .select("id, ist_spam")
      .eq("id", kundeId)
      .maybeSingle();
    if (error) {
      if (isMissingIstSpamColumn(error)) return false;
      throw error;
    }
    if ((data as SpamRow | null)?.ist_spam) return true;
  }

  if (email) {
    const { data, error } = await supabaseAdmin
      .from("kunden")
      .select("id, ist_spam")
      .ilike("email", email)
      .eq("ist_spam", true)
      .limit(1)
      .maybeSingle();
    if (error) {
      if (isMissingIstSpamColumn(error)) return false;
      throw error;
    }
    if (data?.id) return true;
  }

  if (telefon.length >= 3) {
    const { data, error } = await supabaseAdmin
      .from("kunden")
      .select("id, ist_spam")
      .eq("telefon", telefon)
      .eq("ist_spam", true)
      .limit(1)
      .maybeSingle();
    if (error) {
      if (isMissingIstSpamColumn(error)) return false;
      throw error;
    }
    if (data?.id) return true;
  }

  return false;
}
