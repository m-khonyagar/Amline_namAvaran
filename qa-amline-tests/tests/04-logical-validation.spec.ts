/**
 * تست منطق بین فیلدها
 */
import { test, expect } from '@playwright/test'
import { gotoContractFlow, clickNextStep } from './helpers'

test.describe('Logical - اعتبارسنجی منطقی', () => {
  test.beforeEach(async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
  })

  test('Logical - تاریخ پایان قبل از تاریخ شروع', async ({ page }) => {
    const startInput = page.locator('input[name="start_date"], input[placeholder*="شروع"]').first()
    const endInput = page.locator('input[name="end_date"], input[placeholder*="پایان"]').first()
    
    if (await startInput.isVisible() && await endInput.isVisible()) {
      await startInput.fill('1403/06/01')
      await endInput.fill('1403/01/01') // قبل از شروع
      await clickNextStep(page)
      
      const error = page.locator('text=/تاریخ|پایان|شروع|قبل|بعد/')
      await expect(error.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('Logical - تاریخ تحویل ملک قبل از شروع اجاره', async ({ page }) => {
    const startInput = page.locator('input[name="start_date"]').first()
    const deliveryInput = page.locator('input[name="delivery_date"], input[placeholder*="تحویل"]').first()
    
    if (await startInput.isVisible() && await deliveryInput.isVisible()) {
      await startInput.fill('1403/06/01')
      await deliveryInput.fill('1403/01/01')
      await clickNextStep(page)
      
      const error = page.locator('text=/تاریخ|تحویل|شروع/')
      await expect(error.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('Logical - ودیعه منفی یا صفر', async ({ page }) => {
    const depositInput = page.locator('input[name="deposit"], input[placeholder*="ودیعه"]').first()
    if (await depositInput.isVisible()) {
      await depositInput.fill('-1000000')
      await clickNextStep(page)
      const error = page.locator('text=/ودیعه|مبلغ|منفی/')
      await expect(error.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('Logical - متراژ صفر یا منفی', async ({ page }) => {
    const areaInput = page.locator('input[name="area"], input[placeholder*="متراژ"]').first()
    if (await areaInput.isVisible()) {
      await areaInput.fill('0')
      await clickNextStep(page)
      const error = page.locator('text=/متراژ|متر|وارد/')
      await expect(error.first()).toBeVisible({ timeout: 5000 })
    }
  })
})
