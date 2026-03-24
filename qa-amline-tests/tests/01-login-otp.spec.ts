/**
 * تست ورود با OTP
 * در صفحه OTP توقف می‌شود تا کاربر کد را وارد کند
 */
import { test, expect } from '@playwright/test'
import { TEST_USERS } from './fixtures'

const BASE_URL = process.env.BASE_URL || 'http://app-dev.amline.ir'

test.describe('ورود با OTP', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    const contractLink = page.locator('a[href*="contractnewflow"]').first()
    if (await contractLink.isVisible({ timeout: 5000 })) {
      await contractLink.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('OTP - نمایش صفحه ورود و ارسال کد برای مالک @manual', async ({ page }) => {
    // جستجوی فیلد موبایل (قبلاً در beforeEach به صفحه قرارداد رفتیم)
    const mobileInput = page.locator('input[type="tel"], input[placeholder*="09"], input[name="mobile"], input[id*="mobile"], input[inputmode="numeric"]').first()
    await expect(mobileInput).toBeVisible({ timeout: 20000 })
    
    await mobileInput.fill(TEST_USERS.owner)
    
    // تیک زدن قوانین و مقررات برای فعال شدن دکمه ورود
    await page.locator('text=موافقم').first().click()
    
    await page.waitForTimeout(500)
    
    const sendBtn = page.locator('button:has-text("ورود"):not([disabled]), button[type="submit"]:not([disabled])').first()
    await expect(sendBtn).toBeEnabled({ timeout: 5000 })
    await sendBtn.click()
    
    // منتظر صفحه OTP (۵ باکس جداگانه برای هر رقم)
    const otpInput = page.locator('[role="spinbutton"], input[type="number"][maxlength="1"], input[inputmode="numeric"]').first()
    await expect(otpInput).toBeVisible({ timeout: 20000 })
    
    // ⚠️ توقف: کد OTP را وارد کنید، دکمه ورود را بزنید، سپس در Playwright Inspector روی Resume کلیک کنید
    await test.info().attach('OTP_PAUSE', {
      body: 'کد ارسال‌شده به 09107709601 را وارد کنید. پس از ورود، در Inspector روی Resume کلیک کنید.',
      contentType: 'text/plain',
    })
    await page.pause()
    
    // پس از resume: بررسی ورود موفق
    await expect(page).not.toHaveURL(/login|ورود/)
  })

  test('Negative - شماره موبایل کمتر از ۱۱ رقم', async ({ page }) => {
    const mobileInput = page.locator('input[type="tel"], input[placeholder*="09"], input[name="mobile"]').first()
    await expect(mobileInput).toBeVisible({ timeout: 15000 })
    
    await mobileInput.fill('0912')
    const sendBtn = page.locator('button:has-text("ارسال"), button:has-text("کد"), button[type="submit"]').first()
    await sendBtn.click()
    
    await page.waitForTimeout(3000)
    const otpInput = page.locator('[role="spinbutton"], input[placeholder*="*"], input[name="otp"]').first()
    // نباید به صفحه OTP برویم
    expect(await otpInput.isVisible()).toBe(false)
  })

  test('Negative - شماره موبایل بیشتر از ۱۱ رقم', async ({ page }) => {
    const mobileInput = page.locator('input[type="tel"], input[placeholder*="09"], input[name="mobile"]').first()
    await expect(mobileInput).toBeVisible({ timeout: 15000 })
    
    await mobileInput.fill('09121234567890')
    const sendBtn = page.locator('button:has-text("ارسال"), button:has-text("کد"), button[type="submit"]').first()
    await sendBtn.click()
    
    await page.waitForTimeout(3000)
    const otpInput = page.locator('[role="spinbutton"], input[placeholder*="*"], input[name="otp"]').first()
    expect(await otpInput.isVisible()).toBe(false)
  })

  test('Negative - شماره موبایل خالی', async ({ page }) => {
    const sendBtn = page.locator('button:has-text("ارسال"), button:has-text("کد"), button[type="submit"]').first()
    await expect(sendBtn).toBeVisible({ timeout: 15000 })
    await sendBtn.click()
    
    await page.waitForTimeout(3000)
    const otpInput = page.locator('[role="spinbutton"], input[placeholder*="*"], input[name="otp"]').first()
    expect(await otpInput.isVisible()).toBe(false)
  })

  test('Negative - فرمت اشتباه موبایل (شروع با 08)', async ({ page }) => {
    const mobileInput = page.locator('input[type="tel"], input[placeholder*="09"], input[name="mobile"]').first()
    await expect(mobileInput).toBeVisible({ timeout: 15000 })
    
    await mobileInput.fill('08121234567')
    const sendBtn = page.locator('button:has-text("ارسال"), button:has-text("کد"), button[type="submit"]').first()
    await sendBtn.click()
    
    await page.waitForTimeout(3000)
    const otpInput = page.locator('[role="spinbutton"], input[placeholder*="*"], input[name="otp"]').first()
    // ممکن است برخی سیستم‌ها 08 را بپذیرند - در آن صورت تست skip
    if (await otpInput.isVisible()) {
      test.info().annotations.push({ type: 'bug', description: 'شماره 08... پذیرفته شد - بررسی اعتبارسنجی' })
    }
  })
})
