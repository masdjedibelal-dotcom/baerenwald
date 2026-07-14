import Link from "next/link";
import { redirect } from "next/navigation";

import { MeldeFormular } from "@/components/melden/MeldeFormular";
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
    redirect(`/melden/fehler?reason=${resolved.code}`);
  }

  const { kontext } = resolved;
  const orgName =
    kontext.org.org_anzeigename?.trim() ||
    kontext.org.name?.trim() ||
    kontext.org.org_kennung;

  const legal = resolveMeldeLegalUrls({
    meldeSlug: kontext.org.org_kennung,
    datenschutz_url: kontext.org.datenschutz_url,
    impressum_url: kontext.org.impressum_url,
  });

  if (kontext.objekt) {
    const obj = kontext.objekt;
    return (
      <MeldeFormular
        orgName={orgName}
        orgLogoUrl={kontext.org.org_logo_url}
        mieterKontaktTelefon={kontext.org.mieter_kontakt_telefon}
        mieterKontaktEmail={kontext.org.mieter_kontakt_email}
        mieterKontaktHinweis={kontext.org.mieter_kontakt_hinweis}
        objektTitel={obj.titel}
        objektAdresse={[obj.strasse, obj.hausnummer].filter(Boolean).join(" ")}
        objektPlzOrt={[obj.plz, obj.ort].filter(Boolean).join(" ")}
        einheitenHinweis={obj.einheiten_hinweis}
        orgKennung={kontext.org.org_kennung}
        objektSlug={obj.melde_slug}
        datenschutzHref={legal.datenschutz}
        impressumHref={legal.impressum}
      />
    );
  }

  if (kontext.objekte.length === 0) {
    return (
      <MeldeFormular
        orgName={orgName}
        orgLogoUrl={kontext.org.org_logo_url}
        mieterKontaktTelefon={kontext.org.mieter_kontakt_telefon}
        mieterKontaktEmail={kontext.org.mieter_kontakt_email}
        mieterKontaktHinweis={kontext.org.mieter_kontakt_hinweis}
        objektTitel={orgName}
        orgKennung={kontext.org.org_kennung}
        objektSlug={MELDE_ALLGEMEIN_SLUG}
        datenschutzHref={legal.datenschutz}
        impressumHref={legal.impressum}
      />
    );
  }

  return (
    <div className="melden-page min-h-dvh">
      <div className="melden-shell max-w-lg mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold">{orgName}</h1>
        <p className="text-text-secondary mt-1">Bitte Objekt wählen:</p>
        <div className="melden-objekt-list mt-4">
          {kontext.objekte.map((o) => (
            <Link
              key={o.id}
              href={`/melden/${kontext.org.org_kennung}/${o.melde_slug}`}
              className="melden-objekt-link"
            >
              <span className="font-medium">{o.titel}</span>
              {o.adresseZeile ? (
                <span className="block text-sm text-text-secondary mt-0.5">
                  {o.adresseZeile}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
