import { SITE_CONFIG } from "@/lib/config";

const JSON_LD_CONTEXT = "https://schema.org";
const BASE_URL = "https://baerenwaldmuenchen.de";

export function localBusinessSchema(): Record<string, unknown> {
  return {
    "@context": JSON_LD_CONTEXT,
    "@type": "HomeAndConstructionBusiness",
    name: "Bärenwald München",
    description:
      "Handwerksgruppe München — ein Ansprechpartner für alle Gewerke. Renovierung, Sanierung, Garten und mehr.",
    url: BASE_URL,
    telephone: "+4916373161616",
    email: "info@baerenwald-muenchen.de",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Bärenwaldstraße 20",
      addressLocality: "München",
      postalCode: "81737",
      addressCountry: "DE",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 48.102,
      longitude: 11.605,
    },
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: 48.1351,
        longitude: 11.582,
      },
      geoRadius: "50000",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "07:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "08:00",
        closes: "14:00",
      },
    ],
    priceRange: "€€",
    currenciesAccepted: "EUR",
    paymentAccepted: "Cash, Invoice",
    founder: {
      "@type": "Person",
      name: "Beran Cakmak",
    },
    foundingDate: "2020",
    serviceArea: {
      "@type": "City",
      name: "München",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Handwerksleistungen München",
      itemListElement: [
        "Malerarbeiten",
        "Badezimmer Sanierung",
        "Bodenbelag",
        "Elektroarbeiten",
        "Heizung & Sanitär",
        "Gartenpflege",
        "Hausmeisterservice",
        "Winterdienst",
        "Trockenbau",
        "Dacharbeiten",
      ].map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service,
          areaServed: "München",
        },
      })),
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
