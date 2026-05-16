import { SITE_CONFIG } from "@/lib/config";

const JSON_LD_CONTEXT = "https://schema.org";
const BASE_URL = "https://baerenwaldmuenchen.de";

export function localBusinessSchema(): Record<string, unknown> {
  return {
    "@context": JSON_LD_CONTEXT,
    "@type": "HomeAndConstructionBusiness",
    name: "Bärenwald München",
    description:
      "Generalunternehmer für Handwerk in München — ein Ansprechpartner für alle Gewerke von der Einzelreparatur bis zur Komplettrenovierung.",
    url: BASE_URL,
    telephone: "+4989999733904",
    email: "info@baerenwaldmuenchen.de",
    address: {
      "@type": "PostalAddress",
      addressLocality: "München",
      addressRegion: "Bayern",
      postalCode: "81737",
      addressCountry: "DE",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 48.1351,
      longitude: 11.582,
    },
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: 48.1351,
        longitude: 11.582,
      },
      geoRadius: "60000",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
        ],
        opens: "08:00",
        closes: "18:00",
      },
    ],
    priceRange: "€€",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "27",
    },
    sameAs: [
      "https://www.instagram.com/baerenwald_muenchen/",
      "https://share.google/LzY5wwX8Su2DJYITP",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Handwerksleistungen",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Malerarbeiten München",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Badsanierung München",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Elektriker München",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Heizung München",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Bodenleger München",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Sanitär München",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Dachdecker München",
          },
        },
      ],
    },
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

/** Leistungs- & Handwerker-Detailseiten: Startseite → Leistungen (#) → aktuelle Seite */
export function hubDetailBreadcrumbSchema(
  pageTitle: string,
  pagePath: string
): Record<string, unknown> {
  const path = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  const pageUrl = `${BASE_URL}${path}`;
  return {
    "@context": JSON_LD_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Startseite",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Leistungen",
        item: `${BASE_URL}/#leistungen`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: pageTitle,
        item: pageUrl,
      },
    ],
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
