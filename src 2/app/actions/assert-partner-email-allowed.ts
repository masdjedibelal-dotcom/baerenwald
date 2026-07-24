"use server";

import {
  HANDWERKER_PORTAL_GESPERRT_MESSAGE,
  isHandwerkerPortalGesperrt,
} from "@/lib/partner/handwerker-portal-gesperrt";

/**
 * Vor Partner-Login/Registrierung: ausgeschlossene Betriebe ablehnen.
 */
export async function assertPartnerEmailAllowed(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const norm = email.trim().toLowerCase();
  if (!norm) {
    return { ok: false, error: "Bitte eine gültige E-Mail angeben." };
  }

  try {
    const gesperrt = await isHandwerkerPortalGesperrt({ email: norm });
    if (gesperrt) {
      return { ok: false, error: HANDWERKER_PORTAL_GESPERRT_MESSAGE };
    }
  } catch (e) {
    console.error("[assertPartnerEmailAllowed]", e);
    return {
      ok: false,
      error: "Prüfung fehlgeschlagen. Bitte versuche es später erneut.",
    };
  }

  return { ok: true };
}
