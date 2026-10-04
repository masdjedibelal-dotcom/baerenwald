/** Mieter-Kontakt & WL-Readiness für Organisationen. */

export type OrgMieterKontakt = {
  org_anzeigename?: string | null;
  name?: string | null;
  email?: string | null;
  org_telefon?: string | null;
  mieter_kontakt_telefon?: string | null;
  mieter_kontakt_email?: string | null;
  mieter_kontakt_hinweis?: string | null;
};

export type OrgWhitelabelFields = OrgMieterKontakt & {
  av_akzeptiert_am?: string | null;
  av_version?: string | null;
  org_primary_color?: string | null;
  impressum_url?: string | null;
  datenschutz_url?: string | null;
};

export const ORG_AV_VERSION_CURRENT = "2026-07";

/** Effektiver Mieter-Kontakt: dedizierte Felder, sonst Profil (Telefon/E-Mail). */
export function orgEffectiveMieterTel(org: OrgMieterKontakt): string {
  return (
    org.mieter_kontakt_telefon?.trim() ||
    org.org_telefon?.trim() ||
    ""
  );
}

export function orgEffectiveMieterMail(org: OrgMieterKontakt): string {
  return (
    org.mieter_kontakt_email?.trim() ||
    org.email?.trim() ||
    ""
  );
}

/** Mindestens ein erreichbarer Mieter-Kontaktweg (inkl. Profil-Fallback). */
export function orgHasMieterKontakt(org: OrgMieterKontakt): boolean {
  return Boolean(orgEffectiveMieterTel(org) || orgEffectiveMieterMail(org));
}

/** AV + Mieter-Kontakt für WL-Melde-Flow. */
export function orgWhitelabelReady(org: OrgWhitelabelFields): boolean {
  return Boolean(org.av_akzeptiert_am?.trim()) && orgHasMieterKontakt(org);
}
