/** Org-spezifische Rechts-URLs für Mieter-Melde-Routen (nach anwaltlicher Freigabe). */

export function meldeDatenschutzUrl(orgSlug: string): string {
  return `/melden/${encodeURIComponent(orgSlug)}/datenschutz`;
}

export function meldeImpressumUrl(orgSlug: string): string {
  return `/melden/${encodeURIComponent(orgSlug)}/impressum`;
}

/** Absolute http(s)-URL — für Aushang-Freigabe und Speichern. */
export function isAbsoluteHttpUrl(raw: string | null | undefined): boolean {
  const s = String(raw ?? "").trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Aushang / Melde-Link / QR erst freigeben, wenn HV beide Legal-URLs gesetzt hat.
 * Melde-Funnel behält weiterhin Fallback (resolveMeldeLegalUrls).
 */
export function orgMeldeLegalUrlsReady(input: {
  impressum_url?: string | null;
  datenschutz_url?: string | null;
}): boolean {
  return (
    isAbsoluteHttpUrl(input.impressum_url) &&
    isAbsoluteHttpUrl(input.datenschutz_url)
  );
}

export const ORG_MELDE_LEGAL_REQUIRED_HINT =
  "Bitte zuerst Impressum- und Datenschutz-Link speichern — danach sind Melde-Link, QR und Aushang verfügbar." as const;

export const ORG_MELDE_LEGAL_REQUIRED_ERROR =
  "Impressum- und Datenschutz-Link müssen unter Einstellungen → Profil hinterlegt sein, bevor Aushang oder QR erzeugt werden." as const;

export function resolveMeldeLegalUrls(input: {
  meldeSlug?: string | null;
  datenschutz_url?: string | null;
  impressum_url?: string | null;
}): { datenschutz: string; impressum: string } {
  const slug = input.meldeSlug?.trim();
  if (slug) {
    return {
      datenschutz: input.datenschutz_url?.trim() || meldeDatenschutzUrl(slug),
      impressum: input.impressum_url?.trim() || meldeImpressumUrl(slug),
    };
  }
  return {
    datenschutz: input.datenschutz_url?.trim() || "/datenschutz#melden-hv",
    impressum: input.impressum_url?.trim() || "/impressum",
  };
}
