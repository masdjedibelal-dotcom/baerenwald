import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { MeldeFormular } from "@/components/melden/MeldeFormular";
import { MELDE_ALLGEMEIN_SLUG } from "@/lib/org/melde-url";
import { resolveMeldeLegalUrls } from "@/lib/org/melde-legal-urls";
import { funktionAn } from "@/lib/marke";
import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";
import { ladeMitteilungen, ladeObjektDokumente } from "@/teo/arbeitsplatz/daten/haus";
import { HausInfo } from "@/teo/mein/HausInfo";
import { ladeHausPlaene } from "@/teo/mein/mein-daten";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Schaden melden",
  robots: { index: false, follow: false },
};

type Props = { params: { org: string; objekt: string } };

export default async function MeldenObjektPage({ params }: Props) {
  const resolved = await resolveMeldeKontext(params.org, params.objekt);
  if (!resolved.ok) {
    redirect(
      `/melden/fehler?reason=${resolved.code}&org=${encodeURIComponent(params.org)}`
    );
  }

  const { kontext } = resolved;
  const objSlug = params.objekt.trim().toLowerCase();

  if (!kontext.objekt && objSlug !== MELDE_ALLGEMEIN_SLUG) {
    redirect(
      `/melden/${encodeURIComponent(kontext.org.org_kennung)}?hinweis=objekt_nicht_gefunden`
    );
  }

  const orgName =
    kontext.org.org_anzeigename?.trim() ||
    kontext.org.name?.trim() ||
    kontext.org.org_kennung;

  const obj = kontext.objekt;

  const legal = resolveMeldeLegalUrls({
    meldeSlug: kontext.org.org_kennung,
    datenschutz_url: kontext.org.datenschutz_url,
    impressum_url: kontext.org.impressum_url,
  });

  // Servus TEO: Bewohner sehen beim Scannen aktuelle Mitteilungen, Pläne und Dokumente
  let hausInfo: ReactNode = null;
  if (funktionAn("hvWorkflow") && obj?.id) {
    const [mitteilungen, plaene, dokumente] = await Promise.all([
      ladeMitteilungen([obj.id], { nurAktuell: true }),
      ladeHausPlaene([obj.id]),
      ladeObjektDokumente(kontext.org.id, [obj.id], { nurBewohner: true }),
    ]);
    hausInfo = <HausInfo mitteilungen={mitteilungen} plaene={plaene.get(obj.id) ?? []} dokumente={dokumente} />;
  }

  return (
    <MeldeFormular
      hausInfo={hausInfo}
      orgName={orgName}
      mieterKontaktTelefon={kontext.org.mieter_kontakt_telefon}
      mieterKontaktEmail={kontext.org.mieter_kontakt_email}
      mieterKontaktHinweis={kontext.org.mieter_kontakt_hinweis}
      objektTitel={obj?.display.name ?? orgName}
      objektAdresse={
        obj
          ? [obj.strasse, obj.hausnummer].filter(Boolean).join(" ")
          : undefined
      }
      objektPlzOrt={obj?.display.adr}
      objektStrasse={obj?.strasse}
      objektHausnummer={obj?.hausnummer}
      objektPlz={obj?.plz}
      objektOrt={obj?.ort}
      einheitenHinweis={obj?.display.we}
      orgKennung={kontext.org.org_kennung}
      objektSlug={obj?.melde_slug ?? MELDE_ALLGEMEIN_SLUG}
      objektLocked={Boolean(obj)}
      datenschutzHref={legal.datenschutz}
      impressumHref={legal.impressum}
      akutFallIds={obj?.akut_fall_ids ?? kontext.org.akut_fall_ids ?? []}
    />
  );
}
