import { MeldenBestaetigungClient } from "@/components/melden/MeldenBestaetigungClient";
import {
  loadMeldeContactByToken,
  meldePortalAccountExists,
} from "@/lib/melde/melde-bestaetigung";
import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";

export const metadata = {
  title: "Meldung eingegangen",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: {
    org?: string;
    kennung?: string;
    token?: string;
    statusLink?: string;
    /** Fallback wenn Token fehlt (Client-Redirect) */
    name?: string;
    email?: string;
    telefon?: string;
  };
};

export default async function MeldenBestaetigungPage({ searchParams }: Props) {
  const kennung = searchParams.kennung?.trim();
  const orgNameFallback =
    searchParams.org?.trim() || "Ihre Verwaltung";

  let brand = {
    name: orgNameFallback,
    sub: "Verwaltung" as string | null,
    logoUrl: null as string | null,
    logoKuerzel: null as string | null,
    primary: null as string | null,
    primaryDk: null as string | null,
    soft: null as string | null,
    tel: null as string | null,
    mail: null as string | null,
  };
  let objektHref: string | null = null;

  if (kennung) {
    const resolved = await resolveMeldeKontext(kennung);
    if (resolved.ok) {
      const org = resolved.kontext.org;
      brand = {
        name:
          org.org_anzeigename?.trim() ||
          org.name?.trim() ||
          orgNameFallback,
        sub: org.org_sub ?? "Verwaltung",
        logoUrl: org.org_logo_url ?? null,
        logoKuerzel: org.org_logo_kuerzel ?? null,
        primary: org.org_primary_color ?? null,
        primaryDk: org.org_primary_color_dk ?? null,
        soft: org.org_primary_color_soft ?? null,
        tel: org.mieter_kontakt_telefon ?? null,
        mail: org.mieter_kontakt_email ?? null,
      };
      objektHref = `/melden/${org.org_kennung}`;
    }
  }

  const token = searchParams.token?.trim() || null;
  // statusLink kann Token enthalten: /melden/status/TOKEN
  const tokenFromLink = (() => {
    const link = searchParams.statusLink?.trim();
    if (!link) return null;
    const m = link.match(/\/melden\/status\/([^/?#]+)/i);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  })();
  const effectiveToken = token || tokenFromLink;

  const fromDb = effectiveToken
    ? await loadMeldeContactByToken(effectiveToken)
    : null;

  const contactName =
    fromDb?.name || searchParams.name?.trim() || null;
  const contactEmail =
    fromDb?.email || searchParams.email?.trim()?.toLowerCase() || null;
  const contactTelefon =
    fromDb?.telefon || searchParams.telefon?.trim() || null;

  const portalAccountExists = await meldePortalAccountExists(contactEmail);

  const referenz = effectiveToken
    ? effectiveToken.slice(0, 8).toUpperCase()
    : null;

  return (
    <MeldenBestaetigungClient
      brand={brand}
      statusToken={effectiveToken}
      referenz={referenz}
      objektAuswahlHref={objektHref}
      contactName={contactName}
      contactEmail={contactEmail}
      contactTelefon={contactTelefon}
      portalAccountExists={portalAccountExists}
    />
  );
}
