/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Weniger native File-Watcher — hilft auf macOS bei „EMFILE: too many open files“. */
  webpack: (config, { dev }) => {
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
