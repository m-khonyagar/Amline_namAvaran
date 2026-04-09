import { test, expect, type Page } from '@playwright/test';

/** همان کوکی که devLogin در مرورگر می‌گذارد (پایدار در CI بدون اتکا به NEXT_PUBLIC). */
async function seedDevSessionCookie(page: Page, baseURL: string | undefined) {
  const root = new URL(baseURL ?? 'http://127.0.0.1:3000');
  const cookieUrl = `${root.origin}/`;
  await page.context().addCookies([
    {
      name: 'access_token',
      value: 'dev-token-12345',
      url: cookieUrl,
      sameSite: 'Lax',
    },
  ]);
}

test.describe('کاربر نهایی — قرارداد (mock API)', () => {
  test('ورود آزمایشی یا کوکی dev و نمایش قراردادهای من', async ({
    page,
    baseURL,
  }) => {
    await page.goto('/login');
    const devBtn = page.getByTestId('e2e-dev-login');
    const hasDev = await devBtn.isVisible().catch(() => false);
    if (hasDev) {
      await devBtn.scrollIntoViewIfNeeded();
      await devBtn.click({ force: true });
      await page.waitForURL(/\/contracts/, { timeout: 20_000 });
    } else {
      await seedDevSessionCookie(page, baseURL);
      await page.goto('/contracts');
    }

    await expect(
      page.getByRole('heading', { name: 'قراردادهای من' }),
    ).toBeVisible({ timeout: 25_000 });
  });

  test('ویزارد: رهن و اجاره تا مرحله مالک', async ({ page, baseURL }) => {
    test.skip(!!process.env.CI, 'dynamic import ویزارد از admin-ui در GA نیاز به پیکربندی جدا دارد');

    await page.goto('/login');
    await seedDevSessionCookie(page, baseURL);
    await page.goto('/contracts/wizard');
    await expect(page.getByText('رهن و اجاره')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('خرید و فروش')).toBeVisible();

    await page
      .getByRole('button', { name: /شروع قرارداد \(ثبت در سرور\)/ })
      .scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: /شروع قرارداد \(ثبت در سرور\)/ }).click({ force: true });
    await expect(page.getByRole('heading', { name: /اطلاعات مالک/ })).toBeVisible({ timeout: 25_000 });
    // LandlordStep از WfLabeledRadio (label) استفاده می‌کند، نه button
    await expect(page.getByText('شخص حقیقی هستم')).toBeVisible();
  });
});
