# مرجع متغیرهای محیطی (Env matrix)

جدول خلاصه برای هم‌ترازی dev / staging / production. جزئیات بیشتر: [`LOCAL_DEV.md`](./LOCAL_DEV.md)، [`FRONTEND_API_INTEGRATION.md`](./FRONTEND_API_INTEGRATION.md).

## admin-ui (Vite — پیشوند `VITE_`)

| متغیر | نقش | dev | staging / prod |
|--------|-----|-----|----------------|
| `VITE_DEV_PROXY_TARGET` | آدرس بک‌اند برای پروکسی dev (`/api/v1`, …) | `http://127.0.0.1:8080` | معمولاً خالی؛ API مطلق با `VITE_API_URL` |
| `VITE_API_URL` | base مطلق API وقتی پروکسی استفاده نمی‌شود | خالی در dev پروکسی | URL واقعی API؛ در Docker با nginx خالی، مسیر `/api/v1` همان origin است و nginx باید `/api/` را به بک‌اند بدهد (`admin-ui/nginx.conf`) |
| `VITE_USE_MSW` | Mock Service Worker در مرورگر | `true`/`false` | `false` |
| `VITE_ENABLE_DEV_BYPASS` | ورود آزمایشی در dev | `true` فقط لوکال | **هرگز** `true` |
| `VITE_USE_CRM_API` | مسیر CRM واقعی در مقابل mock | بسته به سناریو | طبق بک‌اند |
| `VITE_PUBLIC_POSTHOG_*` | تحلیل (در صورت فعال بودن) | اختیاری | مقادیر پروداکشن |

## amline-ui (Next — پیشوند `NEXT_PUBLIC_`)

| متغیر | نقش | dev | staging / prod |
|--------|-----|-----|----------------|
| `NEXT_PUBLIC_DEV_PROXY_TARGET` / `NEXT_PUBLIC_API_BASE_URL` | مقصد rewriteها در `next.config.js` | `http://127.0.0.1:8080` یا سرویس داکر | URL استیجینگ/پروداکشن |
| `NEXT_PUBLIC_ENABLE_DEV_BYPASS` | ورود تستی | فقط dev | `false` |
| `NEXT_PUBLIC_E2E_DEV_BYPASS` | Playwright / E2E | فقط CI/dev تست | `false` |
| `NEXT_PUBLIC_EMBED_ADMIN_WIZARD` | embed ویزارد ادمین | `0`/`1` طبق نیاز بیلد | طبق محصول |

## consultant-ui (Vite)

| متغیر | نقش | dev | staging / prod |
|--------|-----|-----|----------------|
| `VITE_DEV_PROXY_TARGET` | پروکسی dev | `http://127.0.0.1:8080` | — |
| `VITE_API_URL` | base API | خالی با پروکسی | URL API |
| `VITE_USE_MSW` | MSW | dev اختیاری | `false` |

## site (مارکتینگ)

معمولاً فقط متغیرهای Next عمومی؛ بدون تماس مستقیم به API املاین مگر در صفحات خاص.

## بک‌اند (`backend/backend`)

| متغیر | نقش |
|--------|-----|
| `AMLINE_CORS_ORIGINS` | لیست مبدأهای مجاز (ویرگول‌جداشده)؛ پیش‌فرض localhostهای پورت‌های اپ |
| `AMLINE_DATABASE_URL` | PostgreSQL |
| `AMLINE_JWT_SECRET` | امضای JWT |
| `AMLINE_RBAC_ENFORCE` | اعمال هدرهای RBAC (`X-User-Id`, …) |

برای لیست کامل، `.env.example` در `backend/backend` را ببینید.

## یکپارچگی قرارداد API

به‌روزرسانی snapshot OpenAPI و تایپ‌های TypeScript از ریشهٔ مخزن:

```bash
npm run openapi:refresh
```

خروجی: [`docs/generated/openapi.json`](./generated/openapi.json)، پکیج [`packages/amline-openapi-types`](../packages/amline-openapi-types).
