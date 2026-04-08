import { expect, type Page } from '@playwright/test';

/** برچسب دکمهٔ ارسال ویزارد (متمایز از «شروع قرارداد جدید» در DraftBanner) */
export const WIZARD_SUBMIT_SERVER_LABEL = 'شروع قرارداد (ثبت در سرور)';

/** برای SPA با Vite؛ رویداد load گاهی دیر یا گیر می‌کند و با workerهای موازی تداخل دارد */
export async function gotoAmline(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
}

/** روی viewport باریک سایدبار کشویی است؛ در صورت نمایش دکمهٔ همبرگر، منو را باز می‌کند */
export async function ensureSidebarOpen(page: Page) {
  const openMenu = page.getByRole('button', { name: 'باز کردن منو' });
  if (await openMenu.isVisible().catch(() => false)) {
    await openMenu.click();
  }
}

function pathToUrlRegex(path: string): RegExp {
  return new RegExp(`${path.replace(/\//g, '\\/')}(?:[?#]|$)`);
}

/**
 * ناوبری SPA از لینک سایدبار (بدون `page.goto`) — مهم برای استیجینگ تا بعد از ورود reload نشود.
 */
export async function navigateViaSidebar(page: Page, path: string) {
  await ensureSidebarOpen(page);
  await page.waitForLoadState('domcontentloaded');
  const link = page.locator(`#app-sidebar nav a[href="${path}"]`).first();
  await link.waitFor({ state: 'visible', timeout: 25_000 });
  const urlRe = pathToUrlRegex(path);
  await Promise.all([
    page.waitForURL(urlRe, { timeout: 25_000 }),
    link.click({ force: true, timeout: 15_000 }),
  ]);
}

/** اگر لینک در منو نیست (مثلاً بدون مجوز legal:read) برمی‌گرداند false و تست را fail نمی‌کند. */
export async function navigateViaSidebarOptional(page: Page, path: string): Promise<boolean> {
  await ensureSidebarOpen(page);
  await page.waitForLoadState('domcontentloaded');
  const link = page.locator(`#app-sidebar nav a[href="${path}"]`).first();
  const visible = await link.isVisible({ timeout: 6000 }).catch(() => false);
  if (!visible) return false;
  const urlRe = pathToUrlRegex(path);
  await Promise.all([
    page.waitForURL(urlRe, { timeout: 25_000 }),
    link.click({ force: true, timeout: 15_000 }),
  ]);
  return true;
}

/**
 * ورود برای E2E: اگر «ورود آزمایشی» در DEV هست همان؛ وگرنه همان شماره/OTP تست استیجینگ (۰۹۱۲۰۰۰۰۹۹۹ / ۱۱۱۱۱).
 */
export async function devLoginFlexible(page: Page, base: string) {
  await gotoAmline(page, `${base}/login`);
  const devBtn = page.getByRole('button', { name: /ورود آزمایشی/i });
  if (await devBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
    await devBtn.click();
    await page.waitForURL(/\/dashboard/, { timeout: 25_000 });
    await ensureSidebarOpen(page);
    return;
  }
  await expect(page.getByRole('button', { name: /ارسال کد تأیید/i })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel('شماره موبایل').fill('09120000999');
  await page.getByRole('button', { name: /ارسال کد تأیید/i }).click();
  await expect(page.getByRole('button', { name: /^ورود$/ })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel('کد تأیید').fill('11111');
  await page.getByRole('button', { name: /^ورود$/ }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  await ensureSidebarOpen(page);
}
