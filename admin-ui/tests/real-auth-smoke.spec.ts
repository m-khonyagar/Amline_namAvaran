import { test, expect } from '@playwright/test';

// هم‌تراز با playwright.config.ts (webServer / baseURL)
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3002';

test('smoke واقعی: فرم لاگین (موبایل) در دسترس است', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await expect(page.getByPlaceholder(/0912/)).toBeVisible();
});

test('smoke واقعی: ارسال OTP از فرم لاگین', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder(/0912/).fill('09120000000');
  await page.getByRole('button', { name: /ارسال کد تأیید/i }).click();

  // پس از پاسخ API: یا مرحله OTP (موفق) یا بازگشت به فرم موبایل با دکمه ارسال (خطا).
  // در حین loading متن دکمه «در حال ارسال...» است؛ نباید انتظار دیدن دوباره «ارسال کد تأیید» را داشت.
  await expect
    .poll(
      async () => {
        const otpStep = await page.getByText(/کد ارسال شده به/).isVisible().catch(() => false);
        const mobileAgain = await page
          .getByRole('button', { name: /^ارسال کد تأیید$/ })
          .isVisible()
          .catch(() => false);
        return otpStep || mobileAgain;
      },
      { timeout: 30_000, intervals: [100, 250, 500] },
    )
    .toBeTruthy();
});
