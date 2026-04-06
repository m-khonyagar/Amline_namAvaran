const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    externalDir: true,
  },
  /**
   * When Next.js compiles admin-ui code via externalDir relative imports,
   * webpack resolves node_modules relative to the source file's location in
   * admin-ui/.  In CI only amline-ui/node_modules is installed (npm ci runs
   * only in amline-ui/).  Adding the amline-ui node_modules directory as an
   * absolute fallback lets webpack find shared packages (axios, clsx, …).
   */
  webpack(config) {
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      ...config.resolve.modules,
    ];
    return config;
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
