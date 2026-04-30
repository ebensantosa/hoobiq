/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@hoobiq/ui"],
  // Standalone output → smaller deploy artifact. The .next/standalone folder
  // contains a self-contained server.js + only the deps it needs. We use this
  // on the VPS so we don't have to ship node_modules.
  output: "standalone",
  // Keep Sentry's OpenTelemetry/Prisma instrumentation out of the webpack
  // bundle — they use dynamic require() which webpack can't statically
  // analyze, producing a "Critical dependency: the request of a dependency
  // is an expression" warning. Resolving them via Node at runtime sidesteps
  // that and matches Sentry's official guidance for Next 15.
  serverExternalPackages: [
    "@sentry/node",
    "@sentry/nextjs",
    "@prisma/instrumentation",
    "@opentelemetry/instrumentation",
  ],
  images: {
    remotePatterns: [
      // Cloudflare R2 CDN (production)
      { protocol: "https", hostname: "cdn.hoobiq.com" },
      // R2 default subdomain (fallback if custom domain not set)
      { protocol: "https", hostname: "*.r2.dev" },
      // Production API host — uploads served by Nest static middleware
      { protocol: "https", hostname: "api.hoobiq.com" },
      // Local API (dev) — uploaded files served from apps/api/public/uploads/
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      // Dummy/seed images during development
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
