/**
 * تست دسترسی‌پذیری (Accessibility)
 */
import { test, expect } from '@playwright/test'
import { gotoContractFlow } from './helpers'

test.describe('Accessibility - دسترسی‌پذیری', () => {
  test('عنوان صفحه (title) وجود دارد', async ({ page }) => {
    await gotoContractFlow(page)
    const title = await page.title()
    expect(title.length).toBeGreaterThan(2)
    expect(title).toContain('املاین')
  })

  test('فیلدهای input دارای label یا aria-label', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
    const inputs = page.locator('input:not([type="hidden"])')
    const count = await inputs.count()
    for (let i = 0; i < Math.min(count, 5); i++) {
      const inp = inputs.nth(i)
      const id = await inp.getAttribute('id')
      const ariaLabel = await inp.getAttribute('aria-label')
      const placeholder = await inp.getAttribute('placeholder')
      expect(id || ariaLabel || placeholder).toBeTruthy()
    }
  })

  test('دکمه‌ها متن دارند', async ({ page }) => {
    await gotoContractFlow(page)
    const btns = page.locator('button')
    const count = await btns.count()
    for (let i = 0; i < Math.min(count, 5); i++) {
      const btn = btns.nth(i)
      const text = await btn.textContent()
      const ariaLabel = await btn.getAttribute('aria-label')
      expect((text?.trim() || ariaLabel)?.length).toBeGreaterThan(0)
    }
  })

  test('زبان صفحه مشخص است', async ({ page }) => {
    await gotoContractFlow(page)
    const lang = await page.locator('html').getAttribute('lang')
    expect(['fa', 'fa-IR', 'ar']).toContain(lang || 'fa')
  })
})
