import type { MetadataRoute } from "next";

import { publicSiteOrigin } from "@/lib/staging";

export default function robots(): MetadataRoute.Robots {
  const origin = publicSiteOrigin();
  if (origin.includes("staging--")) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
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
