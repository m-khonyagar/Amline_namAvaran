import { defineConfig } from '@playwright/test';

/** فقط `PLAYWRIGHT_STAGING_URL` — از `PLAYWRIGHT_BASE_URL` استفاده نکن تا با E2E لوکال قاطی نشود. */
const baseURL =
  process.env.PLAYWRIGHT_STAGING_URL || 'https://admin.staging.amline.ir';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  workers: 1,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    launchOptions: {
      args: ['--ignore-certificate-errors'],
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
