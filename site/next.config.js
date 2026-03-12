/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for hosting anywhere
  output: 'export',
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  // trailingSlash for static hosting
  trailingSlash: true,
  // Disable SSR - this is a static site
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
