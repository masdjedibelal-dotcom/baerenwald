import type { MetadataRoute } from "next";
import handwerkerContent from "@/data/handwerker-content.json";
import { LEISTUNGEN, RATGEBER, leistungHref, ratgeberHref } from "@/lib/routes";
import type { HandwerkerContentItem } from "@/lib/handwerker-types";
import { MARKE } from "@/lib/marke";

const BASE = MARKE.portalUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  // Servus TEO: nur die Startseite (keine Leistungs-/Ratgeber-Seiten)
  if (!MARKE.marketingSeite) {
    return [{ url: BASE, lastModified: new Date(), changeFrequency: "monthly", priority: 1.0 }];
  }
  return [
    // Startseite
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },

    // Ratgeber-Übersicht
    {
      url: `${BASE}/ratgeber`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },

    // Partner-Übersicht (alle Stadtteile)
    {
      url: `${BASE}/handwerker-muenchen`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },

    // Leistungsseiten
    ...LEISTUNGEN.map((l) => ({
      url: `${BASE}${leistungHref(l.slug)}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),

    // Ratgeber-Artikel
    ...RATGEBER.map((r) => ({
      url: `${BASE}${ratgeberHref(r.slug)}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // SEO-Partner-Stadtteilseiten (nur Sitemap, keine Nav)
    ...(handwerkerContent as HandwerkerContentItem[]).map((c) => ({
      url: `${BASE}/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),

    // Legal — niedrige Priorität
    {
      url: `${BASE}/impressum`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.1,
    },
    {
      url: `${BASE}/datenschutz`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.1,
    },
    {
      url: `${BASE}/agb`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.1,
    },
  ];
}
