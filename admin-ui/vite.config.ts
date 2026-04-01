import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget =
    env.VITE_DEV_PROXY_TARGET ||
    'https://api.amline.ir'

  const bypassHtmlRequest = (req: { headers?: Record<string, string | undefined>; url?: string }) => {
    const accept = req.headers?.accept ?? ''
    if (accept.includes('text/html')) return req.url
    return undefined
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3002,
      proxy: {
        '/contracts': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          bypass: bypassHtmlRequest,
        },
        '/admin': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          bypass: bypassHtmlRequest,
        },
        '/users': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          bypass: bypassHtmlRequest,
        },
        '/files': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          bypass: bypassHtmlRequest,
        },
        '/financials': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          bypass: bypassHtmlRequest,
        },
        '/provinces': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          bypass: bypassHtmlRequest,
        },
        '/auth': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          bypass: bypassHtmlRequest,
        },
      },
    },
  }
})
