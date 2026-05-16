import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { HandwerkerSeoPage } from "@/components/handwerker/HandwerkerSeoPage";
import { PageLayout } from "@/components/layout/PageLayout";
import handwerkerContent from "@/data/handwerker-content.json";
import { SITE_CONFIG } from "@/lib/config";
import type { HandwerkerContentItem } from "@/lib/handwerker-types";
import { hubDetailBreadcrumbSchema } from "@/lib/schema";

const entries = handwerkerContent as HandwerkerContentItem[];
const bySlug = new Map(entries.map((e) => [e.slug, e]));

export function generateStaticParams() {
  return entries.map((c) => ({ slug: c.slug }));
}

type PageProps = { params: { slug: string } };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const data = bySlug.get(params.slug);
  if (!data) return {};
  const canonical = `${SITE_CONFIG.url}/${data.slug}`;
  return {
    title: data.title,
    description: data.metaDescription,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title: data.title,
      description: data.metaDescription,
      url: canonical,
      images: [{ url: "/og-image.png" }],
    },
  };
}

export default function HandwerkerSeoSlugPage({ params }: PageProps) {
  const data = bySlug.get(params.slug);
  if (!data) notFound();

  const breadcrumbLd = hubDetailBreadcrumbSchema(data.h1, `/${data.slug}`);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd),
        }}
      />
      <PageLayout>
        <HandwerkerSeoPage data={data} />
      </PageLayout>
    </>
  );
}
