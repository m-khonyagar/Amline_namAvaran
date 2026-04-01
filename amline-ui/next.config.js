/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    externalDir: true,
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
      { source: '/api/:path*', destination: `${base}/:path*` },
      { source: '/contracts/:path*', destination: `${base}/contracts/:path*` },
      { source: '/files/:path*', destination: `${base}/files/:path*` },
      { source: '/auth/:path*', destination: `${base}/auth/:path*` },
      { source: '/admin/:path*', destination: `${base}/admin/:path*` },
      { source: '/financials/:path*', destination: `${base}/financials/:path*` },
    ]
  },
}

module.exports = nextConfig
