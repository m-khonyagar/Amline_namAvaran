import { test, expect } from '@playwright/test';
import { gotoAmline, ensureSidebarOpen, navigateViaSidebar } from './e2e-helpers';
import { clearAmlineBrowserStorage } from './storage-helpers';

test.describe('استیجینگ admin.staging', () => {
  test('ورود 09120000999 + 11111 و گشت در چند صفحه', async ({ page }) => {
    await gotoAmline(page, '/login');
    await clearAmlineBrowserStorage(page);

    await expect(page.getByRole('button', { name: /ارسال کد تأیید/i })).toBeVisible({
      timeout: 45_000,
    });

    await page.getByLabel('شماره موبایل').fill('09120000999');
    await page.getByRole('button', { name: /ارسال کد تأیید/i }).click();

    await expect(page.getByRole('button', { name: /^ورود$/ })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByLabel('کد تأیید').fill('11111');
    await page.getByRole('button', { name: /^ورود$/ }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

    await ensureSidebarOpen(page);

    await navigateViaSidebar(page, '/contracts');
    await navigateViaSidebar(page, '/crm');
  });
});
