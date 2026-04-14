import { SITE_CONFIG } from "@/lib/config";

const JSON_LD_CONTEXT = "https://schema.org";

export function localBusinessSchema(): Record<string, unknown> {
  return {
    "@context": JSON_LD_CONTEXT,
    "@type": "LocalBusiness",
    name: SITE_CONFIG.companyName,
    url: SITE_CONFIG.url,
    telephone: SITE_CONFIG.phone,
    email: SITE_CONFIG.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "München",
      addressCountry: "DE",
    },
    areaServed: SITE_CONFIG.region,
    priceRange: "€€",
  };
}

export function serviceSchema(
  service: string,
  description: string
): Record<string, unknown> {
  return {
    "@context": JSON_LD_CONTEXT,
    "@type": "Service",
    name: service,
    description,
    provider: {
      "@type": "LocalBusiness",
      name: SITE_CONFIG.companyName,
      url: SITE_CONFIG.url,
      telephone: SITE_CONFIG.phone,
    },
    areaServed: SITE_CONFIG.region,
  };
}

export function faqSchema(
  faqs: { q: string; a: string }[]
): Record<string, unknown> {
  return {
    "@context": JSON_LD_CONTEXT,
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function breadcrumbSchema(
  items: { name: string; url: string }[]
): Record<string, unknown> {
  return {
    "@context": JSON_LD_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_CONFIG.url}${item.url}`,
    })),
  };
}

export function articleSchema(input: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
}): Record<string, unknown> {
  const url = `${SITE_CONFIG.url}${input.path}`;
  return {
    "@context": JSON_LD_CONTEXT,
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: {
      "@type": "Organization",
      name: SITE_CONFIG.companyName,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.companyName,
      url: SITE_CONFIG.url,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}
