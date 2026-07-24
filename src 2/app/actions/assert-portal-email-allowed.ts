"use server";

import {
  isKundePortalGesperrt,
  KUNDE_PORTAL_GESPERRT_MESSAGE,
} from "@/lib/kunden/kunde-portal-gesperrt";
import { normalizeKundenEmail } from "@/lib/kunden/kunde-email";

/**
 * Vor Login/Registrierung: Portal-Ausschluss und Spam ablehnen.
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
    const gesperrt = await isKundePortalGesperrt({ email: norm });
    if (gesperrt) {
      return { ok: false, error: KUNDE_PORTAL_GESPERRT_MESSAGE };
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
