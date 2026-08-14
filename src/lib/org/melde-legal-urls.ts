/** Org-spezifische Rechts-URLs für Mieter-Melde-Routen (nach anwaltlicher Freigabe). */

export function meldeDatenschutzUrl(orgSlug: string): string {
  return `/melden/${encodeURIComponent(orgSlug)}/datenschutz`;
}

export function meldeImpressumUrl(orgSlug: string): string {
  return `/melden/${encodeURIComponent(orgSlug)}/impressum`;
}

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
