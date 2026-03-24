# کنترل زنده مرورگر Chrome

اتصال به کروم شما و اجرای دستورات از طریق Playwright و Chrome DevTools Protocol (CDP).

## راه‌اندازی

### ۱. نصب وابستگی‌ها
```bash
cd browser-live-control
npm install
```

### ۲. اجرای Chrome با حالت دیباگ
**مهم:** ابتدا همه پنجره‌های Chrome را ببندید، سپس:

```powershell
npm run start-chrome
```

یا دستی:
```powershell
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

### ۳. ارسال دستورات
هر بار که فرمانی می‌خواهید، یکی از دستورات زیر را اجرا کنید:

| دستور | مثال |
|-------|------|
| رفتن به آدرس | `node run-command.js goto https://google.com` |
| کلیک | `node run-command.js click "button#submit"` |
| تایپ | `node run-command.js type "#search" "متن"` |
| فشردن کلید | `node run-command.js press Enter` |
| اسکرین‌شات | `node run-command.js screenshot` |
| انتظار | `node run-command.js wait 2000` |
| اطلاعات صفحه | `node run-command.js info` |

## استفاده با Cursor/Codex

بعد از اجرای Chrome با `npm run start-chrome`، می‌توانید به من بگویید:
- «برو به google.com»
- «کلیک کن روی دکمه لاگین»
- «تایپ کن در باکس جستجو: سلام»

و من دستورات مربوطه را برایتان اجرا می‌کنم.
