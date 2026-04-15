import { notFound } from "next/navigation";

import { PageLayout } from "@/components/layout/PageLayout";
import { RatgeberPage } from "@/components/ratgeber/RatgeberPage";
import { SITE_CONFIG } from "@/lib/config";
import { ratgeberDataForSlug } from "@/lib/ratgeber/data";
import { RATGEBER } from "@/lib/routes";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
} from "@/lib/schema";

type PageProps = { params: { slug: string } };

export function generateStaticParams() {
  return RATGEBER.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const data = ratgeberDataForSlug(params.slug);
  if (!data) {
    return { title: "Ratgeber — Bärenwald Handwerksgruppe" };
  }

  const title = `${data.metaTitle} — Kosten & Ablauf München 2026`;
  const description = `${data.metaDescription} Aktuelle Preise für München 2026, Ablauf und Tipps.`;
  const canonical = `https://baerenwaldmuenchen.de/ratgeber/${params.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      images: [{ url: "/og-image.png" }],
    },
  };
}

export default function RatgeberDetailPage({ params }: PageProps) {
  const data = ratgeberDataForSlug(params.slug);
  if (!data) notFound();

  const path = `/ratgeber/${data.slug}`;
  const faqLd = faqSchema(data.faq);
  const crumbLd = breadcrumbSchema([
    { name: "Startseite", url: "/" },
    { name: "Ratgeber", url: "/ratgeber" },
    { name: data.titel, url: path },
  ]);
  const articleLd = articleSchema({
    headline: data.hero.headline.replace(/\n/g, " ").trim(),
    description: data.metaDescription,
    path,
    datePublished: data.datePublished,
    dateModified: data.dateModified,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <PageLayout>
        <RatgeberPage data={data} />
      </PageLayout>
    </>
  );
}
