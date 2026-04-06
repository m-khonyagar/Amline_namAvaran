import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { clearAmlineBrowserStorage } from './storage-helpers'

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3002'

test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE}/login`)
  await clearAmlineBrowserStorage(page)
})

async function devLogin(page: Page) {
  await page.goto(`${BASE}/login`)
  const devBtn = page.getByRole('button', { name: /ورود آزمایشی/i })
  await expect(devBtn).toBeVisible({ timeout: 20000 })
  await devBtn.click()
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 })
}

test('a11y: داشبورد بدون نقض جدی axe', async ({ page }) => {
  await devLogin(page)
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
})

test('a11y: صفحه کاربران بدون نقض جدی axe', async ({ page }) => {
  await devLogin(page)
  await page.goto(`${BASE}/users`)
  await expect(page.locator('body')).not.toBeEmpty()
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
})

test('a11y: صندوق ورودی بدون نقض جدی axe', async ({ page }) => {
  await devLogin(page)
  await page.goto(`${BASE}/admin/inbox`)
  await expect(page.getByRole('heading', { name: 'صندوق ورودی' })).toBeVisible({ timeout: 15000 })
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
})

test('a11y: CRM بدون نقض جدی axe', async ({ page }) => {
  await devLogin(page)
  await page.goto(`${BASE}/crm`)
  await expect(page.getByRole('heading', { name: 'جدید' })).toBeVisible({ timeout: 15000 })
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
})
