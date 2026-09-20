/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
];

const nextConfig = {
  eslint: {
    // P7-5: ESLint während Build aktiv
    ignoreDuringBuilds: false,
  },
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/canvas", "web-push"],
    /** Kamera-Fotos (bis 6 MB) + PDFs müssen in Server Actions ankommen. Default ist 1 MB. */
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  transpilePackages: ["pdfjs-dist"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
      {
        source: "/manifest-partner.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
    ];
  },
  async redirects() {
    const isStaging =
      process.env.CONTEXT === "deploy-preview" ||
      process.env.CONTEXT === "branch-deploy" ||
      (process.env.URL || "").includes("staging--") ||
      (process.env.DEPLOY_PRIME_URL || "").includes("staging--");
    const crmBase = (
      process.env.NEXT_PUBLIC_DASHBOARD_URL ||
      process.env.CRM_DASHBOARD_URL ||
      process.env.NEXT_PUBLIC_CRM_URL ||
      (isStaging
        ? "https://staging--baerenwald-backend.netlify.app"
        : "https://crm.baerenwaldmuenchen.de")
    ).replace(/\/$/, "");
    return [
      {
        source: "/gpt",
        destination: "/rechner",
        permanent: false,
      },
      {
        source: "/gpt/",
        destination: "/rechner",
        permanent: false,
      },
      {
        source: "/galerie",
        destination: "/leistungen",
        permanent: true,
      },
      {
        source: "/galerie/",
        destination: "/leistungen",
        permanent: true,
      },
      // Projekt-/Nachtrag-Token leben nur auf der CRM-Domain (kein Marketing-404)
      {
        source: "/projekt/:token*",
        destination: `${crmBase}/projekt/:token*`,
        permanent: false,
      },
      {
        source: "/nachtrag/:token*",
        destination: `${crmBase}/nachtrag/:token*`,
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://eu-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  /** Weniger native File-Watcher — hilft auf macOS bei „EMFILE: too many open files”. */
  webpack: (config, { dev, isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals ?? []), "@napi-rs/canvas"];
    }
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1500,
        aggregateTimeout: 300,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/dist/**",
          "**/.turbo/**",
        ],
      };
    }
    // Explizites @-Alias (tsconfig paths allein waren unzuverlässig)
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.join(__dirname, "src"),
    };
    return config;
  },
};

export default nextConfig;
