import { test, expect } from '@playwright/test';
import { gotoAmline, ensureSidebarOpen, navigateViaSidebarOptional } from './e2e-helpers';
import { clearAmlineBrowserStorage } from './storage-helpers';

/**
 * استیجینگ: ورود با 09120000999 / 11111 (هم‌تراز AuthProvider) و گشت همهٔ مسیرهای اصلی.
 * API واقعی ممکن است 401 بدهد؛ این تست فقط کرش نکردن صفحه و دسترسی با permission * را می‌سنجد.
 */
async function stagingTestLogin(page: import('@playwright/test').Page) {
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
}

test.describe('استیجینگ: پوشش مسیرهای اصلی', () => {
  test('گشت مسیرها بدون کرش (کاربر تست)', async ({ page }) => {
    await stagingTestLogin(page);

    const paths = [
      '/dashboard',
      '/contracts',
      '/contracts/legal-queue',
      '/contracts/wizard',
      '/contracts/pr-contracts',
      '/crm',
      '/users',
      '/ads',
      '/wallets',
      '/payments',
      '/billing',
      '/settings',
      '/integrations',
      '/admin/roles',
      '/admin/audit',
      '/admin/activity',
      '/notifications',
    ] as const;

    for (const p of paths) {
      if (p === '/dashboard') {
        await expect(page).toHaveURL(/\/dashboard(?:[?#]|$)/);
      } else {
        const visited = await navigateViaSidebarOptional(page, p);
        if (!visited) {
          test.info().annotations.push({
            type: 'skipped-route',
            description: `بدون لینک سایدبار (احتمالاً مجوز): ${p}`,
          });
          continue;
        }
      }
      await expect(page.locator('body')).not.toBeEmpty();
      await page.waitForTimeout(300);
    }
  });
});
