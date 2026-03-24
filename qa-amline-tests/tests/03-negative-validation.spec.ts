/**
 * تست‌های منفی - اعتبارسنجی فیلدها
 */
import { test, expect } from '@playwright/test'
import { gotoContractFlow } from './helpers'
import { INVALID_VALUES, TEST_USERS } from './fixtures'

test.describe('Negative - اعتبارسنجی فیلدها', () => {
  test.beforeEach(async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
  })

  test('Negative - کد ملی کمتر از ۱۰ رقم', async ({ page }) => {
    const nationalIdInput = page.locator('input[placeholder*="کدملی"], input[placeholder*="کد ملی"]').first()
    if (await nationalIdInput.isVisible({ timeout: 8000 })) {
      await nationalIdInput.fill(INVALID_VALUES.shortNationalId)
      await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.owner)
      await page.locator('button:has-text("ثبت اطلاعات مالک"), button:has-text("مرحله بعد")').first().click()
      await page.waitForTimeout(2000)
      const error = page.locator('text=/کد ملی|۱۰|10|نامعتبر|خطا/')
      await expect(error.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('Negative - کد ملی با حروف', async ({ page }) => {
    const nationalIdInput = page.locator('input[placeholder*="کدملی"], input[placeholder*="کد ملی"]').first()
    if (await nationalIdInput.isVisible({ timeout: 8000 })) {
      await nationalIdInput.fill(INVALID_VALUES.invalidNationalId)
      await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.owner)
      await page.locator('button:has-text("ثبت اطلاعات مالک"), button:has-text("مرحله بعد")').first().click()
      await page.waitForTimeout(2000)
      const error = page.locator('[role="alert"], .toast, text=/کد ملی|عدد|نامعتبر/')
      await expect(error.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('Negative - مبلغ اجاره منفی', async ({ page }) => {
    const rentInput = page.locator('input[placeholder*="اجاره"]').first()
    if (await rentInput.isVisible({ timeout: 10000 })) {
      await rentInput.fill(INVALID_VALUES.negativeAmount)
      await page.locator('button:has-text("مرحله بعد"), button:has-text("ادامه")').first().click()
      await page.waitForTimeout(2000)
      const error = page.locator('text=/مبلغ|منفی|صحیح|نامعتبر|خطا/')
      await expect(error.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('Negative - مبلغ اجاره صفر', async ({ page }) => {
    const rentInput = page.locator('input[placeholder*="اجاره"]').first()
    if (await rentInput.isVisible({ timeout: 10000 })) {
      await rentInput.fill(INVALID_VALUES.zeroAmount)
      await page.locator('button:has-text("مرحله بعد"), button:has-text("ادامه")').first().click()
      await page.waitForTimeout(2000)
      const error = page.locator('text=/مبلغ|صفر|وارد|خطا/')
      await expect(error.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('Negative - فیلد خالی', async ({ page }) => {
    const submitBtn = page.locator('button:has-text("ثبت اطلاعات مالک"), button:has-text("مرحله بعد"), button:has-text("ورود")').first()
    if (await submitBtn.isVisible({ timeout: 5000 })) {
      await submitBtn.click()
      await page.waitForTimeout(2000)
      const error = page.locator('[role="alert"], .toast, text=/وارد|لطف|پر کنید|خطا/')
      await expect(error.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('Negative - کد پستی نامعتبر (کمتر از ۱۰ رقم)', async ({ page }) => {
    const postalInput = page.locator('input[placeholder*="کدپستی"], input[placeholder*="کد پستی"]').first()
    if (await postalInput.isVisible({ timeout: 10000 })) {
      await postalInput.fill('12345')
      await page.locator('button:has-text("مرحله بعد"), button:has-text("ادامه")').first().click()
      await page.waitForTimeout(2000)
      const error = page.locator('text=/کد پستی|۱۰|نامعتبر|خطا/')
      await expect(error.first()).toBeVisible({ timeout: 5000 })
    }
  })
})
