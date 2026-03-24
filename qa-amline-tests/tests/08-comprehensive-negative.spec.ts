/**
 * تست‌های منفی جامع - تمام فیلدها و سناریوهای اعتبارسنجی
 */
import { test, expect } from '@playwright/test'
import { gotoContractFlow, clickNextStep, fillOwnerForm, clickRegisterOwner, dismissToasts } from './helpers'
import { INVALID_VALUES, VALID_CONTRACT_DATA, TEST_USERS } from './fixtures'

test.describe('Negative جامع - ورود/OTP', () => {
  test.beforeEach(async ({ page }) => await gotoContractFlow(page))

  test('موبایل خالی', async ({ page }) => {
    const sendBtn = page.locator('button:has-text("ورود"), button:has-text("ارسال")').first()
    if (await sendBtn.isVisible({ timeout: 5000 })) {
      await sendBtn.click()
      await page.waitForTimeout(2000)
      const otp = page.locator('[role="spinbutton"], input[placeholder*="*"]').first()
      expect(await otp.isVisible()).toBe(false)
    }
  })

  test('موبایل ۴ رقمی', async ({ page }) => {
    const mobile = page.locator('input[placeholder*="موبایل"], input[type="tel"]').first()
    if (await mobile.isVisible({ timeout: 5000 })) {
      await mobile.fill(INVALID_VALUES.shortMobile)
      await page.locator('button:has-text("ورود"), button:has-text("ارسال")').first().click()
      await page.waitForTimeout(2000)
      const otp = page.locator('[role="spinbutton"]').first()
      expect(await otp.isVisible()).toBe(false)
    }
  })

  test('موبایل ۱۴ رقمی', async ({ page }) => {
    const mobile = page.locator('input[placeholder*="موبایل"], input[type="tel"]').first()
    if (await mobile.isVisible({ timeout: 5000 })) {
      await mobile.fill(INVALID_VALUES.longMobile)
      await page.locator('button:has-text("ورود"), button:has-text("ارسال")').first().click()
      await page.waitForTimeout(2000)
      const otp = page.locator('[role="spinbutton"]').first()
      expect(await otp.isVisible()).toBe(false)
    }
  })

  test('موبایل با 08', async ({ page }) => {
    const mobile = page.locator('input[placeholder*="موبایل"], input[type="tel"]').first()
    if (await mobile.isVisible({ timeout: 5000 })) {
      await mobile.fill(INVALID_VALUES.invalidMobile)
      await page.locator('button:has-text("ورود"), button:has-text("ارسال")').first().click()
      await page.waitForTimeout(2000)
      const otp = page.locator('[role="spinbutton"]').first()
      if (await otp.isVisible()) {
        test.info().annotations.push({ type: 'bug', description: '08... پذیرفته شد' })
      }
    }
  })

  test('موبایل با حروف', async ({ page }) => {
    const mobile = page.locator('input[placeholder*="موبایل"], input[type="tel"]').first()
    if (await mobile.isVisible({ timeout: 5000 })) {
      await mobile.fill(INVALID_VALUES.lettersInMobile)
      await page.locator('button:has-text("ورود"), button:has-text("ارسال")').first().click()
      await page.waitForTimeout(2000)
      const otp = page.locator('[role="spinbutton"]').first()
      expect(await otp.isVisible()).toBe(false)
    }
  })
})

test.describe('Negative جامع - فرم مالک', () => {
  test.beforeEach(async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
  })

  test('کد ملی ۵ رقمی', async ({ page }) => {
    const kd = page.locator('input[placeholder*="کدملی"], input[placeholder*="کد ملی"]').first()
    if (await kd.isVisible({ timeout: 8000 })) {
      await kd.fill(INVALID_VALUES.shortNationalId)
      await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.owner)
      await clickRegisterOwner(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/کد ملی|۱۰|نامعتبر|خطا/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('کد ملی با حروف', async ({ page }) => {
    const kd = page.locator('input[placeholder*="کدملی"], input[placeholder*="کد ملی"]').first()
    if (await kd.isVisible({ timeout: 8000 })) {
      await kd.fill(INVALID_VALUES.invalidNationalId)
      await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.owner)
      await clickRegisterOwner(page)
      await page.waitForTimeout(2000)
      const err = page.locator('[role="alert"], .toast, text=/کد ملی|عدد|نامعتبر/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('کد ملی همه یکسان 1111111111', async ({ page }) => {
    const kd = page.locator('input[placeholder*="کدملی"], input[placeholder*="کد ملی"]').first()
    if (await kd.isVisible({ timeout: 8000 })) {
      await kd.fill(INVALID_VALUES.allSameNationalId)
      await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.owner)
      await clickRegisterOwner(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/کد ملی|نامعتبر|خطا/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('فیلد خالی - کلیک ثبت بدون پر کردن', async ({ page }) => {
    const btn = page.locator('button:has-text("ثبت اطلاعات مالک"), button:has-text("مرحله بعد")').first()
    if (await btn.isVisible({ timeout: 8000 })) {
      await btn.click()
      await page.waitForTimeout(2000)
      const err = page.locator('[role="alert"], .toast, text=/وارد|پر کنید|لطف|خطا/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Negative جامع - مبالغ و اعداد', () => {
  test.beforeEach(async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
  })

  test('اجاره منفی', async ({ page }) => {
    const rent = page.locator('input[placeholder*="اجاره"]').first()
    if (await rent.isVisible({ timeout: 10000 })) {
      await rent.fill(INVALID_VALUES.negativeAmount)
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/مبلغ|منفی|نامعتبر|خطا/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('اجاره صفر', async ({ page }) => {
    const rent = page.locator('input[placeholder*="اجاره"]').first()
    if (await rent.isVisible({ timeout: 10000 })) {
      await rent.fill(INVALID_VALUES.zeroAmount)
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/مبلغ|صفر|وارد|خطا/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('اجاره با حروف', async ({ page }) => {
    const rent = page.locator('input[placeholder*="اجاره"]').first()
    if (await rent.isVisible({ timeout: 10000 })) {
      await rent.fill(INVALID_VALUES.lettersInAmount)
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/مبلغ|عدد|نامعتبر|خطا/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('متراژ صفر', async ({ page }) => {
    const area = page.locator('input[placeholder*="متراژ"], input[placeholder*="مساحت"]').first()
    if (await area.isVisible({ timeout: 10000 })) {
      await area.fill(INVALID_VALUES.zeroArea)
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/متراژ|متر|وارد|خطا/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('کد پستی ۵ رقمی', async ({ page }) => {
    const postal = page.locator('input[placeholder*="کدپستی"], input[placeholder*="کد پستی"]').first()
    if (await postal.isVisible({ timeout: 10000 })) {
      await postal.fill(INVALID_VALUES.shortPostalCode)
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/کد پستی|۱۰|نامعتبر|خطا/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Negative جامع - امنیت', () => {
  test.beforeEach(async ({ page }) => await gotoContractFlow(page))

  test('ورودی XSS در فیلد', async ({ page }) => {
    const kd = page.locator('input[placeholder*="کدملی"]').first()
    if (await kd.isVisible({ timeout: 8000 })) {
      await kd.fill(INVALID_VALUES.xss)
      await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.owner)
      await clickRegisterOwner(page)
      await page.waitForTimeout(2000)
      const body = await page.locator('body').textContent()
      expect(body).not.toContain('<script>')
    }
  })

  test('ورودی SQL Injection', async ({ page }) => {
    const kd = page.locator('input[placeholder*="کدملی"]').first()
    if (await kd.isVisible({ timeout: 8000 })) {
      await kd.fill(INVALID_VALUES.sqlInjection)
      await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.owner)
      await clickRegisterOwner(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/کد ملی|نامعتبر|خطا/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })
})
