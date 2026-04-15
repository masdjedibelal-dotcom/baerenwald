import { notFound } from "next/navigation";

import { LeistungsPage } from "@/components/leistungen/LeistungsPage";
import { PageLayout } from "@/components/layout/PageLayout";
import { SITE_CONFIG } from "@/lib/config";
import {
  LEISTUNGEN_DATA,
  leistungBaseSlugFromParam,
} from "@/lib/leistungen/data";
import { LEISTUNGEN } from "@/lib/routes";
import { serviceSchema } from "@/lib/schema";

type PageProps = { params: { slug: string } };

export function generateStaticParams() {
  return LEISTUNGEN.map((l) => ({ slug: `${l.slug}-muenchen` }));
}

export async function generateMetadata({ params }: PageProps) {
  const base = leistungBaseSlugFromParam(params.slug);
  const data = base ? LEISTUNGEN_DATA[base] : undefined;
  if (!data) {
    return { title: "Leistung — Bärenwald Handwerksgruppe" };
  }

  const title = `${data.label} München — Preise & Angebot`;
  const description =
    data.metaDescription ??
    `${data.label} in München — Preisrahmen online berechnen, unverbindlich anfragen. Meisterbetriebe, ein Ansprechpartner.`;
  const canonical = `https://baerenwaldmuenchen.de/leistungen/${params.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: "/og-image.png" }],
    },
  };
}

export default function LeistungDetailPage({ params }: PageProps) {
  const base = leistungBaseSlugFromParam(params.slug);
  const data = base ? LEISTUNGEN_DATA[base] : undefined;
  if (!data) notFound();

  const serviceLd = serviceSchema(
    `${data.label} in München`,
    data.beschreibung.replace(/\s+/g, " ").trim().slice(0, 500)
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceLd),
        }}
      />
      <PageLayout>
        <LeistungsPage slug={params.slug} data={data} />
      </PageLayout>
    </>
  );
}
