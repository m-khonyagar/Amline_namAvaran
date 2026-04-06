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
    // In Docker/production, backend is reachable at http://backend:8000
    // In local dev, use NEXT_PUBLIC_DEV_PROXY_TARGET or NEXT_PUBLIC_API_BASE_URL
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_DEV_PROXY_TARGET ||
      'http://backend:8000'
    return [
      { source: '/api/:path*', destination: `${base}/:path*` },
      { source: '/contracts/:path*', destination: `${base}/contracts/:path*` },
      { source: '/files/:path*', destination: `${base}/files/:path*` },
      { source: '/auth/:path*', destination: `${base}/auth/:path*` },
      { source: '/admin/:path*', destination: `${base}/admin/:path*` },
      { source: '/financials/:path*', destination: `${base}/financials/:path*` },
      { source: '/consultant/:path*', destination: `${base}/consultant/:path*` },
      { source: '/requirements/:path*', destination: `${base}/requirements/:path*` },
      { source: '/market/:path*', destination: `${base}/market/:path*` },
    ]
  },
}

module.exports = nextConfig
