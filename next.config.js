const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE || undefined,
  experimental: {
    outputFileTracingRoot: path.join(__dirname),
    serverComponentsExternalPackages: ['pdf-parse'],
    instrumentationHook: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'clinic.vps.brunophysicalrehabilitation.co.uk' },
      { protocol: 'https', hostname: 'bpr.rehab' },
      { protocol: 'https', hostname: 'bpr.clinic' },
      { protocol: 'https', hostname: 'media.bpr.clinic' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
    ],
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
  },
  compress: true,
  swcMinify: true,
  async headers() {
    return [
      {
        // Chunk filenames are content-hashed, so a deploy produces new names
        // and never overwrites an old file — caching them forever is safe by
        // construction. `max-age=0` used to be here to avoid ChunkLoadError
        // after deploys, but it cost every visitor a revalidation per chunk
        // (22 of 24 on a real mobile load) and did not actually prevent the
        // error: that happens when the browser asks for a chunk from a build
        // the origin no longer has. A long edge cache makes it *less* likely,
        // since Cloudflare keeps serving the old file. Deploys with a tab open
        // are handled by VersionChecker, which reloads at a safe moment.
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Lead-magnet PDF downloads (e.g. Beyond Pain Chapter One) — not
        // linked from any indexed page, keep them out of search results.
        source: '/downloads/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
