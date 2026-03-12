/** @type {import('next').NextConfig} */
// agent.amline.ir: روت دامنه. admin.amline.ir/seo: basePath '/seo'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  basePath: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
}

module.exports = nextConfig
