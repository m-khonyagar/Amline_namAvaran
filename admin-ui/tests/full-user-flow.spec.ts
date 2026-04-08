import { test, expect, type Page } from '@playwright/test';
import { ensureSidebarOpen, gotoAmline, WIZARD_SUBMIT_SERVER_LABEL } from './e2e-helpers';
import { clearAmlineBrowserStorage } from './storage-helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3002';

test.beforeEach(async ({ page }) => {
  await gotoAmline(page, `${BASE}/login`);
  await clearAmlineBrowserStorage(page);
});

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: false });
}

async function devLogin(page: Page) {
  await gotoAmline(page, `${BASE}/login`);
  await expect(page.getByRole('button', { name: /ورود آزمایشی/i })).toBeVisible({ timeout: 20000 });
  await screenshot(page, '01-login-page');
  await page.getByRole('button', { name: /ورود آزمایشی/i }).click();
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
  await screenshot(page, '02-dashboard');
}

// ================================================================
// فلو ۱: ورود و داشبورد
// ================================================================
test('فلو ۱: ورود به سیستم و مشاهده داشبورد', async ({ page }) => {
  await gotoAmline(page, `${BASE}/login`);
  await expect(page.getByRole('button', { name: /ورود آزمایشی/i })).toBeVisible({ timeout: 20000 });

  // بررسی فرم login
  await expect(page.getByPlaceholder(/0912/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'ارسال کد تأیید' })).toBeVisible();
  await screenshot(page, '01-login-page');

  // ورود آزمایشی
  await page.getByRole('button', { name: /ورود آزمایشی/i }).click();
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });

  // داشبورد باید نمایش داده شود
  await expect(page.locator('body')).not.toBeEmpty();
  await screenshot(page, '02-dashboard');

  await ensureSidebarOpen(page);
  await expect(page.locator('#app-sidebar').getByRole('navigation')).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('link', { name: /داشبورد/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /قراردادها/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /CRM/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /کاربران/i }).first()).toBeVisible();
});

// ================================================================
// فلو ۲: CRM — ایجاد Lead، مشاهده Kanban، جزئیات
// ================================================================
test('فلو ۲: CRM کامل — ایجاد Lead و مدیریت', async ({ page }) => {
  await devLogin(page);

  // رفتن به CRM
  await page.getByRole('link', { name: /CRM/i }).first().click();
  await expect(page).toHaveURL(`${BASE}/crm`);
  await expect(page.getByRole('heading', { name: 'جدید' })).toBeVisible({ timeout: 10000 });
  await screenshot(page, '03-crm-kanban');

  // بررسی ستون‌های Kanban
  await expect(page.getByRole('heading', { name: 'تماس گرفته' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'در مذاکره' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'منعقد شده' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'از دست رفته' })).toBeVisible();

  // ایجاد Lead جدید
  await page.getByRole('button', { name: /\+ افزودن Lead/i }).first().click();
  await expect(page.getByPlaceholder('علی محمدی')).toBeVisible({ timeout: 5000 });
  await screenshot(page, '04-crm-lead-form');

  await page.getByPlaceholder('علی محمدی').fill('رضا احمدی');
  await page.getByPlaceholder('09121234567').fill('09351234567');
  await page.getByRole('button', { name: 'ذخیره', exact: true }).click();

  // Lead باید در ستون «جدید» نمایش داده شود
  await expect(page.getByText('رضا احمدی')).toBeVisible({ timeout: 5000 });
  await screenshot(page, '05-crm-lead-created');

  // کلیک روی Lead برای مشاهده جزئیات
  await page.getByText('رضا احمدی').click();
  await page.waitForTimeout(1000);
  await screenshot(page, '06-crm-lead-detail');
});

// ================================================================
// فلو ۳: Contract Wizard — شروع قرارداد رهن و اجاره
// ================================================================
test('فلو ۳: Contract Wizard — شروع قرارداد رهن و اجاره', async ({ page }) => {
  await devLogin(page);

  // رفتن به wizard از sidebar
  await page.getByRole('link', { name: /قرارداد جدید/i }).first().click();
  await expect(page).toHaveURL(`${BASE}/contracts/wizard`);
  await expect(page.getByRole('heading', { name: /انعقاد قرارداد جدید/ })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: /رهن و اجاره/ })).toBeVisible({
    timeout: 10000,
  });
  await screenshot(page, '07-wizard-start');

  // انتخاب رهن و اجاره
  await page.getByRole('button', { name: /رهن و اجاره/ }).click();
  await screenshot(page, '08-wizard-rent-selected');

  // انتخاب حالت کاتب (نام دسترس‌پذیر شامل توضیح زیر دکمه است)
  await page.getByRole('button', { name: /برای دیگران/ }).click();
  await screenshot(page, '09-wizard-scribe-mode');

  const wizardStartBtn = page.getByRole('button', { name: WIZARD_SUBMIT_SERVER_LABEL });
  await expect(wizardStartBtn).toBeVisible({ timeout: 15000 });

  // MSW پاسخ می‌دهد — باید به مرحله اطلاعات مالک برسیم
  await wizardStartBtn.click();
  await expect(page.getByRole('heading', { name: /اطلاعات مالک/ })).toBeVisible({ timeout: 15000 });
  // LandlordStep از WfLabeledRadio استفاده می‌کند که <label> است نه <button>
  await expect(page.getByText('شخص حقیقی هستم')).toBeVisible();
  await screenshot(page, '10-wizard-after-start');
});

// ================================================================
// فلو ۳ب: Contract Wizard — شروع قرارداد خرید و فروش
// ================================================================
test('فلو ۳ب: Contract Wizard — شروع قرارداد خرید و فروش', async ({ page }) => {
  await devLogin(page);
  await gotoAmline(page, `${BASE}/contracts/wizard`);
  await expect(page.getByText('خرید و فروش')).toBeVisible({ timeout: 10000 });
  await page.getByText('خرید و فروش').click();
  await page.getByText('برای خودم').click();
  await page.getByRole('button', { name: WIZARD_SUBMIT_SERVER_LABEL }).click();
  await expect(page.getByRole('heading', { name: /اطلاعات فروشنده/ })).toBeVisible({ timeout: 15000 });
});

// ================================================================
// فلو ۴: Contract Wizard — DraftBanner و شروع قرارداد جدید
// ================================================================
test('فلو ۴: Contract Wizard — DraftBanner و شروع قرارداد جدید', async ({ page }) => {
  await devLogin(page);
  await gotoAmline(page, `${BASE}/contracts/wizard`);
  await page.waitForTimeout(2000);
  await screenshot(page, '11-wizard-after-flow3');

  // اگه DraftBanner نمایش داده شد، دکمه «شروع قرارداد جدید» رو بزن
  const newContractBtn = page.getByRole('button', { name: /شروع قرارداد جدید/i });
  const startBtn = page.getByRole('button', { name: WIZARD_SUBMIT_SERVER_LABEL });

  const hasDraft = await newContractBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (hasDraft) {
    await newContractBtn.click();
    await page.waitForTimeout(1000);
  }

  // حالا باید StartStep نمایش داده شود
  await expect(startBtn).toBeVisible({ timeout: 10000 });
  await screenshot(page, '11-wizard-new-contract');
});

// ================================================================
// فلو ۵: لیست قراردادها
// ================================================================
test('فلو ۵: صفحه قراردادها و navigation', async ({ page }) => {
  await devLogin(page);

  await page.locator('nav a span:text-is("قراردادها")').click();
  await expect(page).toHaveURL(`${BASE}/contracts`);
  await expect(page.getByRole('button', { name: '+ قرارداد جدید' })).toBeVisible({ timeout: 10000 });
  await screenshot(page, '12-contracts-list');

  // دکمهٔ اصلی لیست: «+ قرارداد جدید» (جدا از «شروع قرارداد جدید» در بنر)
  await page.getByRole('button', { name: '+ قرارداد جدید' }).click();
  await expect(page).toHaveURL(`${BASE}/contracts/wizard`);
  await screenshot(page, '13-contracts-to-wizard');
});

// ================================================================
// فلو ۶: صفحه کاربران
// ================================================================
test('فلو ۶: صفحه کاربران', async ({ page }) => {
  await devLogin(page);

  await page.getByRole('link', { name: /کاربران/i }).first().click();
  await expect(page).toHaveURL(`${BASE}/users`);
  await page.waitForTimeout(2000);
  await screenshot(page, '14-users-page');
  await expect(page.locator('body')).not.toBeEmpty();
});

// ================================================================
// فلو ۷: Navigation کامل sidebar
// ================================================================
test('فلو ۷: Navigation کامل بین تمام صفحات', async ({ page }) => {
  await devLogin(page);

  const routes = [
    { label: 'داشبورد', url: '/dashboard', name: 'dashboard' },
    { label: 'قراردادها', url: '/contracts', name: 'contracts' },
    { label: 'CRM', url: '/crm', name: 'crm' },
    { label: 'کاربران', url: '/users', name: 'users' },
  ];

  for (const route of routes) {
    // کلیک روی span داخل NavLink که فقط label هست
    await page.locator(`nav a span:text-is("${route.label}")`).click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(`${BASE}${route.url}`);
    await screenshot(page, `15-nav-${route.name}`);
  }
});

// ================================================================
// فلو ۸: خروج از سیستم
// ================================================================
test('فلو ۸: خروج از سیستم', async ({ page }) => {
  await devLogin(page);

  // کلیک روی دکمه خروج
  await page.getByRole('button', { name: /خروج/i }).click();
  await page.waitForURL(`${BASE}/login`, { timeout: 10000 });
  await screenshot(page, '16-after-logout');

  // باید به صفحه login برگردد
  await expect(page.getByPlaceholder(/0912/)).toBeVisible();
});
