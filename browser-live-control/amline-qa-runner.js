#!/usr/bin/env node
/**
 * QA Test Runner - املاین قرارداد رهن و اجاره
 * Connects to Chrome via CDP and runs comprehensive tests
 * Output: Structured report
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const BASE = 'https://app-dev.amline.ir';
const REPORT = [];

function log(msg, pass = null) {
  const s = pass === true ? '✓' : pass === false ? '✗' : '•';
  console.log(`${s} ${msg}`);
  REPORT.push({ msg, pass, time: new Date().toISOString() });
}

async function run() {
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch (e) {
    console.error('خطا: Chrome با CDP اجرا نشده. npm run start-chrome را اجرا کنید.');
    process.exit(1);
  }

  const ctx = browser.contexts()[0];
  const pages = ctx?.pages() || [];
  let page = pages[0];
  if (!page) {
    page = await ctx.newPage();
  }

  const results = { passed: 0, failed: 0, bugs: [] };

  try {
    // === 1. Navigate & Select Contract ===
    log('رفتن به صفحه اصلی');
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    log('کلیک روی قرارداد رهن و اجاره');
    const contractLink = page.locator('a[href*="contractnewflow"]').first();
    if (await contractLink.isVisible({ timeout: 5000 })) {
      await contractLink.click();
      await page.waitForLoadState('networkidle');
      log('ورود به فرآیند قرارداد', true);
    } else {
      log('لینک قرارداد یافت نشد', false);
      results.bugs.push({ id: 'NAV-1', title: 'لینک قرارداد رهن و اجاره یافت نشد' });
    }

    const url = page.url();
    if (!url.includes('contractnewflow')) {
      log('مسیر اشتباه: ' + url, false);
    }

    // === 2. Negative: Mobile validation (if on login page) ===
    const mobileInput = page.locator('input[type="tel"], input[inputmode="numeric"], input[placeholder*="موبایل"]').first();
    if (await mobileInput.isVisible({ timeout: 3000 })) {
      log('--- تست منفی: شماره موبایل کمتر از ۱۱ رقم ---');
      await mobileInput.fill('0912');
      const sendBtn = page.locator('button:has-text("ارسال"), button:has-text("ورود"), button[type="submit"]').first();
      await sendBtn.click();
      await page.waitForTimeout(3000);
      const otpVisible = await page.locator('[role="spinbutton"], input[placeholder*="*"]').first().isVisible().catch(() => false);
      if (otpVisible) {
        log('باگ: شماره ۴ رقمی به OTP رفت!', false);
        results.bugs.push({ id: 'NEG-1', title: 'پذیرش شماره موبایل کمتر از ۱۱ رقم', severity: 'زیاد' });
        results.failed++;
      } else {
        log('اعتبارسنجی صحیح: خطا نمایش داده شد', true);
        results.passed++;
      }
      await page.goto(BASE + '/contractnewflow', { waitUntil: 'networkidle' });
    }

    // === 3. Check current form (owner/tenant) ===
    const dump = await page.locator('input, button').evaluateAll(els =>
      els.slice(0, 15).map(e => ({
        tag: e.tagName,
        placeholder: e.placeholder?.slice(0, 25),
        text: e.textContent?.slice(0, 30),
      }))
    );
    log('فیلدهای صفحه: ' + JSON.stringify(dump.map(d => d.placeholder || d.text)).slice(0, 150));

    // === 4. Negative: Invalid national ID ===
    const nationalInput = page.locator('input[placeholder*="کدملی"], input[placeholder*="کد ملی"]').first();
    if (await nationalInput.isVisible({ timeout: 3000 })) {
      log('--- تست منفی: کد ملی با حروف ---');
      await nationalInput.fill('123456789a');
      const nextBtn = page.locator('button:has-text("مرحله بعد"), button:has-text("ادامه"), button[type="submit"]').first();
      await nextBtn.click();
      await page.waitForTimeout(2000);
      const err = await page.locator('[role="alert"], .error, [class*="error"], text=/کد ملی|نامعتبر|۱۰/').first().isVisible().catch(() => false);
      if (!err) {
        log('باگ: کد ملی با حروف پذیرفته شد', false);
        results.bugs.push({ id: 'NEG-2', title: 'عدم اعتبارسنجی کد ملی با حروف', severity: 'متوسط' });
        results.failed++;
      } else {
        log('اعتبارسنجی کد ملی صحیح', true);
        results.passed++;
      }
    }

    // === 5. Negative: Negative amount ===
    const rentInput = page.locator('input[placeholder*="اجاره"], input[name*="rent"]').first();
    if (await rentInput.isVisible({ timeout: 3000 })) {
      log('--- تست منفی: مبلغ اجاره منفی ---');
      await rentInput.fill('-1000000');
      const nextBtn = page.locator('button:has-text("مرحله بعد"), button:has-text("ادامه")').first();
      await nextBtn.click();
      await page.waitForTimeout(2000);
      const err = await page.locator('text=/مبلغ|منفی|نامعتبر/').first().isVisible().catch(() => false);
      if (!err) {
        log('باگ: مبلغ منفی پذیرفته شد', false);
        results.bugs.push({ id: 'NEG-3', title: 'پذیرش مبلغ اجاره منفی', severity: 'زیاد' });
        results.failed++;
      } else {
        log('اعتبارسنجی مبلغ صحیح', true);
        results.passed++;
      }
    }

    // === Summary ===
    log('--- خلاصه ---');
    log(`موفق: ${results.passed} | ناموفق: ${results.failed}`);
    log(`تعداد باگ: ${results.bugs.length}`);

  } catch (err) {
    log('خطا: ' + err.message, false);
  } finally {
    await browser.close();
  }

  // Write report
  const reportPath = 'e:\\CTO\\qa-amline-tests\\QA_REPORT_FULL.md';
  const reportContent = generateReport(results);
  writeFileSync(reportPath, reportContent, 'utf8');
  console.log('\nگزارش ذخیره شد: ' + reportPath);
}

function generateReport(results) {
  const now = new Date().toLocaleDateString('fa-IR');
  let md = `# گزارش جامع QA — املاین قرارداد رهن و اجاره\n\n`;
  md += `**تاریخ:** ${now}  \n`;
  md += `**منبع:** تست خودکار + مرورگر زنده (CDP)\n\n---\n\n`;
  md += `## Executive Summary\n\n`;
  md += `| معیار | مقدار |\n|-------|-------|\n`;
  md += `| تست موفق | ${results.passed} |\n`;
  md += `| تست ناموفق | ${results.failed} |\n`;
  md += `| باگ کشف‌شده | ${results.bugs?.length || 0} |\n\n`;
  md += `## باگ‌های کشف‌شده\n\n`;
  (results.bugs || []).forEach((b, i) => {
    md += `### ${i + 1}. ${b.title}\n`;
    md += `- **شناسه:** ${b.id}\n`;
    md += `- **شدت:** ${b.severity || 'متوسط'}\n\n`;
  });
  md += `---\n*تهیه‌شده توسط QA Runner*\n`;
  return md;
}

run();
