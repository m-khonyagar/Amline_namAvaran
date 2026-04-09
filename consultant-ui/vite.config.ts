import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // هم‌تراز admin-ui / ENV_MATRIX: لوکال بدون env → mock روی 8080
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8080';
  const bypassHtmlRequest = (req: { headers?: Record<string, string | undefined>; url?: string }) => {
    const accept = req.headers?.accept ?? '';
    if (accept.includes('text/html')) return req.url;
    return undefined;
  };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // 3003 reserved for seo-dashboard; run consultant locally on 3004
      port: 3004,
      strictPort: true,
      host: true,
      fs: {
        allow: [path.resolve(__dirname, '..')],
      },
      proxy: {
        '/consultant': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          bypass: bypassHtmlRequest,
        },
      },
    },
  };
});
