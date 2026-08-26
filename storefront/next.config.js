const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

// R2 public URL for product images, e.g. https://assets.example.com
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      // Cloudflare R2 public bucket (production asset CDN)
      ...(R2_PUBLIC_URL
        ? [
            {
              protocol: "https",
              hostname: new URL(R2_PUBLIC_URL).hostname,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
