/** Org-spezifische Rechts-URLs für Mieter-Melde-Routen (nach anwaltlicher Freigabe). */

export function meldeDatenschutzUrl(orgSlug: string): string {
  return `/melden/${encodeURIComponent(orgSlug)}/datenschutz`;
}

export function meldeImpressumUrl(orgSlug: string): string {
  return `/melden/${encodeURIComponent(orgSlug)}/impressum`;
}

/**
 * Nutzer-Eingabe → absolute http(s)-URL.
 * Akzeptiert `https://…`, `http://…`, `www.…` und `domain.de/…` (hängt `https://` voran).
 */
export function normalizeOrgHttpUrl(
  raw: string | null | undefined
): string | null {
  let s = String(raw ?? "").trim();
  if (!s) return null;
  if (/^\/\//.test(s)) s = `https:${s}`;
  else if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // Host ohne Punkt (z. B. "foo") ablehnen — mind. Domain-artig
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Absolute http(s)-URL — inkl. Eingaben wie www.… (nach Normalisierung). */
export function isAbsoluteHttpUrl(raw: string | null | undefined): boolean {
  return normalizeOrgHttpUrl(raw) != null;
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
