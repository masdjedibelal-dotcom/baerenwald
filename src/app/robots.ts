import type { MetadataRoute } from "next";

import { publicSiteOrigin } from "@/lib/staging";
import { MARKE } from "@/lib/marke";

export default function robots(): MetadataRoute.Robots {
  const origin = publicSiteOrigin();
  if (origin.includes("staging--")) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }
  // Servus TEO: Startseite indexierbar, Portal/Rechner/API nicht
  if (!MARKE.marketingSeite) {
    return {
      rules: [{ userAgent: "*", allow: "/", disallow: ["/portal", "/partner", "/rechner", "/api/", "/melden"] }],
      sitemap: `${origin}/sitemap.xml`,
    };
  }
  return {
    rules: [
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/rechner", "/rechner/", "/api/"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
