import Link from "next/link";
import { redirect } from "next/navigation";

import { MeldeFormular } from "@/components/melden/MeldeFormular";
import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";

export const metadata = {
  title: "Objekt wählen — Meldung",
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

  if (kontext.objekte.length === 1 && kontext.objekte[0]) {
    const o = kontext.objekte[0];
    return (
      <MeldeFormular
        orgName={orgName}
        orgLogoUrl={kontext.org.org_logo_url}
        objektTitel={o.titel}
        objektAdresse={o.adresseZeile}
        orgKennung={kontext.org.org_kennung}
        objektSlug={o.melde_slug}
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
