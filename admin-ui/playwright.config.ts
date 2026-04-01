import { defineConfig } from '@playwright/test';

const devServerHost = '127.0.0.1';
const devServerPort = 3002;
const baseURL = `http://${devServerHost}:${devServerPort}`;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL,
    headless: true,
    screenshot: 'on',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: `npm run dev -- --host ${devServerHost} --port ${devServerPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      // بدون .env.local در CI: MSW + ورود آزمایشی برای تست‌های e2e/full-user-flow
      VITE_USE_MSW: process.env.VITE_USE_MSW ?? 'true',
      VITE_ENABLE_DEV_BYPASS: process.env.VITE_ENABLE_DEV_BYPASS ?? 'true',
      // اگر .env.local لوکال به پورت خالی اشاره کند، Playwright همچنان پایدار بماند
      VITE_DEV_PROXY_TARGET: process.env.VITE_DEV_PROXY_TARGET ?? 'https://api.amline.ir',
    },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
