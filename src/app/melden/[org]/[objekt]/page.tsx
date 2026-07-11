import { redirect } from "next/navigation";

import { MeldeFormular } from "@/components/melden/MeldeFormular";
import { MELDE_ALLGEMEIN_SLUG } from "@/lib/org/melde-url";
import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";

export const metadata = {
  title: "Schaden melden",
  robots: { index: false, follow: false },
};

type Props = { params: { org: string; objekt: string } };

export default async function MeldenObjektPage({ params }: Props) {
  const resolved = await resolveMeldeKontext(params.org, params.objekt);
  if (!resolved.ok) {
    redirect(`/melden/fehler?reason=${resolved.code}`);
  }

  const { kontext } = resolved;
  const objSlug = params.objekt.trim().toLowerCase();

  if (!kontext.objekt && objSlug !== MELDE_ALLGEMEIN_SLUG) {
    redirect(`/melden/${kontext.org.org_kennung}`);
  }

  const orgName =
    kontext.org.org_anzeigename?.trim() ||
    kontext.org.name?.trim() ||
    kontext.org.org_kennung;

  const obj = kontext.objekt;

  return (
    <MeldeFormular
      orgName={orgName}
      orgLogoUrl={kontext.org.org_logo_url}
      objektTitel={obj?.titel ?? orgName}
      objektAdresse={
        obj
          ? [obj.strasse, obj.hausnummer].filter(Boolean).join(" ")
          : undefined
      }
      objektPlzOrt={obj ? [obj.plz, obj.ort].filter(Boolean).join(" ") : undefined}
      einheitenHinweis={obj?.einheiten_hinweis}
      orgKennung={kontext.org.org_kennung}
      objektSlug={obj?.melde_slug ?? MELDE_ALLGEMEIN_SLUG}
    />
  );
}
