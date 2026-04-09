const path = require('path');
const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@amline/ui-core'],
  experimental: {
    externalDir: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  /**
   * When Next.js compiles admin-ui code via externalDir, webpack resolves
   * node_modules from the importing file under admin-ui/. Docker only runs
   * npm install in amline-ui/, so prepend amline-ui/node_modules (must stay
   * merged with the wizard replacement plugin — duplicate `webpack` keys drop
   * the first hook entirely).
   */
  webpack(config) {
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      ...config.resolve.modules,
    ];
    if (process.env.NEXT_PUBLIC_EMBED_ADMIN_WIZARD === '0') {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /contracts[\\/]wizard[\\/]WizardEmbed\.tsx$/,
          path.join(__dirname, 'app/contracts/wizard/WizardStub.tsx')
        )
      );
    }
    return config;
  },
  async rewrites() {
    // In Docker/production, backend is reachable at http://backend:8000
    // In local dev, use NEXT_PUBLIC_DEV_PROXY_TARGET or NEXT_PUBLIC_API_BASE_URL
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_DEV_PROXY_TARGET ||
      'http://backend:8000'
    return [
      { source: '/api/v1/:path*', destination: `${base}/api/v1/:path*` },
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
