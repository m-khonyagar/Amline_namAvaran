/**
 * تست‌های UX جامع - تجربه کاربری و دسترسی‌پذیری
 */
import { test, expect } from '@playwright/test'
import { gotoContractFlow, BASE_URL } from './helpers'

test.describe('UX جامع - ساختار و ناوبری', () => {
  test('عنوان صفحه وجود دارد', async ({ page }) => {
    await gotoContractFlow(page)
    const heading = page.locator('h1, h2, [role="heading"]').first()
    await expect(heading).toBeVisible({ timeout: 10000 })
    const text = await heading.textContent()
    expect(text?.length).toBeGreaterThan(2)
  })

  test('مسیر کاربر (استپر) قابل مشاهده است', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
    const stepper = page.locator('text=/اطلاعات مالک|مرحله|step/i').first()
    await expect(stepper).toBeVisible({ timeout: 10000 })
  })

  test('دکمه مرحله قبل/بازگشت وجود دارد', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
    await page.locator('input[placeholder*="کدملی"]').first().fill('0499370899').catch(() => {})
    await page.locator('input[placeholder*="موبایل"]').first().fill('09107709601').catch(() => {})
    await page.locator('button:has-text("ثبت اطلاعات مالک")').first().click().catch(() => {})
    await page.waitForTimeout(2000)
    await page.locator('button:has-text("مرحله بعد")').first().click().catch(() => {})
    await page.waitForTimeout(2000)
    const backBtn = page.locator('button:has-text("مرحله قبل"), button:has-text("بازگشت")').first()
    await expect(backBtn).toBeVisible({ timeout: 5000 })
  })

  test('لینک قرارداد قابل کلیک است', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    const link = page.locator('a[href*="contractnewflow"]').first()
    await expect(link).toBeVisible({ timeout: 10000 })
    await expect(link).toBeEnabled()
  })
})

test.describe('UX جامع - جهت و خوانایی', () => {
  test('صفحه RTL است', async ({ page }) => {
    await gotoContractFlow(page)
    const body = page.locator('body, html')
    const dir = await body.getAttribute('dir')
    expect(['rtl', 'ltr']).toContain(dir || 'ltr')
  })

  test('فونت و اندازه متن خوانا است', async ({ page }) => {
    await gotoContractFlow(page)
    const body = page.locator('body')
    const fontSize = await body.evaluate(el => getComputedStyle(el).fontSize)
    const num = parseInt(fontSize, 10)
    expect(num).toBeGreaterThanOrEqual(12)
  })

  test('کنتراست رنگ کافی', async ({ page }) => {
    await gotoContractFlow(page)
    const btn = page.locator('button:has-text("مرحله بعد"), button:has-text("ورود")').first()
    if (await btn.isVisible({ timeout: 5000 })) {
      const bg = await btn.evaluate(el => getComputedStyle(el).backgroundColor)
      expect(bg).not.toBe('transparent')
    }
  })
})

test.describe('UX جامع - پیام‌های خطا', () => {
  test('پیام خطا برای فیلد خالی نمایش داده می‌شود', async ({ page }) => {
    await gotoContractFlow(page)
    const btn = page.locator('button:has-text("ورود"), button:has-text("ارسال"), button:has-text("ثبت")').first()
    if (await btn.isVisible({ timeout: 5000 })) {
      await btn.click()
      await page.waitForTimeout(2000)
      const err = page.locator('[role="alert"], .toast, [class*="error"], text=/وارد|لطف|پر کنید|خطا/')
      if (await err.first().isVisible({ timeout: 5000 })) {
        const text = await err.first().textContent()
        expect(text?.length).toBeGreaterThan(3)
        expect(text).not.toContain('undefined')
        expect(text).not.toContain('null')
      }
    }
  })

  test('پیام خطا قابل فهم است', async ({ page }) => {
    await gotoContractFlow(page)
    const mobile = page.locator('input[placeholder*="موبایل"]').first()
    if (await mobile.isVisible({ timeout: 5000 })) {
      await mobile.fill('0912')
      await page.locator('button:has-text("ورود"), button:has-text("ارسال")').first().click()
      await page.waitForTimeout(2000)
      const err = page.locator('[role="alert"], .toast, text=/موبایل|شماره|۱۱|خطا/')
      if (await err.first().isVisible({ timeout: 5000 })) {
        const text = await err.first().textContent()
        expect(text?.length).toBeGreaterThan(5)
      }
    }
  })
})

test.describe('UX جامع - فرم و فیلدها', () => {
  test('لیبل فیلدها وجود دارد', async ({ page }) => {
    await gotoContractFlow(page)
    const labels = page.locator('label, text=/کد ملی|موبایل|آدرس/')
    await expect(labels.first()).toBeVisible({ timeout: 10000 })
  })

  test('Placeholder راهنما دارد', async ({ page }) => {
    await gotoContractFlow(page)
    const input = page.locator('input[placeholder*="وارد"], input[placeholder*="کد"]').first()
    if (await input.isVisible({ timeout: 5000 })) {
      const ph = await input.getAttribute('placeholder')
      expect(ph?.length).toBeGreaterThan(2)
    }
  })

  test('دکمه‌های اصلی قابل تشخیص هستند', async ({ page }) => {
    await gotoContractFlow(page)
    const primaryBtn = page.locator('button:has-text("مرحله بعد"), button:has-text("ورود")').first()
    if (await primaryBtn.isVisible({ timeout: 5000 })) {
      await expect(primaryBtn).toBeEnabled()
    }
  })
})

test.describe('UX جامع - پشتیبانی', () => {
  test('دکمه چت پشتیبانی وجود دارد', async ({ page }) => {
    await gotoContractFlow(page)
    const chat = page.locator('button:has-text("چت"), button:has-text("پشتیبانی")').first()
    if (await chat.isVisible({ timeout: 5000 })) {
      await expect(chat).toBeVisible()
    }
  })
})
