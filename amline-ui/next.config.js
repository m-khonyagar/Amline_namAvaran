const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../admin-ui/src'),
      '@amline/ui-core': path.resolve(__dirname, '../packages/amline-ui-core/src'),
    }
    return config
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const base =
      process.env.NEXT_PUBLIC_DEV_PROXY_TARGET ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'http://localhost:8080'
    return [
      { source: '/api/v1/:path*', destination: `${base}/api/v1/:path*` },
      { source: '/api/:path*', destination: `${base}/:path*` },
      { source: '/contracts/:path*', destination: `${base}/contracts/:path*` },
      { source: '/files/:path*', destination: `${base}/files/:path*` },
      { source: '/auth/:path*', destination: `${base}/auth/:path*` },
      { source: '/admin/:path*', destination: `${base}/admin/:path*` },
      { source: '/financials/:path*', destination: `${base}/financials/:path*` },
      { source: '/listings/:path*', destination: `${base}/listings/:path*` },
    ]
  },
}

module.exports = nextConfig
