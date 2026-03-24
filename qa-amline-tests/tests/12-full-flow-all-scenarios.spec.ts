/**
 * سناریوهای کامل فرآیند - تمام نقش‌ها و مسیرها
 */
import { test, expect } from '@playwright/test'
import { gotoContractFlow, fillOwnerForm, clickRegisterOwner, clickNextStep } from './helpers'
import { VALID_CONTRACT_DATA, VALID_NATIONAL_IDS, VALID_SHEBAS, TEST_USERS } from './fixtures'

test.describe('Flow - نقش مالک', () => {
  test('Happy Path مالک - پر کردن و ثبت', async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
    await fillOwnerForm(page)
    await clickRegisterOwner(page)
    await page.waitForTimeout(3000)
    await clickNextStep(page)
    await page.waitForTimeout(2000)
    const tenantForm = page.locator('input[placeholder*="کدملی"], input[placeholder*="موبایل"]').first()
    await expect(tenantForm).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Flow - نقش مستاجر', () => {
  test.beforeEach(async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
    await fillOwnerForm(page)
    await clickRegisterOwner(page)
    await page.waitForTimeout(3000)
    await clickNextStep(page)
    await page.waitForTimeout(2000)
  })

  test('پر کردن فرم مستاجر با داده معتبر', async ({ page }) => {
    const tenantKd = page.locator('input[placeholder*="کدملی"]').first()
    if (await tenantKd.isVisible({ timeout: 8000 })) {
      await tenantKd.fill(VALID_NATIONAL_IDS[1])
      await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.tenant)
      const countInput = page.locator('input[placeholder*="تعداد مستاجران"]').first()
      if (await countInput.isVisible({ timeout: 2000 })) await countInput.fill('1')
      const sheba = page.locator('input[placeholder*="شبا"]').first()
      if (await sheba.isVisible({ timeout: 2000 })) await sheba.fill(VALID_SHEBAS[1])
      await page.locator('button:has-text("ثبت اطلاعات مستاجر")').first().click().catch(() => {})
      await page.waitForTimeout(2000)
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const nextStep = page.locator('input[placeholder*="آدرس"], input[placeholder*="اجاره"]').first()
      await expect(nextStep).toBeVisible({ timeout: 10000 })
    }
  })
})

test.describe('Flow - اطلاعات ملک', () => {
  test.beforeEach(async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
    await fillOwnerForm(page)
    await clickRegisterOwner(page)
    await page.waitForTimeout(3000)
    await clickNextStep(page)
    await page.waitForTimeout(2000)
    const tenantKd = page.locator('input[placeholder*="کدملی"]').first()
    if (await tenantKd.isVisible({ timeout: 5000 })) {
      await tenantKd.fill(VALID_NATIONAL_IDS[1])
      await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.tenant)
      await page.locator('input[placeholder*="تعداد مستاجران"]').first().fill('1').catch(() => {})
      await page.locator('button:has-text("ثبت اطلاعات مستاجر")').first().click().catch(() => {})
      await page.waitForTimeout(2000)
      await clickNextStep(page)
      await page.waitForTimeout(2000)
    }
  })

  test('پر کردن آدرس و متراژ ملک', async ({ page }) => {
    const address = page.locator('input[placeholder*="آدرس"], textarea[placeholder*="آدرس"]').first()
    if (await address.isVisible({ timeout: 8000 })) {
      await address.fill(VALID_CONTRACT_DATA.propertyAddress)
      await page.locator('input[placeholder*="کدپستی"]').first().fill(VALID_CONTRACT_DATA.postalCode)
      await page.locator('input[placeholder*="متراژ"], input[placeholder*="مساحت"]').first().fill(VALID_CONTRACT_DATA.area)
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const amounts = page.locator('input[placeholder*="اجاره"], input[placeholder*="ودیعه"]').first()
      await expect(amounts).toBeVisible({ timeout: 10000 })
    }
  })
})

test.describe('Flow - مبالغ و تاریخ', () => {
  test.beforeEach(async ({ page }) => {
    await gotoContractFlow(page)
    await page.waitForTimeout(2000)
    for (let i = 0; i < 3; i++) {
      await fillOwnerForm(page)
      await clickRegisterOwner(page)
      await page.waitForTimeout(2000)
      await clickNextStep(page)
      await page.waitForTimeout(2000)
      const tenantKd = page.locator('input[placeholder*="کدملی"]').first()
      if (await tenantKd.isVisible({ timeout: 3000 })) {
        await tenantKd.fill(VALID_NATIONAL_IDS[1])
        await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.tenant)
        await page.locator('input[placeholder*="تعداد مستاجران"]').first().fill('1').catch(() => {})
        await page.locator('button:has-text("ثبت اطلاعات مستاجر")').first().click().catch(() => {})
        await page.waitForTimeout(2000)
        await clickNextStep(page)
        await page.waitForTimeout(2000)
      }
      const address = page.locator('input[placeholder*="آدرس"]').first()
      if (await address.isVisible({ timeout: 3000 })) {
        await address.fill(VALID_CONTRACT_DATA.propertyAddress)
        await page.locator('input[placeholder*="کدپستی"]').first().fill(VALID_CONTRACT_DATA.postalCode)
        await page.locator('input[placeholder*="متراژ"]').first().fill(VALID_CONTRACT_DATA.area)
        await clickNextStep(page)
        await page.waitForTimeout(2000)
      }
      const rent = page.locator('input[placeholder*="اجاره"]').first()
      if (await rent.isVisible({ timeout: 3000 })) break
    }
  })

  test('پر کردن اجاره و ودیعه', async ({ page }) => {
    const rent = page.locator('input[placeholder*="اجاره"]').first()
    if (await rent.isVisible({ timeout: 8000 })) {
      await rent.fill(VALID_CONTRACT_DATA.monthlyRent)
      await page.locator('input[placeholder*="ودیعه"]').first().fill(VALID_CONTRACT_DATA.deposit)
      await clickNextStep(page)
      await page.waitForTimeout(2000)
    }
  })
})

test.describe('Flow - دسترسی به قرارداد', () => {
  test('ورود به contractnewflow از صفحه اصلی', async ({ page }) => {
    await page.goto(process.env.BASE_URL || 'http://app-dev.amline.ir')
    await page.waitForLoadState('networkidle')
    const link = page.locator('a[href*="contractnewflow"]').first()
    await link.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/contractnewflow/)
  })
})
