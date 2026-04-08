import { defineConfig } from '@playwright/test';

const devServerHost = '127.0.0.1';
const devServerPort = 3002;
const baseURL = `http://${devServerHost}:${devServerPort}`;

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/staging*.spec.ts'],
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  workers: 1,
  use: {
    baseURL,
    headless: true,
    screenshot: 'on',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // بالای breakpoint lg تا سایدبار دسکتاپ (lg:static / lg:translate-x-0) پایدار باشد
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    // متغیرهای محیطی فرایند فرزند از `.env.local` در Vite بالاترند؛ برای E2E حتماً MSW/بای‌پس را اینجا ثابت کن.
    command: `npm run dev:e2e -- --host ${devServerHost} --port ${devServerPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      VITE_USE_MSW: 'true',
      VITE_ENABLE_DEV_BYPASS: 'true',
      VITE_API_URL: '',
      VITE_USE_CRM_API: 'true',
      VITE_DEV_PROXY_TARGET: process.env.VITE_DEV_PROXY_TARGET ?? 'https://api.amline.ir',
    },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
