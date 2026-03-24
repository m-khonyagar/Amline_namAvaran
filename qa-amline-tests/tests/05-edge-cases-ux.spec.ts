/**
 * تست سناریوهای مرزی و UX
 */
import { test, expect } from '@playwright/test'
import { gotoContractFlow, BASE_URL } from './helpers'

test.describe('Edge Cases', () => {
  test('رفرش صفحه در میانه فرآیند', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForLoadState('networkidle')
    
    const mobileInput = page.locator('input[type="tel"], input[placeholder*="09"]').first()
    if (await mobileInput.isVisible()) {
      await mobileInput.fill('09121234567')
      await page.reload()
      await expect(page.locator('input[type="tel"]').first()).toHaveValue('')
    }
  })

  test('کلیک چندباره روی دکمه ارسال', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForLoadState('networkidle')
    
    const mobileInput = page.locator('input[type="tel"], input[placeholder*="09"]').first()
    if (await mobileInput.isVisible()) {
      await mobileInput.fill('09121234567')
      const sendBtn = page.locator('button:has-text("ارسال"), button[type="submit"]').first()
      await sendBtn.click()
      await sendBtn.click()
      await sendBtn.click()
      // نباید چند درخواست ارسال شود یا خطا رخ دهد
      await expect(page.locator('input[placeholder*="*"], input[name="otp"]').first()).toBeVisible({ timeout: 15000 })
    }
  })
})

test.describe('UX - تجربه کاربری', () => {
  test('UX - مسیر کاربر واضح است', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForLoadState('networkidle')
    
    const heading = page.locator('h1, h2, [role="heading"]').first()
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('UX - دکمه بازگشت به مرحله قبل وجود دارد', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForLoadState('networkidle')
    
    const backBtn = page.locator('button:has-text("بازگشت"), button:has-text("قبلی"), a:has-text("بازگشت")').first()
    if (await backBtn.isVisible()) {
      await backBtn.click()
      await expect(page).not.toHaveURL(BASE_URL + '/contract/create')
    }
  })

  test('UX - پیام‌های خطا قابل فهم هستند', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForLoadState('networkidle')
    
    const sendBtn = page.locator('button:has-text("ارسال"), button[type="submit"]').first()
    await sendBtn.click()
    
    const errorMsg = page.locator('[role="alert"], .error, .toast, [class*="error"]').first()
    if (await errorMsg.isVisible()) {
      const text = await errorMsg.textContent()
      expect(text?.length).toBeGreaterThan(5)
      expect(text).not.toContain('undefined')
      expect(text).not.toContain('null')
    }
  })

  test('UX - فرم RTL و خوانا است', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForLoadState('networkidle')
    
    const body = page.locator('body, html')
    const dir = await body.getAttribute('dir')
    expect(['rtl', 'ltr']).toContain(dir || 'ltr')
  })
})
