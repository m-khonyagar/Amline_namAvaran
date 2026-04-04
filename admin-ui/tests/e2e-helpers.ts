import type { Page } from '@playwright/test';

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
