import { redirect } from "next/navigation";

import { MeldeFormular } from "@/components/melden/MeldeFormular";
import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";

export const metadata = {
  title: "Schaden melden",
  robots: { index: false, follow: false },
};

type Props = { params: { org: string; objekt: string } };

export default async function MeldenObjektPage({ params }: Props) {
  const resolved = await resolveMeldeKontext(params.org, params.objekt);
  if (!resolved.ok || !resolved.kontext.objekt) {
    redirect(
      `/melden/fehler?reason=${!resolved.ok ? resolved.code : "not_found"}`
    );
  }

  const { kontext } = resolved;
  const obj = kontext.objekt!;
  const orgName =
    kontext.org.org_anzeigename?.trim() ||
    kontext.org.name?.trim() ||
    kontext.org.org_kennung;

  return (
    <MeldeFormular
      orgName={orgName}
      orgLogoUrl={kontext.org.org_logo_url}
      objektTitel={obj.titel}
      objektAdresse={[obj.strasse, obj.hausnummer].filter(Boolean).join(" ")}
      objektPlzOrt={[obj.plz, obj.ort].filter(Boolean).join(" ")}
      einheitenHinweis={obj.einheiten_hinweis}
      orgKennung={kontext.org.org_kennung}
      objektSlug={obj.melde_slug}
    />
  );
}
