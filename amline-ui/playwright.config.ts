import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const mockDir = path.join(process.cwd(), '..', 'dev-mock-api');
const host = '127.0.0.1';
const port = 3000;
const baseURL = `http://${host}:${port}`;

// اگر `npx playwright install` به CDN دسترسی ندارد، `PW_USE_BUNDLED_CHROMIUM` را خالی بگذارید تا از کانال `chrome` سیستم استفاده شود (در CI معمولاً `PW_USE_BUNDLED_CHROMIUM=1`).

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    locale: 'fa-IR',
  },
  webServer: [
    {
      command: 'python -m uvicorn main:app --host 127.0.0.1 --port 8080',
      cwd: mockDir,
      url: 'http://127.0.0.1:8080/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `npm run dev -- --hostname ${host} --port ${port}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'development',
        NEXT_PUBLIC_DEV_PROXY_TARGET: 'http://127.0.0.1:8080',
        NEXT_PUBLIC_ENABLE_DEV_BYPASS: 'true',
        NEXT_PUBLIC_E2E_DEV_BYPASS: 'true',
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // اگر `npx playwright install` به CDN دسترسی ندارد، از Chrome نصب‌شده ویندوز استفاده می‌شود
        channel: process.env.PW_USE_BUNDLED_CHROMIUM === '1' ? undefined : 'chrome',
      },
    },
  ],
});
