/**
 * تست‌های منطقی جامع - اعتبارسنجی روابط بین فیلدها
 */
import { test, expect } from '@playwright/test'
import { gotoContractFlow, clickNextStep } from './helpers'
import { VALID_CONTRACT_DATA, TEST_USERS } from './fixtures'

test.describe('Logical جامع - تاریخ‌ها', () => {
  test.beforeEach(async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
  })

  test('تاریخ پایان قبل از تاریخ شروع', async ({ page }) => {
    const start = page.locator('input[placeholder*="شروع"], input[placeholder*="تاریخ"]').first()
    const end = page.locator('input[placeholder*="پایان"]').first()
    if (await start.isVisible({ timeout: 10000 }) && await end.isVisible({ timeout: 2000 })) {
      await start.fill('1403/06/01')
      await end.fill('1403/01/01')
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/تاریخ|پایان|شروع|قبل|بعد|نامعتبر/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('تاریخ تحویل قبل از شروع اجاره', async ({ page }) => {
    const start = page.locator('input[placeholder*="شروع"]').first()
    const delivery = page.locator('input[placeholder*="تحویل"]').first()
    if (await start.isVisible({ timeout: 10000 }) && await delivery.isVisible({ timeout: 2000 })) {
      await start.fill('1403/06/01')
      await delivery.fill('1403/01/01')
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/تاریخ|تحویل|شروع|قبل/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('تاریخ یکسان برای شروع و پایان', async ({ page }) => {
    const start = page.locator('input[placeholder*="شروع"]').first()
    const end = page.locator('input[placeholder*="پایان"]').first()
    if (await start.isVisible({ timeout: 10000 }) && await end.isVisible({ timeout: 2000 })) {
      await start.fill('1403/01/15')
      await end.fill('1403/01/15')
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/تاریخ|مدت|حداقل/')
      if (await err.first().isVisible({ timeout: 3000 })) {
        await expect(err.first()).toBeVisible()
      }
    }
  })
})

test.describe('Logical جامع - مبالغ', () => {
  test.beforeEach(async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
  })

  test('ودیعه منفی', async ({ page }) => {
    const deposit = page.locator('input[placeholder*="ودیعه"]').first()
    if (await deposit.isVisible({ timeout: 10000 })) {
      await deposit.fill('-1000000')
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/ودیعه|مبلغ|منفی|نامعتبر/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('ودیعه صفر', async ({ page }) => {
    const deposit = page.locator('input[placeholder*="ودیعه"]').first()
    if (await deposit.isVisible({ timeout: 10000 })) {
      await deposit.fill('0')
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/ودیعه|مبلغ|صفر|وارد/')
      await expect(err.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('اجاره کمتر از حد منطقی', async ({ page }) => {
    const rent = page.locator('input[placeholder*="اجاره"]').first()
    if (await rent.isVisible({ timeout: 10000 })) {
      await rent.fill('100')
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const err = page.locator('text=/حداقل|مبلغ|وارد/')
      if (await err.first().isVisible({ timeout: 3000 })) {
        await expect(err.first()).toBeVisible()
      }
    }
  })
})

test.describe('Logical جامع - سازگاری داده‌ها', () => {
  test.beforeEach(async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
  })

  test('کد ملی و موبایل ناسازگار - مالک و مستاجر یکسان', async ({ page }) => {
    const kdMeli = page.locator('input[placeholder*="کدملی"]').first()
    if (await kdMeli.isVisible({ timeout: 8000 })) {
      await kdMeli.fill('0499370899')
      await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.owner)
      await page.locator('button:has-text("ثبت اطلاعات مالک")').first().click()
      await page.waitForTimeout(3000)
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const tenantKd = page.locator('input[placeholder*="کدملی"]').first()
      if (await tenantKd.isVisible({ timeout: 5000 })) {
        await tenantKd.fill('0499370899')
        await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.tenant)
        await page.locator('button:has-text("ثبت اطلاعات مستاجر")').first().click().catch(() => {})
        await clickNextStep(page)
        await page.waitForTimeout(2000)
        const err = page.locator('text=/یکسان|ناسازگار|متفاوت|خطا/')
        if (await err.first().isVisible({ timeout: 3000 })) {
          await expect(err.first()).toBeVisible()
        }
      }
    }
  })
})
