import { test, expect } from '@playwright/test';

test.describe('کاربر نهایی — ویزارد قرارداد (mock API)', () => {
  test('ورود آزمایشی و شروع قرارداد رهن و اجاره تا مرحله مالک', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /ورود آزمایشی توسعه/i })).toBeVisible({
      timeout: 25_000,
    });
    await page.getByRole('button', { name: /ورود آزمایشی توسعه/i }).click();
    await page.waitForURL(/\/contracts/, { timeout: 20_000 });

    await page.goto('/contracts/wizard');
    await expect(page.getByText('رهن و اجاره')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('خرید و فروش')).toBeVisible();

    await page.getByRole('button', { name: 'شروع قرارداد', exact: true }).click();
    await expect(page.getByRole('heading', { name: /اطلاعات مالک/ })).toBeVisible({ timeout: 25_000 });
    // LandlordStep از WfLabeledRadio (label) استفاده می‌کند، نه button
    await expect(page.getByText('شخص حقیقی هستم')).toBeVisible();
  });
});
