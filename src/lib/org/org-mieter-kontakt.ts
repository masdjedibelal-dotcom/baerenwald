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

export function orgDisplayName(org: Pick<OrgMieterKontakt, "org_anzeigename" | "name">): string {
  return org.org_anzeigename?.trim() || org.name?.trim() || "Ihre Hausverwaltung";
}

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

/** Fußzeile für Mieter-Mails/Status (No-Reply + HV-Kontakt oder Fallback). */
export function orgMieterKontaktFooter(org: OrgMieterKontakt, lang: "de" | "en" = "de"): string {
  const name = orgDisplayName(org);
  const tel = orgEffectiveMieterTel(org) || undefined;
  const mail = orgEffectiveMieterMail(org) || undefined;
  const hint = org.mieter_kontakt_hinweis?.trim();
  const noReply =
    lang === "de"
      ? "Diese Nachricht kann nicht beantwortet werden."
      : "This message cannot be replied to.";

  if (tel || mail) {
    const parts: string[] = [];
    if (lang === "de") {
      parts.push(`Bei Rückfragen erreichen Sie ${name}`);
      if (tel) parts.push(`unter ${tel}`);
      if (mail) parts.push(tel ? `oder ${mail}` : `unter ${mail}`);
    } else {
      parts.push(`For questions, contact ${name}`);
      if (tel) parts.push(`at ${tel}`);
      if (mail) parts.push(tel ? `or ${mail}` : `at ${mail}`);
    }
    if (hint) parts.push(`(${hint})`);
    return `${parts.join(" ")}. ${noReply}`;
  }

  const fallback =
    lang === "de"
      ? `Bei Rückfragen wenden Sie sich an Ihre Hausverwaltung. ${noReply}`
      : `For questions, contact your property management. ${noReply}`;
  return fallback;
}

/** Kurztext für Melde-UI (ohne No-Reply). */
export function orgMieterKontaktKurz(org: OrgMieterKontakt, lang: "de" | "en" = "de"): string {
  const tel = orgEffectiveMieterTel(org) || undefined;
  const mail = orgEffectiveMieterMail(org) || undefined;
  const name = orgDisplayName(org);
  if (!tel && !mail) {
    return lang === "de"
      ? `${name} bearbeitet Ihre Meldung.`
      : `${name} is handling your report.`;
  }
  if (lang === "de") {
    return `Bei Rückfragen: ${name}${tel ? ` · ${tel}` : ""}${mail ? ` · ${mail}` : ""}`;
  }
  return `Questions: ${name}${tel ? ` · ${tel}` : ""}${mail ? ` · ${mail}` : ""}`;
}
