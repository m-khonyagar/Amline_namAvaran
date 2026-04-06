# چک‌لیست استقرار (Production)

قبل از انتشار `amline-ui`، `admin-ui` یا بک‌اند واقعی این موارد را بررسی کنید.

## امنیت

| مورد | الزام |
|------|--------|
| `NEXT_PUBLIC_ENABLE_DEV_BYPASS` | در build پروداکشن **حتماً حذف شود یا `false`**. فقط در `NODE_ENV=development` و با مقدار صریح `true` فعال است؛ با این حال در CI و env سرور آن را ست نکنید. |
| JWT / کلیدها | فقط از secret manager یا متغیرهای محیط سرور؛ هرگز در ریپو commit نشود. |
| CORS / Cookie | `Secure`, `SameSite` و دامنهٔ کوکی برای HTTPS تنظیم شود. |

## پنل کاربر (`amline-ui`)

- **`NEXT_PUBLIC_API_BASE_URL`** یا **`NEXT_PUBLIC_DEV_PROXY_TARGET`**: URL پایهٔ API **بدون** اسلش انتهایی، همان hostای که مرورگر کاربر به آن درخواست می‌زند (یا همان سرویس داخلی در Docker که Next به آن rewrite می‌کند).
- در **Docker** با `next.config.js` فعلی، اگر متغیر ست نشود مقدار پیش‌فرض `http://backend:8000` برای rewrite استفاده می‌شود — در compose باید نام سرویس با این مقدار هم‌خوان باشد.
- پس از deploy، مسیرهای زیر را دستی تست کنید: `/login` → `/contracts` → `/contracts/wizard` → یک قرارداد نمونه.

## هم‌خوانی API با فرانت

- `GET /contracts/list`: آرایه یا `{ items }`؛ هر آیتم شامل `id`, `type`, `status`, `step`, `party_type`, `parties`, `created_at` (طبق `_out` در `contract_wizard.py`).
- `GET /contracts/{id}`: سازگار با صفحهٔ جزئیات (`parties`, `tracking_code`, `pdf_file` در صورت وجود).

## بک‌اند

- Migrationها روی دیتابیس staging اجرا شده باشند (`alembic upgrade head`).
- متغیرهای `.env` مطابق `backend/backend/.env.example` پر شده باشند.

## بعد از استقرار

- `/health` یا معادل سلامت سرویس API
- نمونه login واقعی (OTP یا SSO)
- لاگ خطاها (۵xx) در مانیتورینگ
