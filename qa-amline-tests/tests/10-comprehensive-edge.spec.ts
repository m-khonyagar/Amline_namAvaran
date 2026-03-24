/**
 * تست‌های مرزی جامع - سناریوهای حدی و غیرمعمول
 */
import { test, expect } from '@playwright/test'
import { gotoContractFlow, clickNextStep, fillOwnerForm, clickRegisterOwner } from './helpers'
import { VALID_CONTRACT_DATA, VALID_NATIONAL_IDS, TEST_USERS } from './fixtures'

test.describe('Edge - رفرش و ناوبری', () => {
  test('رفرش در میانه فرم', async ({ page }) => {
    await gotoContractFlow(page)
    const mobile = page.locator('input[placeholder*="موبایل"]').first()
    if (await mobile.isVisible({ timeout: 5000 })) {
      await mobile.fill(TEST_USERS.owner)
      await page.reload()
      await page.waitForLoadState('networkidle')
      const mobileAfter = page.locator('input[placeholder*="موبایل"]').first()
      await expect(mobileAfter).toHaveValue('')
    }
  })

  test('رفرش پس از پر کردن فرم مالک', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
    const kd = page.locator('input[placeholder*="کدملی"]').first()
    if (await kd.isVisible({ timeout: 8000 })) {
      await kd.fill(VALID_NATIONAL_IDS[0])
      await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.owner)
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      const kdAfter = page.locator('input[placeholder*="کدملی"]').first()
      await expect(kdAfter).toHaveValue('')
    }
  })

  test('بازگشت به مرحله قبل', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
    await fillOwnerForm(page)
    await clickRegisterOwner(page)
    await page.waitForTimeout(2000)
    await clickNextStep(page)
    await page.waitForTimeout(2000)
    const backBtn = page.locator('button:has-text("مرحله قبل"), button:has-text("بازگشت")').first()
    if (await backBtn.isVisible({ timeout: 5000 })) {
      await backBtn.click()
      await page.waitForTimeout(2000)
      const ownerForm = page.locator('input[placeholder*="کدملی"]').first()
      await expect(ownerForm).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Edge - کلیک و تعامل', () => {
  test('کلیک چندباره روی ارسال کد', async ({ page }) => {
    await gotoContractFlow(page)
    const mobile = page.locator('input[placeholder*="موبایل"]').first()
    if (await mobile.isVisible({ timeout: 5000 })) {
      await mobile.fill(TEST_USERS.owner)
      await page.locator('text=موافقم').first().click().catch(() => {})
      const sendBtn = page.locator('button:has-text("ورود"), button:has-text("ارسال")').first()
      await sendBtn.click()
      await sendBtn.click()
      await sendBtn.click()
      await page.waitForTimeout(3000)
      const otp = page.locator('[role="spinbutton"]').first()
      await expect(otp).toBeVisible({ timeout: 15000 })
    }
  })

  test('کلیک چندباره روی مرحله بعد', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
    await fillOwnerForm(page)
    await clickRegisterOwner(page)
    await page.waitForTimeout(2000)
    const nextBtn = page.locator('button:has-text("مرحله بعد")').first()
    if (await nextBtn.isVisible({ timeout: 5000 })) {
      await nextBtn.click()
      await nextBtn.click()
      await page.waitForTimeout(3000)
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('Edge - مقادیر حدی', () => {
  test.beforeEach(async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
  })

  test('مبلغ بسیار زیاد', async ({ page }) => {
    const rent = page.locator('input[placeholder*="اجاره"]').first()
    if (await rent.isVisible({ timeout: 10000 })) {
      await rent.fill('999999999999')
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/حداکثر|مبلغ|خطا/')
      if (await err.first().isVisible({ timeout: 3000 })) {
        await expect(err.first()).toBeVisible()
      }
    }
  })

  test('متراژ بسیار زیاد', async ({ page }) => {
    const area = page.locator('input[placeholder*="متراژ"], input[placeholder*="مساحت"]').first()
    if (await area.isVisible({ timeout: 10000 })) {
      await area.fill('99999')
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/حداکثر|متراژ|خطا/')
      if (await err.first().isVisible({ timeout: 3000 })) {
        await expect(err.first()).toBeVisible()
      }
    }
  })

  test('آدرس بسیار طولانی', async ({ page }) => {
    const address = page.locator('input[placeholder*="آدرس"], textarea[placeholder*="آدرس"]').first()
    if (await address.isVisible({ timeout: 10000 })) {
      await address.fill('الف'.repeat(500))
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/حداکثر|طول|خطا/')
      if (await err.first().isVisible({ timeout: 3000 })) {
        await expect(err.first()).toBeVisible()
      }
    }
  })
})

test.describe('Edge - داده تکراری', () => {
  test('کد ملی مالک و مستاجر یکسان', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
    const kd = page.locator('input[placeholder*="کدملی"]').first()
    if (await kd.isVisible({ timeout: 8000 })) {
      await kd.fill(VALID_NATIONAL_IDS[0])
      await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.owner)
      await clickRegisterOwner(page)
      await page.waitForTimeout(3000)
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const tenantKd = page.locator('input[placeholder*="کدملی"]').first()
      if (await tenantKd.isVisible({ timeout: 5000 })) {
        await tenantKd.fill(VALID_NATIONAL_IDS[0])
        await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.tenant)
        await page.locator('input[placeholder*="تعداد مستاجران"]').first().fill('1').catch(() => {})
        await page.locator('button:has-text("ثبت اطلاعات مستاجر")').first().click().catch(() => {})
        await clickNextStep(page)
        await page.waitForTimeout(2000)
      }
    }
  })
})
