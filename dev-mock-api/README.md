# Amline Dev Mock API

سرویس سبک FastAPI برای توسعهٔ محلی وقتی پوشهٔ `backend/backend` در دسترس نیست. رفتار آن با MSW در `admin-ui` هم‌راستا است و **هر دو نوع قرارداد `PROPERTY_RENT` و `BUYING_AND_SELLING`** را در `POST /contracts/start` می‌پذیرد.

## اجرا

سریع (Windows، venv و وابستگی را خودش می‌سازد):

```powershell
cd dev-mock-api
.\run.ps1
```

دستی:

```powershell
cd dev-mock-api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

سپس `http://127.0.0.1:8080/health` باید `{"status":"ok"}` برگرداند.

## ورود پنل ادمین و کاربر (`admin-ui` / `amline-ui` روی mock)

- **موبایل:** `09100000000`
- **کد OTP:** `11111`  
پاسخ `POST /admin/otp/send` برای همین شماره فیلد **`dev_code`** را هم برابر `11111` می‌دهد. هر ترکیب دیگری برای `/admin/login` رد می‌شود.

## نقشهٔ endpointهای سازمانی (قرارداد با admin-ui)

| متد | مسیر | توضیح |
|-----|------|--------|
| GET | `/auth/me` | کاربر جاری؛ `permissions` بر اساس `role_id` از نقش‌ها |
| GET | `/admin/roles` | لیست نقش‌ها با `permissions` |
| POST | `/admin/roles` | ایجاد نقش (بدنه: `name`, `description?`, `permissions`) |
| PATCH | `/admin/roles/{role_id}` | به‌روزرسانی نام/توضیح/مجوزها |
| POST | `/admin/audit` | ثبت رویداد (`action`, `entity`, `metadata?`, `user_id?`) |
| GET | `/admin/audit` | لیست با `skip` / `limit` |
| POST | `/admin/auth/heartbeat` | ضربان (mock، بدون اثر پایدار) |
| GET | `/admin/staff/activity` | تجمیع رویداد به ازای کاربر و روز؛ فیلتر `from_date`, `to_date`, `user_id` |
| GET | `/admin/sessions` | نشست‌های اخیر (پس از login) |
| GET | `/admin/metrics/summary` | شمارنده‌های KPI (قراردادها، کاربران، لید، ممیزی، …) |
| GET | `/admin/notifications` | اعلان‌های درون‌حافظه |
| GET | `/admin/crm/leads` | لیست لیدهای CRM |
| POST | `/admin/crm/leads` | ایجاد لید جدید |
| GET | `/admin/crm/leads/{id}` | جزئیات لید |
| PATCH | `/admin/crm/leads/{id}` | ویرایش لید (status، notes، …) |
| GET | `/admin/crm/leads/{id}/activities` | فعالیت‌های لید |
| POST | `/admin/crm/leads/{id}/activities` | ثبت فعالیت جدید |

## پنل مشاور (`consultant-ui`)

هم‌راستا با MSW در `admin-ui`؛ برای ورود نمونه موبایل **`09121112233`** را بزنید (کاربر `cons-demo-001` از قبل در حافظهٔ mock ثبت شده است).

| متد | مسیر | توضیح |
|-----|------|--------|
| POST | `/consultant/auth/login` | بدنه: `{ "mobile": "09..." }` → `access_token`, `user` |
| POST | `/consultant/auth/register` | ثبت‌نام + ایجاد پروندهٔ `SUBMITTED` |
| GET | `/consultant/me` | هدر `Authorization: Bearer mock-consultant-{id}` |
| GET | `/consultant/application` | پروندهٔ نظام یا `null` |
| GET | `/consultant/dashboard/summary` | پروفایل، مزایا، گام‌های بعدی |
| GET | `/consultant/leads` | `{ items, total }` |

## اتصال فرانت‌اند

**admin-ui** (بدون MSW):

- در `.env.local`: `VITE_USE_MSW=false` و `VITE_DEV_PROXY_TARGET=http://127.0.0.1:8080` (یا `VITE_API_URL=http://127.0.0.1:8080` اگر مستقیم می‌زنید).

**amline-ui**:

- در `.env.local`: `NEXT_PUBLIC_DEV_PROXY_TARGET=http://127.0.0.1:8080`

**consultant-ui**:

- در `.env.local`: `VITE_USE_MSW=false` و `VITE_DEV_PROXY_TARGET=http://127.0.0.1:8080` تا به‌جای MSW از **همین** mock استفاده شود.

## تست E2E (amline-ui + Playwright)

پروژه `amline-ui` با [`playwright.config.ts`](../amline-ui/playwright.config.ts) خودش `dev-mock-api` را روی 8080 و سرور Next را بالا می‌آورد و سناریوی کاربر را اجرا می‌کند.

پیش‌نیاز: `pip install -r requirements.txt` یک‌بار در پوشه `dev-mock-api`؛ روی ویندوز اگر دانلود مرورگر Playwright ممکن نبود، از **Google Chrome** نصب‌شده استفاده می‌شود (`channel: 'chrome'`). برای اجبار به Chromium باندل‌شده: `PW_USE_BUNDLED_CHROMIUM=1` و سپس `npx playwright install chromium`.

```powershell
cd amline-ui
npm install
npm run test:e2e
```

## تست خودکار (pytest)

```powershell
cd dev-mock-api
pip install -r requirements-dev.txt
python -m pytest tests/test_smoke.py -v
```

مسیرهای توسعه‌یافتهٔ ادمین (`mock_extended.py`) و `state.py` (ذخیرهٔ مشترک workspace/کاربر) با این تست‌ها smoke می‌شوند.

## محدودیت

این API فقط برای توسعه است؛ داده در حافظه است و با ری‌استارت سرور پاک می‌شود.
