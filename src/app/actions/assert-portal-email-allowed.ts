"use server";

import {
  isKundeAlsSpamGesperrt,
  KUNDE_GESPERRT_MESSAGE,
} from "@/lib/kunden/kunde-spam";
import { normalizeKundenEmail } from "@/lib/kunden/kunde-email";

/**
 * Vor Login/Registrierung: Spam-E-Mails ablehnen.
 * Antwort bewusst ohne „Spam“-Wortlaut.
 */
export async function assertPortalEmailAllowed(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const norm = normalizeKundenEmail(email);
  if (!norm) {
    return { ok: false, error: "Bitte eine gültige E-Mail angeben." };
  }

  try {
    const spam = await isKundeAlsSpamGesperrt({ email: norm });
    if (spam) {
      return { ok: false, error: KUNDE_GESPERRT_MESSAGE };
    }
  } catch (e) {
    console.error("[assertPortalEmailAllowed]", e);
    return {
      ok: false,
      error: "Prüfung fehlgeschlagen. Bitte versuche es später erneut.",
    };
  }

  return { ok: true };
}
