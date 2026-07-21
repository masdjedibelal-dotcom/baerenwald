import { redirect } from "next/navigation";

import { MeldeFormular } from "@/components/melden/MeldeFormular";
import { MeldeObjektAuswahl } from "@/components/melden/MeldeObjektAuswahl";
import { MELDE_ALLGEMEIN_SLUG } from "@/lib/org/melde-url";
import { resolveMeldeLegalUrls } from "@/lib/org/melde-legal-urls";
import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";

export const metadata = {
  title: "Schaden melden",
  robots: { index: false, follow: false },
};

type Props = { params: { org: string } };

export default async function MeldenOrgPage({ params }: Props) {
  const resolved = await resolveMeldeKontext(params.org);
  if (!resolved.ok) {
    redirect(
      `/melden/fehler?reason=${resolved.code}&org=${encodeURIComponent(params.org)}`
    );
  }

  const { kontext } = resolved;
  const orgName =
    kontext.org.org_anzeigename?.trim() ||
    kontext.org.name?.trim() ||
    kontext.org.org_kennung;

  const brand = {
    name: orgName,
    sub: kontext.org.org_sub,
    logoUrl: kontext.org.org_logo_url,
    logoKuerzel: kontext.org.org_logo_kuerzel,
    primary: kontext.org.org_primary_color,
    primaryDk: kontext.org.org_primary_color_dk,
    soft: kontext.org.org_primary_color_soft,
    tel: kontext.org.mieter_kontakt_telefon,
    mail: kontext.org.mieter_kontakt_email,
  };

  const legal = resolveMeldeLegalUrls({
    meldeSlug: kontext.org.org_kennung,
    datenschutz_url: kontext.org.datenschutz_url,
    impressum_url: kontext.org.impressum_url,
  });

  const formProps = {
    orgName,
    orgLogoUrl: kontext.org.org_logo_url,
    orgLogoKuerzel: kontext.org.org_logo_kuerzel,
    orgSub: kontext.org.org_sub,
    orgPrimaryColor: kontext.org.org_primary_color,
    orgPrimaryColorDk: kontext.org.org_primary_color_dk,
    orgPrimaryColorSoft: kontext.org.org_primary_color_soft,
    mieterKontaktTelefon: kontext.org.mieter_kontakt_telefon,
    mieterKontaktEmail: kontext.org.mieter_kontakt_email,
    mieterKontaktHinweis: kontext.org.mieter_kontakt_hinweis,
    orgKennung: kontext.org.org_kennung,
    datenschutzHref: legal.datenschutz,
    impressumHref: legal.impressum,
  };

  if (kontext.objekt) {
    const obj = kontext.objekt;
    return (
      <MeldeFormular
        {...formProps}
        objektTitel={obj.display.name}
        objektAdresse={[obj.strasse, obj.hausnummer].filter(Boolean).join(" ")}
        objektPlzOrt={obj.display.adr}
        einheitenHinweis={obj.display.we}
        objektSlug={obj.melde_slug}
        objektLocked
      />
    );
  }

  if (kontext.objekte.length === 0) {
    return (
      <MeldeFormular
        {...formProps}
        objektTitel={orgName}
        objektSlug={MELDE_ALLGEMEIN_SLUG}
      />
    );
  }

  return (
    <MeldeObjektAuswahl
      brand={brand}
      objekte={kontext.objekte.map((o) => ({
        id: o.id,
        name: o.display.name,
        adr: o.display.adr,
        we: o.display.we,
        href: `/melden/${kontext.org.org_kennung}/${o.melde_slug}`,
      }))}
    />
  );
}
