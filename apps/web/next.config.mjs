/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@hoobiq/ui"],
  // Standalone output → smaller deploy artifact. The .next/standalone folder
  // contains a self-contained server.js + only the deps it needs. We use this
  // on the VPS so we don't have to ship node_modules.
  output: "standalone",
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
