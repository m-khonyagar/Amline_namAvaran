import { test, expect } from '@playwright/test';

test.describe('پنل کاربر — لیست قراردادها (mock API)', () => {
  test('ورود آزمایشی، تب‌ها و جستجو', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /ورود آزمایشی توسعه/i })).toBeVisible({ timeout: 25_000 });
    await page.getByRole('button', { name: /ورود آزمایشی توسعه/i }).click();
    await page.waitForURL(/\/contracts/, { timeout: 20_000 });

    await expect(page.getByRole('heading', { name: 'قراردادهای من' })).toBeVisible();
    await expect(page.getByRole('button', { name: /جاری/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /پیش‌نویس/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /خاتمه‌یافته/ })).toBeVisible();

    await page.getByRole('button', { name: 'جستجو' }).click();
    await expect(page.getByPlaceholder(/جستجو بر اساس عنوان/i)).toBeVisible();

    await expect(page.getByRole('link', { name: 'قرارداد جدید', exact: true })).toBeVisible();
  });
});
