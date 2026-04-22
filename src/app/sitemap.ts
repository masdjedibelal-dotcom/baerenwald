import type { MetadataRoute } from "next";
import { LEISTUNGEN, RATGEBER, leistungHref, ratgeberHref } from "@/lib/routes";

const BASE = "https://baerenwaldmuenchen.de";

export default function sitemap(): MetadataRoute.Sitemap {
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
