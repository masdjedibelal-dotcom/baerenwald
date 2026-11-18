import { notFound } from "next/navigation";

import { LeistungsPage } from "@/components/leistungen/LeistungsPage";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  buildLeistungsDataFallback,
  LEISTUNGEN_DATA,
  leistungBaseSlugFromParam,
} from "@/lib/leistungen/data";
import type { LeistungsData } from "@/lib/leistungen/types";
import { OG_IMAGE } from "@/lib/config";
import { LEISTUNGEN } from "@/lib/routes";
import { leistungPriceRangeForSlug } from "@/lib/leistungen/leistungen-seo";
import { hubDetailBreadcrumbSchema, serviceSchema } from "@/lib/schema";
import { istTeo, MARKE_WEBSITE_URL } from "@/lib/marke";
import { isStagingDeploy } from "@/lib/staging";
import { leistungPfad, TEO_LEISTUNGEN, teoLeistung } from "@/teo/leistungen/leistungen";
import { TeoLeistungSeite } from "@/teo/leistungen/TeoLeistung";

type PageProps = { params: { slug: string } };

function resolveLeistungsData(base: string): LeistungsData | undefined {
  return (
    LEISTUNGEN_DATA[base] ?? buildLeistungsDataFallback(base) ?? undefined
  );
}

export function generateStaticParams() {
  if (istTeo) return TEO_LEISTUNGEN.map((l) => ({ slug: l.slug }));
  return LEISTUNGEN.flatMap((l) => [
    { slug: `${l.slug}-muenchen` },
    { slug: l.slug },
  ]);
}

export async function generateMetadata({ params }: PageProps) {
  // Servus TEO: eigene Leistungsseiten für Hausverwaltungen (src/teo/leistungen)
  if (istTeo) {
    const l = teoLeistung(params.slug);
    if (!l) return { title: "Leistungen" };
    const canonical = `${MARKE_WEBSITE_URL}${leistungPfad(l.slug)}`;
    return {
      title: l.metaTitel,
      description: l.beschreibung,
      alternates: { canonical },
      // TEO-Layout ist standardmäßig noindex (Portal) — Leistungsseiten sollen gefunden werden
      robots: isStagingDeploy() ? { index: false, follow: false } : { index: true, follow: true },
      openGraph: { type: "website", title: l.titel, description: l.beschreibung, url: canonical },
    };
  }
  const base = leistungBaseSlugFromParam(params.slug);
  const data = base ? resolveLeistungsData(base) : undefined;
  if (!data) {
    return { title: "Leistung — Bärenwald" };
  }

  const title = data.ohnePreis
    ? `${data.label} München — Ablauf & Angebot`
    : `${data.label} München — Preise & Angebot`;
  const description =
    data.metaDescription ??
    (data.ohnePreis
      ? `${data.label} in München — Fotos und Wünsche senden, Angebot nach der Besichtigung. Eigene Gewerke und Fachpartner, ein Ansprechpartner.`
      : `${data.label} in München — Preisrahmen online berechnen, unverbindlich anfragen. Eigene Gewerke und Fachpartner, ein Ansprechpartner.`);
  const canonical = `https://baerenwaldmuenchen.de/leistungen/${params.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: OG_IMAGE.alt }],
    },
  };
}

export default function LeistungDetailPage({ params }: PageProps) {
  if (istTeo) {
    const l = teoLeistung(params.slug);
    if (!l) notFound();
    return <TeoLeistungSeite l={l} />;
  }
  const base = leistungBaseSlugFromParam(params.slug);
  const data = base ? resolveLeistungsData(base) : undefined;
  if (!data) notFound();

  const serviceLd = serviceSchema(
    `${data.label} in München`,
    data.beschreibung.replace(/\s+/g, " ").trim().slice(0, 500),
    leistungPriceRangeForSlug(base)
  );
  const breadcrumbLd = hubDetailBreadcrumbSchema(
    data.label,
    `/leistungen/${params.slug}`
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd),
        }}
      />
      <PageLayout>
        <LeistungsPage slug={params.slug} data={data} />
      </PageLayout>
    </>
  );
}
