# توسعهٔ محلی — پنل کاربر و Mock API

مرجع متغیرهای محیطی (همهٔ اپ‌ها): [`ENV_MATRIX.md`](./ENV_MATRIX.md).

## سریع‌ترین مسیر (Windows)

### پنل ادمین + mock (برای تست سریع در مرورگر)

از ریشهٔ ریپو (اگر روی `:8080` قبلاً mock ندارید، خودش یک پنجره باز می‌کند):

```powershell
npm run local:admin
```

سپس: **http://localhost:3002/login** — ورود آزمایشی از دکمهٔ «ورود آزمایشی» با `admin-ui/.env.development`؛ یا OTP جادویی mock با شمارهٔ پیش‌فرض و کد زیر.

### همهٔ فرانت‌ها + mock (پیش‌نمایش کامل)

از ریشهٔ ریپو (پورت‌های ۸۰۸۰ و ۳۰۰۰–۳۰۰۵ را آزاد می‌کند و چند پنجرهٴ PowerShell باز می‌کند):

```powershell
npm run local:preview
```

در اولین اجرا در صورت نبودن فایل، **`amline-ui/.env.local`** و **`consultant-ui/.env.local`** برای اتصال به mock و (برای اپ کاربر) ورود آزمایشی ساخته می‌شوند.

### پنل کاربر (Next) + mock — فقط اپ و mock

از ریشهٔ ریپو:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-user-stack.ps1
```

این اسکریپت در صورت آزاد بودن پورت‌ها، **dev-mock-api** را روی `127.0.0.1:8080` و **amline-ui** را روی `http://localhost:3000` بالا می‌آورد (در پنجره‌های جدا).

سپس در مرورگر: **http://localhost:3000**

### ورود یکدست (mock و backend dev/staging)

- **موبایل (پیش‌فرض dev-mock-api):** `09107709601` (یا مقدار `AMLINE_OTP_MAGIC_MOBILE`)
- **کد OTP:** `11111`  
روی **dev-mock-api** فقط همین جفت «جادویی» پذیرفته می‌شود (مگر `AMLINE_OTP_MAGIC_ENABLED=0`). روی **backend** واقعی این OTP برای همان شماره در `env` های `dev` و `staging` فعال است؛ در `production` فقط اگر `AMLINE_FIXED_TEST_OTP_ENABLED=true` بگذارید.

## دستی

1. **Mock API** (پایتون با وابستگی‌های نصب‌شده):

   ```powershell
   cd dev-mock-api
   .\run.ps1
   ```

   یا اگر ساخت venv به‌خاطر شبکه/PyPI خطا داد، از همان نسخهٔ پایتونی که `fastapi` و `uvicorn` دارد:

   ```powershell
   cd dev-mock-api
   python -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload
   ```

2. **`amline-ui`** (ترمینال دوم):

   ```powershell
   cd amline-ui
   copy .env.example .env.local   # یک بار
   npm install
   npm run dev
   ```

3. فایل **`.env.local`** باید حداقل شامل باشد:

   - `NEXT_PUBLIC_DEV_PROXY_TARGET=http://127.0.0.1:8080`
   - برای تست **ورود آزمایشی** در dev: `NEXT_PUBLIC_ENABLE_DEV_BYPASS=true`

## پورت اشغال

- **۳۰۰۰**: برنامهٔ دیگری Next را ببندید یا `npx next dev -p 3001` بزنید.
- **۸۰۸۰**: فرایند قبلی mock را متوقف کنید یا پورت mock را عوض کنید و همان را در `.env.local` بنویسید.

## تست E2E (Playwright)

یک بار مرورگرها را نصب کنید:

```powershell
cd amline-ui
npx playwright install chromium
```

سپس:

```powershell
npm run test:e2e
```

Playwright خودش mock را روی ۸۰۸۰ و dev سرور را روی ۳۰۰۰ بالا می‌آورد (مگر `reuseExistingServer` در حالت غیر CI).

در CI برای مرورگر bundleشده: `PW_USE_BUNDLED_CHROMIUM=1`.

## بررسی یکپارچگی پشته

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-stack.ps1
```
