import { MeldeFehlerClient } from "@/components/melden/MeldeFehlerClient";
import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";

export const metadata = {
  title: "Link nicht verfügbar",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: { reason?: string; org?: string };
};

/**
 * D9 `wlFehler` — exakter Mock-Wortlaut.
 * Optional `?org=` für Branding + Zurück zur Objektauswahl.
 */
export default async function MeldenFehlerPage({ searchParams }: Props) {
  const orgSlug = searchParams.org?.trim();
  let brand = null;
  let objektHref: string | null = null;

  if (orgSlug) {
    const resolved = await resolveMeldeKontext(orgSlug);
    if (resolved.ok) {
      const org = resolved.kontext.org;
      const name =
        org.org_anzeigename?.trim() || org.name?.trim() || org.org_kennung;
      brand = {
        name,
        sub: org.org_sub,
        logoUrl: org.org_logo_url,
        logoKuerzel: org.org_logo_kuerzel,
        primary: org.org_primary_color,
        primaryDk: org.org_primary_color_dk,
        soft: org.org_primary_color_soft,
        tel: org.mieter_kontakt_telefon,
        mail: org.mieter_kontakt_email,
      };
      objektHref = `/melden/${org.org_kennung}`;
    }
  }

  return (
    <MeldeFehlerClient brand={brand} objektAuswahlHref={objektHref} />
  );
}
