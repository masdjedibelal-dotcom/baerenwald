/** @type {import('next').NextConfig} */
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
    return [
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
    return config;
  },
};

export default nextConfig;
