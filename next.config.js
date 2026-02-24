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
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'clinic.vps.brunophysicalrehabilitation.co.uk',
      },
      {
        protocol: 'https',
        hostname: 'bpr.rehab',
      },
      {
        protocol: 'https',
        hostname: 'bpr.rehab',
      },
    ],
    unoptimized: false,
  },
};

module.exports = nextConfig;
