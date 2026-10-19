/** Mieter-Kontakt der Verwaltung (für die Schadenmeldung). */

export type OrgMieterKontakt = {
  org_anzeigename?: string | null;
  name?: string | null;
  email?: string | null;
  org_telefon?: string | null;
  mieter_kontakt_telefon?: string | null;
  mieter_kontakt_email?: string | null;
  mieter_kontakt_hinweis?: string | null;
};

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
