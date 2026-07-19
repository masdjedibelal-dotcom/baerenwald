import { MeldenBestaetigungClient } from "@/components/melden/MeldenBestaetigungClient";
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
  };
};

export default async function MeldenBestaetigungPage({ searchParams }: Props) {
  const kennung = searchParams.kennung?.trim();
  const orgNameFallback =
    searchParams.org?.trim() || "Ihre Hausverwaltung";

  let brand = {
    name: orgNameFallback,
    sub: "Hausverwaltung" as string | null,
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
        sub: org.org_sub ?? "Hausverwaltung",
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
  const referenz = token ? token.slice(0, 8).toUpperCase() : null;

  return (
    <MeldenBestaetigungClient
      brand={brand}
      statusToken={token}
      statusLink={searchParams.statusLink}
      referenz={referenz}
      objektAuswahlHref={objektHref}
    />
  );
}
