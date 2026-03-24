/**
 * تست Happy Path - فرآیند ایجاد قرارداد با داده صحیح
 * پیش‌نیاز: ورود موفق (یا skip اگر نیاز به auth دارد)
 */
import { test, expect } from '@playwright/test'
import { TEST_USERS, VALID_CONTRACT_DATA } from './fixtures'

const BASE_URL = process.env.BASE_URL || 'http://app-dev.amline.ir'

test.describe('Happy Path - ایجاد قرارداد', () => {
  test('ورود و دسترسی به فرآیند قرارداد', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    // اگر صفحه login است، ابتدا وارد شو
    const mobileInput = page.locator('input[type="tel"], input[placeholder*="09"]').first()
    if (await mobileInput.isVisible()) {
      await mobileInput.fill(TEST_USERS.owner)
      await page.locator('button:has-text("ارسال"), button[type="submit"]').first().click()
      await page.locator('input[placeholder*="*"], input[name="otp"]').first().waitFor({ state: 'visible', timeout: 10000 })
      await page.pause() // ورود OTP کاربر
    }
    
    // جستجوی لینک/دکمه ایجاد قرارداد
    const createLink = page.locator('a:has-text("قرارداد"), a:has-text("ایجاد"), button:has-text("قرارداد"), a[href*="contract"]').first()
    if (await createLink.isVisible()) {
      await createLink.click()
      await expect(page).not.toHaveURL(BASE_URL + '/')
    }
  })

  test('پر کردن فرم مالک با داده صحیح', async ({ page }) => {
    await page.goto(BASE_URL + '/contract/create')
    await page.waitForLoadState('networkidle')
    
    const fullNameInput = page.locator('input[name="full_name"], input[placeholder*="نام"], input[id*="name"]').first()
    if (await fullNameInput.isVisible()) {
      await fullNameInput.fill(VALID_CONTRACT_DATA.fullName)
      await page.locator('input[name="national_id"], input[placeholder*="کد ملی"]').first().fill(VALID_CONTRACT_DATA.nationalId)
      await page.locator('input[name="mobile"], input[type="tel"]').first().fill(TEST_USERS.owner)
      
      const nextBtn = page.locator('button:has-text("بعدی"), button:has-text("ادامه"), button[type="submit"]').first()
      await nextBtn.click()
      
      await expect(page.locator('text=/مالک|موجر|اطلاعات/')).toBeVisible({ timeout: 5000 })
    }
  })

  test('پر کردن فرم مستاجر با داده صحیح', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    const tenantInput = page.locator('input[name="full_name"], input[placeholder*="نام"]').first()
    if (await tenantInput.isVisible()) {
      await tenantInput.fill(VALID_CONTRACT_DATA.fullName)
      await page.locator('input[name="national_id"]').first().fill(VALID_CONTRACT_DATA.nationalId)
      await page.locator('input[name="mobile"], input[type="tel"]').nth(1).fill(TEST_USERS.tenant)
    }
  })

  test('پر کردن اطلاعات ملک', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    const addressInput = page.locator('input[name="address"], input[placeholder*="آدرس"], textarea').first()
    if (await addressInput.isVisible()) {
      await addressInput.fill(VALID_CONTRACT_DATA.propertyAddress)
      await page.locator('input[name="postal_code"], input[placeholder*="کد پستی"]').first().fill(VALID_CONTRACT_DATA.postalCode)
      await page.locator('input[name="area"], input[placeholder*="متراژ"]').first().fill(VALID_CONTRACT_DATA.area)
    }
  })

  test('پر کردن مبالغ و تاریخ‌ها', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    const rentInput = page.locator('input[name="monthly_rent"], input[placeholder*="اجاره"]').first()
    if (await rentInput.isVisible()) {
      await rentInput.fill(VALID_CONTRACT_DATA.monthlyRent)
      await page.locator('input[name="deposit"], input[placeholder*="ودیعه"]').first().fill(VALID_CONTRACT_DATA.deposit)
      await page.locator('input[name="start_date"], input[placeholder*="شروع"]').first().fill(VALID_CONTRACT_DATA.startDate)
      await page.locator('input[name="end_date"], input[placeholder*="پایان"]').first().fill(VALID_CONTRACT_DATA.endDate)
    }
  })
})
