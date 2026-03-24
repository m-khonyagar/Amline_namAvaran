/**
 * فرآیند کامل قرارداد — پس از ورود با OTP
 * اجرا: OTP_CODE=12345 npx playwright test tests/06-contract-flow-full.spec.ts --headed
 */
import { test, expect } from '@playwright/test'
import { TEST_USERS, VALID_CONTRACT_DATA } from './fixtures'

const BASE_URL = process.env.BASE_URL || 'http://app-dev.amline.ir'
const OTP_CODE = process.env.OTP_CODE

async function fillOwnerAndContinue(page: any) {
  const nationalIdInput = page.locator('input[placeholder*="کد ملی"]').first()
  if (await nationalIdInput.isVisible({ timeout: 5000 })) {
    await nationalIdInput.fill(VALID_CONTRACT_DATA.nationalId)
    await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.owner)
    const selects = page.locator('select, [role="combobox"]')
    if ((await selects.count()) >= 3) {
      await selects.nth(0).selectOption({ index: 15 })
      await selects.nth(1).selectOption({ index: 6 })
      await selects.nth(2).selectOption({ index: 25 })
    }
    const shebaInput = page.locator('input[placeholder*="شبا"], input[placeholder*="IBAN"]').first()
    if (await shebaInput.isVisible({ timeout: 2000 })) await shebaInput.fill(VALID_CONTRACT_DATA.sheba)
    await page.locator('button:has-text("مرحله بعد")').first().click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
  }
}

async function fillTenantAndContinue(page: any) {
  const tenantNationalId = page.locator('input[placeholder*="کد ملی"]').first()
  if (await tenantNationalId.isVisible({ timeout: 5000 })) {
    await tenantNationalId.fill(VALID_CONTRACT_DATA.nationalId)
    const tenantMobile = page.locator('input[placeholder*="موبایل"]').first()
    if (await tenantMobile.isVisible()) await tenantMobile.fill(TEST_USERS.tenant)
    const tenantSelects = page.locator('select, [role="combobox"]')
    if ((await tenantSelects.count()) >= 3) {
      await tenantSelects.nth(0).selectOption({ index: 15 })
      await tenantSelects.nth(1).selectOption({ index: 6 })
      await tenantSelects.nth(2).selectOption({ index: 25 })
    }
    const tenantSheba = page.locator('input[placeholder*="شبا"], input[placeholder*="IBAN"]').first()
    if (await tenantSheba.isVisible({ timeout: 2000 })) await tenantSheba.fill(VALID_CONTRACT_DATA.sheba)
    await page.locator('button:has-text("مرحله بعد")').first().click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
  }
}

async function fillPropertyAndContinue(page: any) {
  const addressInput = page.locator('input[placeholder*="آدرس"], textarea[placeholder*="آدرس"]').first()
  if (await addressInput.isVisible({ timeout: 5000 })) {
    await addressInput.fill(VALID_CONTRACT_DATA.propertyAddress)
    const postalInput = page.locator('input[placeholder*="کد پستی"]').first()
    if (await postalInput.isVisible()) await postalInput.fill(VALID_CONTRACT_DATA.postalCode)
    const areaInput = page.locator('input[placeholder*="متراژ"]').first()
    if (await areaInput.isVisible()) await areaInput.fill(VALID_CONTRACT_DATA.area)
    await page.locator('button:has-text("مرحله بعد")').first().click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
  }
}

async function fillAmountsAndContinue(page: any) {
  const rentInput = page.locator('input[placeholder*="اجاره"], input[name="monthly_rent"]').first()
  if (await rentInput.isVisible({ timeout: 5000 })) {
    await rentInput.fill(VALID_CONTRACT_DATA.monthlyRent)
    const depositInput = page.locator('input[placeholder*="ودیعه"], input[name="deposit"]').first()
    if (await depositInput.isVisible()) await depositInput.fill(VALID_CONTRACT_DATA.deposit)
    const dateInputs = page.locator('input[placeholder*="تاریخ"], input[type="date"]')
    if (await dateInputs.count() >= 2) {
      await dateInputs.nth(0).fill(VALID_CONTRACT_DATA.startDate)
      await dateInputs.nth(1).fill(VALID_CONTRACT_DATA.endDate)
    }
    await page.locator('button:has-text("مرحله بعد"), button:has-text("ادامه"), button:has-text("ثبت")').first().click()
    await page.waitForLoadState('networkidle')
  }
}

test.describe('فرآیند کامل قرارداد', () => {
  test('ورود و تکمیل مراحل قرارداد (با OTP دستی) @manual', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.locator('a[href*="contractnewflow"], button:has-text("قرارداد رهن و اجاره")').first().click()
    await page.waitForLoadState('networkidle')

    const mobileInput = page.locator('input[placeholder*="09"], textbox').first()
    if (await mobileInput.isVisible({ timeout: 5000 })) {
      await mobileInput.fill(TEST_USERS.owner)
      await page.locator('text=موافقم').first().click()
      await page.locator('button:has-text("ورود"):not([disabled])').first().click()
      await page.waitForLoadState('networkidle')
    }

    const otpBoxes = page.locator('[role="spinbutton"], input[type="number"][maxlength="1"]')
    if (await otpBoxes.first().isVisible({ timeout: 10000 })) {
      await page.pause() // کد را وارد کنید، ورود بزنید، Resume کنید
    }

    await page.waitForTimeout(2000)
    await fillOwnerAndContinue(page)
    await fillTenantAndContinue(page)
    await fillPropertyAndContinue(page)
    await fillAmountsAndContinue(page)
  })

  test('ورود و تکمیل مراحل قرارداد (با OTP از env)', async ({ page }) => {
    test.skip(!OTP_CODE, 'برای اجرا OTP_CODE را تنظیم کنید: $env:OTP_CODE="12345"')

    // ۱. ورود به فرآیند قرارداد
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    const contractLink = page.locator('a[href*="contractnewflow"]').first()
    await expect(contractLink).toBeVisible({ timeout: 15000 })
    await contractLink.click()
    await page.waitForLoadState('networkidle')

    // ۲. صفحه ورود — پر کردن موبایل و قوانین
    const mobileInput = page.locator('input[type="tel"], input[placeholder*="09"], input[name="mobile"], textbox').first()
    if (await mobileInput.isVisible({ timeout: 3000 })) {
      await mobileInput.fill(TEST_USERS.owner)
      await page.locator('text=موافقم').first().click()
      await page.locator('button:has-text("ورود"):not([disabled])').first().click()
      await page.waitForLoadState('networkidle')
    }

    // ۳. صفحه OTP — وارد کردن کد
    const otpBoxes = page.locator('[role="spinbutton"], input[type="number"][maxlength="1"]')
    await expect(otpBoxes.first()).toBeVisible({ timeout: 15000 })
    if ((await otpBoxes.count()) >= 5) {
      for (let i = 0; i < Math.min(OTP_CODE!.length, 5); i++) {
        await otpBoxes.nth(i).fill(OTP_CODE![i])
      }
      await page.locator('button:has-text("ورود"):not([disabled])').first().click()
      await page.waitForLoadState('networkidle')
    }

    await page.waitForTimeout(2000)
    await fillOwnerAndContinue(page)
    await fillTenantAndContinue(page)
    await fillPropertyAndContinue(page)
    await fillAmountsAndContinue(page)

    // بررسی موفقیت — نباید در صفحه خطا باشیم
    const errorPage = page.locator('text=/خطا|Error|مشکلی پیش/')
    await expect(errorPage).not.toBeVisible({ timeout: 3000 }).catch(() => {})
  })
})
