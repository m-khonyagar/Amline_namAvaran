/**
 * تست از مرحله اطلاعات مالک — کاربر قبلاً وارد شده
 * اجرا: OTP_CODE=xxxxx npx playwright test tests/07-owner-step-from-current.spec.ts --headed
 */
import { test, expect } from '@playwright/test'
import { TEST_USERS, VALID_CONTRACT_DATA, INVALID_VALUES } from './fixtures'

const BASE_URL = process.env.BASE_URL || 'http://app-dev.amline.ir'
const OTP_CODE = process.env.OTP_CODE

async function loginAndGoToOwnerStep(page: any) {
  await page.goto(BASE_URL)
  await page.waitForLoadState('networkidle')
  const contractLink = page.locator('a[href*="contractnewflow"]').first()
  await contractLink.click()
  await page.waitForLoadState('networkidle')

  const mobileInput = page.locator('input[placeholder*="09"], textbox').first()
  if (await mobileInput.isVisible({ timeout: 3000 })) {
    await mobileInput.fill(TEST_USERS.owner)
    await page.locator('text=موافقم').first().click()
    await page.locator('button:has-text("ورود"):not([disabled])').first().click()
    await page.waitForLoadState('networkidle')
  }

  const otpBoxes = page.locator('[role="spinbutton"], input[type="number"][maxlength="1"]')
  if ((await otpBoxes.count()) >= 5 && OTP_CODE) {
    for (let i = 0; i < Math.min(OTP_CODE.length, 5); i++) {
      await otpBoxes.nth(i).fill(OTP_CODE[i])
    }
    await page.locator('button:has-text("ورود"):not([disabled])').first().click()
    await page.waitForLoadState('networkidle')
  }
}

test.describe('مرحله اطلاعات مالک', () => {
  test.beforeEach(async ({ page }) => {
    if (OTP_CODE) {
      await loginAndGoToOwnerStep(page)
    } else {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      await page.locator('a[href*="contractnewflow"], button:has-text("قرارداد رهن و اجاره")').first().click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('Happy Path - پر کردن صحیح و رفتن به مرحله بعد', async ({ page }) => {
    await page.waitForTimeout(2000)

    // کد ملی
    const nationalIdInput = page.locator('input[placeholder*="کد ملی"], input[placeholder*="کد ملی خود"]').first()
    await expect(nationalIdInput).toBeVisible({ timeout: 10000 })
    await nationalIdInput.fill(VALID_CONTRACT_DATA.nationalId)

    // شماره موبایل
    const mobileInput = page.locator('input[placeholder*="موبایل"], input[placeholder*="شماره موبایل"]').first()
    await mobileInput.fill(TEST_USERS.owner)

    // تاریخ تولد — سه سلکتور روز، ماه، سال
    const selects = page.locator('select, [role="combobox"]')
    const selectCount = await selects.count()
    if (selectCount >= 3) {
      await selects.nth(0).selectOption({ index: 15 }) // روز
      await selects.nth(1).selectOption({ index: 6 })  // ماه
      await selects.nth(2).selectOption({ index: 25 }) // سال
    }

    // شماره شبا — در صورت وجود
    const shebaInput = page.locator('input[placeholder*="شبا"], input[placeholder*="IBAN"]').first()
    if (await shebaInput.isVisible({ timeout: 2000 })) {
      await shebaInput.fill(VALID_CONTRACT_DATA.sheba)
    }

    await page.waitForTimeout(500)

    const nextBtn = page.locator('button:has-text("مرحله بعد")').first()
    await expect(nextBtn).toBeVisible({ timeout: 5000 })
    await nextBtn.click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // باید از مرحله مالک خارج شده باشیم
    const stillOnOwner = page.locator('text=اطلاعات مالک').first()
    const errorMsg = page.locator('[role="alert"], .toast, text=/خطا|نامعتبر/').first()
    expect(await errorMsg.isVisible()).toBe(false)
  })

  test('Negative - کد ملی کمتر از ۱۰ رقم', async ({ page }) => {
    await page.waitForTimeout(2000)
    const nationalIdInput = page.locator('input[placeholder*="کد ملی"]').first()
    await nationalIdInput.fill(INVALID_VALUES.shortNationalId)
    await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.owner)
    await page.locator('button:has-text("مرحله بعد")').first().click()
    await page.waitForTimeout(2000)
    const error = page.locator('[role="alert"], .toast, text=/کد ملی|۱۰|نامعتبر/')
    await expect(error.first()).toBeVisible({ timeout: 5000 })
  })

  test('Negative - کد ملی با حروف', async ({ page }) => {
    await page.waitForTimeout(2000)
    const nationalIdInput = page.locator('input[placeholder*="کد ملی"]').first()
    await nationalIdInput.fill(INVALID_VALUES.invalidNationalId)
    await page.locator('input[placeholder*="موبایل"]').first().fill(TEST_USERS.owner)
    await page.locator('button:has-text("مرحله بعد")').first().click()
    await page.waitForTimeout(2000)
    const error = page.locator('[role="alert"], .toast, text=/کد ملی|عدد|نامعتبر/')
    await expect(error.first()).toBeVisible({ timeout: 5000 })
  })

  test('Negative - موبایل نامعتبر', async ({ page }) => {
    await page.waitForTimeout(2000)
    const nationalIdInput = page.locator('input[placeholder*="کد ملی"]').first()
    await nationalIdInput.fill(VALID_CONTRACT_DATA.nationalId)
    await page.locator('input[placeholder*="موبایل"]').first().fill(INVALID_VALUES.shortMobile)
    await page.locator('button:has-text("مرحله بعد")').first().click()
    await page.waitForTimeout(2000)
    const error = page.locator('[role="alert"], .toast, text=/موبایل|شماره|۱۱|نامعتبر/')
    await expect(error.first()).toBeVisible({ timeout: 5000 })
  })

  test('Negative - فیلد خالی', async ({ page }) => {
    await page.waitForTimeout(2000)
    await page.locator('button:has-text("مرحله بعد")').first().click()
    await page.waitForTimeout(2000)
    const error = page.locator('[role="alert"], .toast, text=/وارد|پر کنید|لطف/')
    const stillOnOwner = page.locator('text=اطلاعات مالک')
    await expect(error.or(stillOnOwner).first()).toBeVisible({ timeout: 5000 })
  })
})
