import { test, expect, type Page } from '@playwright/test';
import { gotoAmline, WIZARD_SUBMIT_SERVER_LABEL } from './e2e-helpers';
import { clearAmlineBrowserStorage } from './storage-helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3002';

test.beforeEach(async ({ page }) => {
  await gotoAmline(page, `${BASE}/login`);
  await clearAmlineBrowserStorage(page);
});

// ---- Helper: ورود آزمایشی ----
async function devLogin(page: Page) {
  await gotoAmline(page, `${BASE}/login`);
  // صبر برای نمایش دکمه ورود آزمایشی
  const devBtn = page.getByRole('button', { name: /ورود آزمایشی/i });
  await expect(devBtn).toBeVisible({ timeout: 20000 });
  await devBtn.click();
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}

// ================================================================
// ۱. صفحه Login
// ================================================================
test('صفحه login نمایش داده می‌شود', async ({ page }) => {
  await gotoAmline(page, `${BASE}/login`);
  await expect(page.getByRole('button', { name: /ورود آزمایشی/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByPlaceholder(/0912/)).toBeVisible();
});

// ================================================================
// ۲. ورود آزمایشی و داشبورد
// ================================================================
test('ورود آزمایشی و نمایش داشبورد', async ({ page }) => {
  await devLogin(page);
  await expect(page).toHaveURL(`${BASE}/dashboard`);
  // داشبورد باید محتوا داشته باشد
  await expect(page.locator('body')).not.toBeEmpty();
});

// ================================================================
// ۳. CRM — KanbanBoard
// ================================================================
test('CRM: صفحه KanbanBoard نمایش داده می‌شود', async ({ page }) => {
  await devLogin(page);
  await gotoAmline(page, `${BASE}/crm`);
  // heading ستون «جدید» در Kanban
  await expect(page.getByRole('heading', { name: 'جدید' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'تماس گرفته' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'در مذاکره' })).toBeVisible();
});

// ================================================================
// ۴. CRM — افزودن Lead جدید
// ================================================================
test('CRM: افزودن Lead جدید', async ({ page }) => {
  await devLogin(page);
  await page.goto(`${BASE}/crm`);
  await page.getByRole('heading', { name: 'تابلوی Kanban' }).scrollIntoViewIfNeeded();
  // ستون NEW همیشه دکمهٔ «+ افزودن Lead» دارد (پایدارتر از عنوان h3 در viewport)
  await expect(page.getByRole('button', { name: /\+ افزودن Lead/i }).first()).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: /\+ افزودن Lead/i }).first().click();

  // modal باید باز بشه — فرم نمایش داده بشه
  await expect(page.getByPlaceholder('علی محمدی')).toBeVisible({ timeout: 5000 });
  await page.getByPlaceholder('علی محمدی').fill('علی محمدی');
  await page.getByPlaceholder('09121234567').fill('09121234567');

  // کلیک روی دکمه ذخیره داخل modal
  await page.getByRole('button', { name: 'ذخیره', exact: true }).click();
  await expect(page.getByText('علی محمدی')).toBeVisible({ timeout: 5000 });
});

// ================================================================
// ۵. Contract Wizard — StartStep
// ================================================================
test('Contract Wizard: صفحه شروع نمایش داده می‌شود', async ({ page }) => {
  await devLogin(page);
  await gotoAmline(page, `${BASE}/contracts/wizard`);
  await expect(page.getByRole('heading', { name: /انعقاد قرارداد جدید/ })).toBeVisible({ timeout: 20000 });
  const rentBtn = page.getByRole('button', { name: /رهن و اجاره/ });
  await expect(rentBtn).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /خرید و فروش/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /برای خودم/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /برای دیگران/ })).toBeVisible();
});

// ================================================================
// ۶. Contract Wizard — انتخاب نوع قرارداد
// ================================================================
test('Contract Wizard: انتخاب رهن و اجاره', async ({ page }) => {
  await devLogin(page);
  await gotoAmline(page, `${BASE}/contracts/wizard`);
  await expect(page.getByRole('heading', { name: /انعقاد قرارداد جدید/ })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: /رهن و اجاره/ })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('button', { name: /رهن و اجاره/ }).click();
  await page.getByRole('button', { name: /برای دیگران/ }).click();
  const startBtn = page.getByRole('button', { name: WIZARD_SUBMIT_SERVER_LABEL });
  await expect(startBtn).toBeVisible({ timeout: 15000 });
});

// ================================================================
// ۷. صفحه قراردادها
// ================================================================
test('صفحه قراردادها نمایش داده می‌شود', async ({ page }) => {
  await devLogin(page);
  await gotoAmline(page, `${BASE}/contracts`);
  await expect(page.getByRole('button', { name: /قرارداد جدید/i })).toBeVisible({ timeout: 15000 });
});

// ================================================================
// ۸. صفحه کاربران
// ================================================================
test('صفحه کاربران نمایش داده می‌شود', async ({ page }) => {
  await devLogin(page);
  await gotoAmline(page, `${BASE}/users`);
  // صفحه باید load بشه
  await page.waitForTimeout(3000);
  await expect(page.locator('body')).not.toBeEmpty();
});

// ================================================================
// ۹. Navigation
// ================================================================
test('داشبورد: navigation بین صفحات', async ({ page }) => {
  await devLogin(page);
  await gotoAmline(page, `${BASE}/crm`);
  await expect(page).toHaveURL(`${BASE}/crm`);
  await gotoAmline(page, `${BASE}/dashboard`);
  await expect(page).toHaveURL(`${BASE}/dashboard`);
});

// ================================================================
// ۱۰. تم — Light / Dark / ماندگاری
// ================================================================
test('تم: انتخاب تیره و ماندگاری در localStorage', async ({ page }) => {
  await devLogin(page);
  const darkBtn = page.locator('#app-sidebar [aria-label="انتخاب تم"] [aria-label="تیره"]');
  await expect(darkBtn).toBeVisible({ timeout: 15000 });
  await darkBtn.click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  const stored = await page.evaluate(() => localStorage.getItem('amline_theme'));
  expect(stored).toBe('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
