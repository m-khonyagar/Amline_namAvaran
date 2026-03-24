#!/usr/bin/env node
/**
 * Live Browser Control - Execute commands on your Chrome via CDP
 * 
 * Usage:
 *   node run-command.js goto <url>
 *   node run-command.js click <selector>
 *   node run-command.js type <selector> <text>
 *   node run-command.js screenshot [path]
 *   node run-command.js press <key>
 *   node run-command.js wait <ms>
 *   node run-command.js info
 */

import { chromium } from 'playwright';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';

async function run() {
  const [cmd, ...args] = process.argv.slice(2);
  
  if (!cmd) {
    console.log(`
Live Browser Control - دستورات:
  goto <url>        → رفتن به آدرس
  click <selector>  → کلیک روی المنت
  type <selector> <text> → تایپ در المنت
  press <key>       → فشردن کلید (Enter, Tab, ...)
  screenshot [path] → عکس از صفحه
  wait <ms>         → انتظار (میلی‌ثانیه)
  info              → اطلاعات صفحه فعلی

مثال:
  node run-command.js goto https://google.com
  node run-command.js click "button[type=submit]"
  node run-command.js type "#search" "سلام"
  node run-command.js press Enter
`);
    process.exit(0);
    return;
  }

  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch (e) {
    console.error('خطا: نمی‌توان به Chrome متصل شد.');
    console.error('جزئیات:', e.message);
    console.error('');
    console.error('آیا Chrome با دستور زیر اجرا شده؟');
    console.error('  npm run start-chrome');
    console.error('یا: chrome.exe --remote-debugging-port=9222');
    process.exit(1);
  }

  const defaultContext = browser.contexts()[0];
  const pages = defaultContext?.pages() || [];
  const page = pages[0];

  if (!page) {
    console.error('خطا: هیچ تب/صفحه‌ای باز نیست. یک تب در Chrome باز کنید.');
    await browser.close();
    process.exit(1);
  }

  try {
    switch (cmd.toLowerCase()) {
      case 'goto':
      case 'go':
      case 'navigate': {
        const url = args[0] || 'about:blank';
        await page.goto(url.startsWith('http') ? url : `https://${url}`);
        console.log('✓ رفت به:', page.url());
        break;
      }
      case 'click': {
        const selector = args[0];
        if (!selector) {
          console.error('استفاده: click <selector>');
          break;
        }
        await page.click(selector, { timeout: 10000 });
        console.log('✓ کلیک روی:', selector);
        break;
      }
      case 'type': {
        const [selector, ...textParts] = args;
        const text = textParts.join(' ');
        if (!selector || text === undefined) {
          console.error('استفاده: type <selector> <متن>');
          break;
        }
        try {
          await page.fill(selector, text, { timeout: 5000 });
        } catch (e) {
          if (e.message?.includes('not editable')) {
            await page.locator(selector).first().evaluate((el, v) => {
              el.value = v;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }, text);
          } else throw e;
        }
        console.log('✓ تایپ در:', selector);
        break;
      }
      case 'press': {
        const key = args[0] || 'Enter';
        await page.keyboard.press(key);
        console.log('✓ فشردن:', key);
        break;
      }
      case 'screenshot': {
        const path = args[0] || `screenshot-${Date.now()}.png`;
        await page.screenshot({ path });
        console.log('✓ ذخیره شد:', path);
        break;
      }
      case 'wait': {
        const ms = parseInt(args[0] || '1000', 10);
        await new Promise(r => setTimeout(r, ms));
        console.log('✓ انتظار', ms, 'ms');
        break;
      }
      case 'info': {
        console.log('URL:', page.url());
        console.log('عنوان:', await page.title());
        break;
      }
      case 'toast': {
        const texts = await page.locator('[data-sonner-toast], [role="alert"], .toast').evaluateAll(els =>
          els.map(e => e.textContent?.trim()).filter(Boolean)
        );
        console.log('Toast/Alerts:', texts.length ? texts : 'هیچ');
        break;
      }
      case 'step': {
        const labels = await page.locator('[class*="step"], [class*="stepper"], [data-step]').evaluateAll(els =>
          els.slice(0, 10).map(e => ({ text: e.textContent?.slice(0, 50), class: e.className?.slice(0, 80) }))
        );
        const headings = await page.locator('h1, h2, h3, [role="heading"]').evaluateAll(els =>
          els.map(e => e.textContent?.trim()).filter(Boolean)
        );
        console.log('Headings:', headings);
        console.log('Step labels:', labels);
        break;
      }
      case 'dump': {
        const html = await page.content();
        const buttons = await page.locator('button, [role="button"], input[type="submit"]').evaluateAll(els =>
          els.map(e => ({ tag: e.tagName, text: e.textContent?.slice(0, 50), disabled: e.disabled, type: e.type }))
        );
        const inputs = await page.locator('input, textarea').evaluateAll(els =>
          els.map(e => ({ tag: e.tagName, name: e.name, type: e.type, placeholder: e.placeholder?.slice(0, 30) }))
        );
        console.log('Buttons:', JSON.stringify(buttons, null, 2));
        console.log('Inputs:', JSON.stringify(inputs, null, 2));
        break;
      }
      default:
        console.error('دستور نامعتبر:', cmd);
    }
  } catch (err) {
    console.error('خطا:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
