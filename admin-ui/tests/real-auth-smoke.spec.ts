import { test, expect } from '@playwright/test';
import { gotoAmline } from './e2e-helpers';

// هم‌تراز با playwright.config.ts (webServer / baseURL)
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3002';

/**
 * در حالت پیش‌فرض CI/MSW، فرانت با ورود آزمایشی و mock کار می‌کند؛ این تست‌ها به API واقعی OTP نیاز دارند.
 * اجرا: REAL_AUTH_E2E=1 npm run test:e2e -- tests/real-auth-smoke.spec.ts
 */
test.describe('real auth smoke', () => {
  test.beforeEach(() => {
    test.skip(
      process.env.REAL_AUTH_E2E !== '1',
      'برای اجرا متغیر محیطی REAL_AUTH_E2E=1 را تنظیم کنید (API واقعی؛ با MSW سازگار نیست)',
    );
  });

  test('smoke واقعی: فرم لاگین (موبایل) در دسترس است', async ({ page }) => {
    await gotoAmline(page, `${BASE}/login`);
    await expect(page.getByPlaceholder(/0912/)).toBeVisible();
  });

  test('smoke واقعی: ارسال OTP از فرم لاگین', async ({ page }) => {
    await gotoAmline(page, `${BASE}/login`);
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
});
