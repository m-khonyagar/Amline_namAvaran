#!/usr/bin/env node
/**
 * فرآیند کامل قرارداد رهن و اجاره — تمام راه‌های ممکن تا انعقاد
 * داده‌های فیک معتبر: کد ملی، شبا، کد پستی
 */
import { chromium } from 'playwright';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const BASE = 'https://app-dev.amline.ir';
const LOG = [];

// داده‌های فیک معتبر برای تست
const FAKE = {
  nationalIds: ['0499370899', '0684159415', '0076229645', '0013542419', '0012016467'],
  shebas: ['IR550560960180002284298001', 'IR580540105180021273113007', 'IR620540105180021273113007'],
  mobiles: ['09107709601', '09127463726', '09121234567'],
  postalCodes: ['1234567890', '9876543210', '1111111111'],
  billIds: ['1234567890', '9876543210'],
};

function log(msg, status = 'info') {
  const t = new Date().toLocaleTimeString('fa-IR');
  console.log(`[${t}] ${status === 'ok' ? '✓' : status === 'err' ? '✗' : '•'} ${msg}`);
  LOG.push({ time: t, msg, status });
}

async function dismissToast(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-sonner-toast], section[aria-label="Notifications"] li').forEach(el => {
      el.style.display = 'none';
    });
  }).catch(() => {});
  await page.waitForTimeout(300);
}

async function selectFromPicker(page, selectorOrLocator, values) {
  const vals = Array.isArray(values) ? values : [values];
  try {
    const loc = typeof selectorOrLocator === 'string' ? page.locator(selectorOrLocator).first() : selectorOrLocator;
    await loc.click();
    await page.waitForTimeout(500);
    for (const v of vals) {
      const option = page.locator(`[role="button"]:has-text("${v}"), .Select_bottom-sheet__option__fcHZO:has-text("${v}"), button:has-text("${v}")`).first();
      if (await option.isVisible({ timeout: 800 })) {
        await option.click();
        await page.waitForTimeout(300);
        return true;
      }
    }
    await page.keyboard.press('Escape');
  } catch {
    await page.keyboard.press('Escape').catch(() => {});
  }
  return false;
}

async function tryUrl(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    return true;
  } catch {
    return false;
  }
}

async function run() {
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch (e) {
    console.error('Chrome با CDP اجرا نشده. npm run start-chrome');
    process.exit(1);
  }

  const ctx = browser.contexts()[0];
  let page = ctx?.pages()?.[0];
  if (!page) page = await ctx.newPage();

  const wait = (ms) => page.waitForTimeout(ms);

  try {
    // راه ۱: تلاش با URLهای مختلف (test mode)
    const urls = [
      BASE + '/contractnewflow',
      BASE + '/contractnewflow?test=1',
      BASE + '/contractnewflow?debug=1',
      BASE + '/contractnewflow?mock=1',
    ];
    let loaded = false;
    for (const url of urls) {
      log('تلاش با: ' + url);
      if (await tryUrl(page, url)) {
        const hasForm = await page.locator('input[placeholder*="کدملی"], input[placeholder*="موبایل"]').first().isVisible({ timeout: 3000 }).catch(() => false);
        if (hasForm) {
          loaded = true;
          break;
        }
      }
    }
    if (!loaded) {
      await page.goto(BASE + '/contractnewflow', { waitUntil: 'networkidle', timeout: 25000 });
      await wait(2000);
    }

    const hasLogin = await page.locator('input[placeholder*="موبایل"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasOwnerForm = await page.locator('input[placeholder*="کدملی"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    if (hasLogin && !hasOwnerForm) {
      log('صفحه ورود - پر کردن موبایل');
      await page.locator('input[placeholder*="موبایل"]').first().fill(FAKE.mobiles[0]);
      await page.locator('text=موافقم').first().click().catch(() => {});
      await page.locator('button:has-text("ورود"), button:has-text("ارسال")').first().click();
      await wait(5000);
      log('⚠️ کد OTP را دستی وارد کنید و دوباره اسکریپت را اجرا کنید.');
      await browser.close();
      return;
    }

    // ========== مرحله ۱: اطلاعات مالک — داده معتبر ==========
    log('--- مرحله ۱: اطلاعات مالک (داده فیک معتبر) ---');
    await page.locator('input[placeholder*="کدملی"]').first().fill(FAKE.nationalIds[0]);
    await page.locator('input[placeholder*="شماره موبایل"]').first().fill(FAKE.mobiles[0]);
    await selectFromPicker(page, 'input[placeholder="روز"]', ['15']);
    await selectFromPicker(page, 'input[placeholder="ماه"]', ['6', '۶', 'خرداد']);
    await selectFromPicker(page, 'input[placeholder="سال"]', ['1370']);
    await page.locator('input[placeholder*="شبا"]').first().fill(FAKE.shebas[0]);
    await page.locator('input[placeholder*="کدپستی"]').first().fill(FAKE.postalCodes[0]);
    await page.locator('input[placeholder*="شناسه قبض"]').first().fill(FAKE.billIds[0]);
    await wait(800);

    log('کلیک «ثبت اطلاعات مالک در قرارداد»');
    await page.locator('button:has-text("ثبت اطلاعات مالک")').first().click();
    await wait(4000);
    await dismissToast(page);

    log('کلیک «مرحله بعد»');
    await page.locator('button:has-text("مرحله بعد")').first().click({ force: true });
    await wait(3000);
    await dismissToast(page);

    // ========== مرحله ۲: اطلاعات مستاجر — داده معتبر ==========
    log('--- مرحله ۲: اطلاعات مستاجر ---');
    const tenantKdMeli = page.locator('input[placeholder*="کدملی"], input[placeholder*="کد ملی"]').first();
    if (await tenantKdMeli.isVisible({ timeout: 5000 })) {
      await tenantKdMeli.fill(FAKE.nationalIds[1]);
      await page.locator('input[placeholder*="شماره موبایل"]').first().fill(FAKE.mobiles[1]);
      await selectFromPicker(page, 'input[placeholder="روز"]', ['20']);
      await selectFromPicker(page, 'input[placeholder="ماه"]', ['3', '۳', 'فروردین']);
      await selectFromPicker(page, 'input[placeholder="سال"]', ['1372']);
      const tenantSheba = page.locator('input[placeholder*="شبا"]').first();
      if (await tenantSheba.isVisible({ timeout: 2000 })) await tenantSheba.fill(FAKE.shebas[1]);
      const tenantPostal = page.locator('input[placeholder*="کدپستی"]').first();
      if (await tenantPostal.isVisible({ timeout: 2000 })) await tenantPostal.fill(FAKE.postalCodes[1]);
      const tenantBill = page.locator('input[placeholder*="شناسه قبض"]').first();
      if (await tenantBill.isVisible({ timeout: 2000 })) await tenantBill.fill(FAKE.billIds[1]);
      const tenantCount = page.locator('input[placeholder*="تعداد مستاجران"]').first();
      if (await tenantCount.isVisible({ timeout: 2000 })) await tenantCount.fill('1');
      await wait(800);

      const registerTenant = page.locator('button:has-text("ثبت اطلاعات مستاجر"), button:has-text("ثبت")').first();
      if (await registerTenant.isVisible({ timeout: 2000 })) {
        log('کلیک «ثبت اطلاعات مستاجر»');
        await registerTenant.click();
        await wait(3500);
      }
      await dismissToast(page);
      log('کلیک «مرحله بعد»');
      await page.locator('button:has-text("مرحله بعد")').first().click({ force: true });
      await wait(3000);
    }

    // ========== مرحله ۳: اطلاعات ملک ==========
    log('--- مرحله ۳: اطلاعات ملک ---');
    const address = page.locator('input[placeholder*="آدرس"], textarea[placeholder*="آدرس"]').first();
    if (await address.isVisible({ timeout: 5000 })) {
      await address.fill('تهران، منطقه ۱، خیابان ولیعصر، پلاک ۱۰');
      await page.locator('input[placeholder*="کدپستی"], input[placeholder*="کد پستی"]').first().fill(FAKE.postalCodes[0]);
      await page.locator('input[placeholder*="متراژ"], input[placeholder*="متر"], input[placeholder*="مساحت"]').first().fill('85');
      const billProp = page.locator('input[placeholder*="شناسه قبض"]').first();
      if (await billProp.isVisible({ timeout: 2000 })) await billProp.fill(FAKE.billIds[0]);
      await wait(500);
      await dismissToast(page);
      await page.locator('button:has-text("مرحله بعد")').first().click({ force: true });
      await wait(3000);
    }

    // ========== مرحله ۴: مبالغ و تاریخ‌ها ==========
    log('--- مرحله ۴: مبالغ و تاریخ‌ها ---');
    const rent = page.locator('input[placeholder*="اجاره"]').first();
    if (await rent.isVisible({ timeout: 5000 })) {
      await rent.fill('50000000');
      await page.locator('input[placeholder*="ودیعه"]').first().fill('150000000');
      const startDate = page.locator('input[placeholder*="شروع"], input[placeholder*="تاریخ"]').first();
      if (await startDate.isVisible({ timeout: 2000 })) {
        await startDate.click();
        await wait(400);
        await page.locator('[role="button"]:has-text("15"), .Select_bottom-sheet__option__fcHZO:has-text("15")').first().click().catch(() => {});
        await wait(250);
        await page.locator('[role="button"]:has-text("1"), .Select_bottom-sheet__option__fcHZO:has-text("۱"), [role="button"]:has-text("فروردین")').first().click().catch(() => {});
        await wait(250);
        await page.locator('[role="button"]:has-text("1403")').first().click().catch(() => {});
      }
      const endDate = page.locator('input[placeholder*="پایان"]').first();
      if (await endDate.isVisible({ timeout: 2000 })) {
        await endDate.click();
        await wait(400);
        await page.locator('[role="button"]:has-text("15")').first().click().catch(() => {});
        await wait(250);
        await page.locator('[role="button"]:has-text("1"), [role="button"]:has-text("۱۴۰۴"), [role="button"]:has-text("1404")').first().click().catch(() => {});
      }
      await wait(800);
      await dismissToast(page);
      await page.locator('button:has-text("مرحله بعد")').first().click({ force: true });
      await wait(3000);
    }

    // ========== مراحل ۵ تا ۲۰ — تکمیل همه با داده فیک + retry ==========
    let lastStepHash = '';
    let sameStepCount = 0;
    for (let step = 5; step <= 20; step++) {
      log(`--- مرحله ${step} ---`);
      await dismissToast(page);

      const submitFinal = page.locator('button:has-text("ثبت نهایی"), button:has-text("انعقاد"), button:has-text("تأیید نهایی"), button:has-text("امضا"), button:has-text("پرداخت"), button:has-text("ثبت و پرداخت")').first();
      if (await submitFinal.isVisible({ timeout: 2000 })) {
        log('کلیک انعقاد/ثبت نهایی', 'ok');
        await submitFinal.click();
        await wait(6000);
        const success = await page.locator('text=/موفق|انعقاد|ثبت شد|تأیید|پرداخت/').first().isVisible({ timeout: 5000 }).catch(() => false);
        if (success) {
          log('✓ انعقاد موفق مشاهده شد', 'ok');
          break;
        }
      }

      // پر کردن همه فیلدها با داده فیک
      const inputs = await page.locator('input:not([type="hidden"]):not([type="radio"]), textarea').all();
      for (const inp of inputs) {
        try {
          const ph = (await inp.getAttribute('placeholder') || '').toLowerCase();
          const name = (await inp.getAttribute('name') || '').toLowerCase();
          const val = await inp.inputValue();
          if (!val || ph.includes('وارد') || ph.includes('کد') || ph.includes('شماره') || ph.includes('آدرس') || ph.includes('تعداد') || name) {
            if (ph.includes('موبایل') || name.includes('mobile')) await inp.fill(FAKE.mobiles[2]);
            else if (ph.includes('آدرس')) await inp.fill('تهران، خیابان ولیعصر، پلاک ۱۰');
            else if (ph.includes('تعداد مستاجران')) await inp.fill('1');
            else if (ph.includes('شبا')) await inp.fill(FAKE.shebas[0]);
            else if (ph.includes('کدملی') || ph.includes('کد ملی')) await inp.fill(FAKE.nationalIds[step % FAKE.nationalIds.length]);
            else if (ph.includes('مساحت') || ph.includes('متراژ') || ph.includes('متر')) await inp.fill('85');
            else await inp.fill(FAKE.postalCodes[0]);
            await wait(100);
          }
        } catch {}
      }

      const dayInputs = page.locator('input[placeholder="روز"]');
      const dayCount = await dayInputs.count();
      for (let i = 0; i < Math.min(dayCount, 3); i++) {
        await selectFromPicker(page, dayInputs.nth(i), ['15', '1', '10']);
        await selectFromPicker(page, page.locator('input[placeholder="ماه"]').nth(i), ['6', '۶', '1', '۱', 'فروردین', 'خرداد']);
        await selectFromPicker(page, page.locator('input[placeholder="سال"]').nth(i), ['1400', '1380', '1370']);
      }

      const countInput = page.locator('input[placeholder*="تعداد مستاجران"]').first();
      if (await countInput.isVisible({ timeout: 1000 })) {
        await countInput.fill('1');
        await wait(400);
      }
      const fileInputs = await page.locator('input[type="file"]').all();
      const testImg = join(process.cwd(), 'test-doc.png');
      if (existsSync(testImg)) {
        for (const fi of fileInputs) {
          try {
            await fi.setInputFiles(testImg);
            await wait(2500);
            log('آپلود تصویر', 'ok');
          } catch {}
        }
      }
      const registerTenantInLoop = page.locator('button:has-text("ثبت اطلاعات مستاجر")').first();
      if (await registerTenantInLoop.isVisible({ timeout: 1500 })) {
        await registerTenantInLoop.click();
        await wait(3500);
        await dismissToast(page);
      }

      const stepHash = page.url() + (await page.locator('h1, h2, [role="heading"]').first().textContent().catch(() => ''));
      if (stepHash === lastStepHash) {
        sameStepCount++;
        if (sameStepCount >= 2) {
          const finalBtn = page.locator('button:has-text("ثبت نهایی"), button:has-text("انعقاد"), button:has-text("تأیید"), button:has-text("پرداخت")').first();
          if (await finalBtn.isVisible({ timeout: 1000 })) {
            log('دکمه انعقاد یافت شد - کلیک');
            await finalBtn.click({ force: true });
            await wait(5000);
            break;
          }
          log('چرخه - کلیک مرحله بعد با force');
          await page.locator('button:has-text("مرحله بعد")').first().click({ force: true, noWaitAfter: true }).catch(() => {});
          await wait(1500);
          sameStepCount = 0;
        }
      } else {
        sameStepCount = 0;
      }
      lastStepHash = stepHash;

      await page.screenshot({ path: `e:\\CTO\\browser-live-control\\screenshots\\step${step}.png` }).catch(() => {});

      const nextBtn = page.locator('button:has-text("مرحله بعد"), button:has-text("ادامه"), button:has-text("بعدی")').first();
      if (await nextBtn.isVisible({ timeout: 3000 })) {
        await nextBtn.click({ force: true });
        await wait(2500);
      } else {
        const anyBtn = page.locator('button').filter({ hasText: /ثبت|ادامه|بعد|تأیید|پرداخت/ }).first();
        if (await anyBtn.isVisible({ timeout: 2000 })) {
          await anyBtn.click({ force: true });
          await wait(3000);
        } else {
          log('دکمه بعدی یافت نشد - بررسی مجدد');
          await wait(2000);
          const retryNext = page.locator('button').filter({ hasText: /مرحله|بعد|ادامه/ }).first();
          if (await retryNext.isVisible({ timeout: 2000 })) {
            await retryNext.click({ force: true });
            await wait(3000);
          } else {
            break;
          }
        }
      }
    }

    await wait(4000);
    await page.screenshot({ path: 'e:\\CTO\\browser-live-control\\screenshots\\final.png' }).catch(() => {});

    const finalUrl = page.url();
    const finalTitle = await page.title();
    const hasSuccess = await page.locator('text=/موفق|انعقاد|ثبت شد|تأیید|پرداخت|قرارداد/').first().isVisible({ timeout: 3000 }).catch(() => false);
    log('URL نهایی: ' + finalUrl, 'ok');
    log('عنوان: ' + finalTitle, 'ok');
    if (hasSuccess) log('✓ انعقاد/موفقیت مشاهده شد', 'ok');
    else log('وضعیت نهایی بررسی شد', 'info');

  } catch (err) {
    log('خطا: ' + err.message, 'err');
    await page.screenshot({ path: 'e:\\CTO\\browser-live-control\\screenshots\\error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }

  writeFileSync('e:\\CTO\\browser-live-control\\flow-log.json', JSON.stringify(LOG, null, 2));
  console.log('\nلاگ: flow-log.json');
}

run();
