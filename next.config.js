const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE || undefined,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../'),
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
      { protocol: 'https', hostname: 'api.qrserver.com' },
    ],
    unoptimized: false,
  },
  async headers() {
    return [
      {
        // Do not cache JS/CSS chunks — prevents ChunkLoadError after deploys
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
