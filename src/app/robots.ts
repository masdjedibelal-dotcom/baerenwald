import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
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
    sitemap: "https://baerenwaldmuenchen.de/sitemap.xml",
  };
}
