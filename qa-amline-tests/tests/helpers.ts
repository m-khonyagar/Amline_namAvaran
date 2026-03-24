/**
 * توابع کمکی برای تست‌های املاین
 */
import type { Page } from '@playwright/test'
import { VALID_CONTRACT_DATA, VALID_NATIONAL_IDS, VALID_SHEBAS, TEST_USERS } from './fixtures'

const BASE_URL = process.env.BASE_URL || 'http://app-dev.amline.ir'

export async function gotoContractFlow(page: Page) {
  await page.goto(BASE_URL)
  await page.waitForLoadState('networkidle')
  const contractLink = page.locator('a[href*="contractnewflow"]').first()
  if (await contractLink.isVisible({ timeout: 8000 })) {
    await contractLink.click()
    await page.waitForLoadState('networkidle')
  }
}

export async function fillOwnerForm(page: Page, overrides?: Partial<typeof VALID_CONTRACT_DATA>) {
  const data = { ...VALID_CONTRACT_DATA, ...overrides }
  const kdMeli = page.locator('input[placeholder*="کدملی"], input[placeholder*="کد ملی"]').first()
  if (await kdMeli.isVisible({ timeout: 5000 })) {
    await kdMeli.fill(data.nationalId)
    await page.locator('input[placeholder*="شماره موبایل"]').first().fill(TEST_USERS.owner)
    const dayInput = page.locator('input[placeholder="روز"]').first()
    if (await dayInput.isVisible({ timeout: 2000 })) {
      await dayInput.click()
      await page.waitForTimeout(500)
      await page.locator('.Select_bottom-sheet__option__fcHZO, [role="button"]').filter({ hasText: new RegExp(data.birthDay) }).first().click().catch(() => {})
      await page.waitForTimeout(300)
      await page.locator('input[placeholder="ماه"]').first().click()
      await page.waitForTimeout(500)
      await page.locator('.Select_bottom-sheet__option__fcHZO, [role="button"]').filter({ hasText: /6|۶|خرداد/ }).first().click().catch(() => {})
      await page.waitForTimeout(300)
      await page.locator('input[placeholder="سال"]').first().click()
      await page.waitForTimeout(500)
      await page.locator('.Select_bottom-sheet__option__fcHZO, [role="button"]').filter({ hasText: data.birthYear }).first().click().catch(() => {})
      await page.waitForTimeout(300)
    }
    const sheba = page.locator('input[placeholder*="شبا"]').first()
    if (await sheba.isVisible({ timeout: 2000 })) await sheba.fill(data.sheba)
    const postal = page.locator('input[placeholder*="کدپستی"]').first()
    if (await postal.isVisible({ timeout: 2000 })) await postal.fill(data.postalCode)
    const bill = page.locator('input[placeholder*="شناسه قبض"]').first()
    if (await bill.isVisible({ timeout: 2000 })) await bill.fill('1234567890')
  }
}

export async function clickRegisterOwner(page: Page) {
  const btn = page.locator('button:has-text("ثبت اطلاعات مالک")').first()
  if (await btn.isVisible({ timeout: 2000 })) await btn.click()
}

export async function clickNextStep(page: Page) {
  const btn = page.locator('button:has-text("مرحله بعد"), button:has-text("ادامه")').first()
  if (await btn.isVisible({ timeout: 3000 })) await btn.click({ force: true })
}

export async function dismissToasts(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-sonner-toast]').forEach(el => (el as HTMLElement).style.display = 'none')
  }).catch(() => {})
}

export { BASE_URL, VALID_CONTRACT_DATA, VALID_NATIONAL_IDS, VALID_SHEBAS, TEST_USERS }
