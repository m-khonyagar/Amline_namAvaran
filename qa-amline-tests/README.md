# QA Tests - اپلیکیشن قرارداد رهن و اجاره املاین

## نصب و اجرا

```bash
cd qa-amline-tests
npm install
npx playwright install chromium
```

## اجرای تست‌ها

```bash
# همه تست‌ها
npm test

# با نمایش مرورگر
npm run test:headed

# فقط تست OTP (با توقف برای ورود دستی)
npm run test:otp

# تست‌های منفی
npm run test:negative

# تست‌های منطقی
npm run test:logical

# تست UX
npm run test:ux
```

## تست با OTP

### روش ۱: توقف دستی
در `01-login-otp.spec.ts` تست «OTP - نمایش صفحه ورود و ارسال کد برای مالک» پس از ارسال کد متوقف می‌شود:
1. کد OTP را وارد کنید
2. دکمه ورود را بزنید
3. در Playwright Inspector روی Resume کلیک کنید

### روش ۲: فرآیند کامل با OTP از محیط
برای اجرای خودکار فرآیند قرارداد (از مرحله مالک تا پایان):

```powershell
$env:OTP_CODE="12345"; npx playwright test tests/06-contract-flow-full.spec.ts tests/07-owner-step-from-current.spec.ts --headed
```

یا با اسکریپت:
```powershell
.\run-contract-flow.ps1 -OtpCode "کد_دریافتی"
```

کد OTP را بلافاصله پس از دریافت جایگزین کنید.

## متغیر محیطی

```bash
BASE_URL=http://localhost:3000 npm test
BASE_URL=http://app-dev.amline.ir npm test
```

## نقش‌های تست

| نقش | شماره |
|-----|------|
| مالک | 09107709601 |
| مستاجر | 09127463726 |
| تنظیم‌کننده | 09121234567 |
