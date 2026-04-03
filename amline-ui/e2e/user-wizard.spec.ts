import { test, expect } from '@playwright/test';

test.describe('کاربر نهایی — ویزارد قرارداد (mock API)', () => {
  test('ورود آزمایشی و شروع قرارداد رهن و اجاره تا مرحله مالک', async ({ page }) => {
    await page.goto('/login');
    const devBtn = page.getByTestId('e2e-dev-login');
    await expect(devBtn).toBeVisible({ timeout: 25_000 });
    await devBtn.click();
    await page.waitForURL(/\/contracts/, { timeout: 20_000 });

    await page.goto('/contracts/wizard');
    await expect(page.getByText('رهن و اجاره')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('خرید و فروش')).toBeVisible();

    await page.getByRole('button', { name: 'شروع قرارداد', exact: true }).click();
    await expect(page.getByRole('heading', { name: /اطلاعات مالک/ })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('button', { name: 'شخص حقیقی' })).toBeVisible();
  });
});
