# فهرست متغیرهای محیطی و دارایی‌های امنیتی پروژهٔ املاین

**هدف:** یک مرجع واحد برای **نام** متغیرها، **محل تنظیم**، و **دسته‌بندی حساسیت** — نه ذخیرهٔ مقادیر واقعی.

**⚠️ مهم:** این فایل را **با مقادیر واقعی** پر نکنید و آن را در Git با secret واقعی commit نکنید. مقادیر را در مدیر رمز، vault سازمانی، یا فایل‌های `.env.local` محلی نگه دارید.

---

## ۱) Backend / Docker (ریشهٔ monorepo — `.env.example`)

| متغیر | حساس؟ | توضیح کوتاه |
|--------|--------|-------------|
| `APP_ENV`, `APP_DEBUG`, `APP_NAME`, `APP_VERSION`, `APP_URL` | جزئی | عمومی |
| `SECRET_KEY` | **بله** | کلید امضای اپ |
| `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_ACCESS_EXPIRE`, `JWT_REFRESH_EXPIRE` | **بله** | JWT |
| `CLI_PASSWORD` | **بله** | CLI ادمین |
| `POSTGRES_*`, `DATABASE_URL` | **بله** | دیتابیس |
| `REDIS_*` | **بله** | Redis |
| `MINIO_*` | **بله** | ذخیرهٔ فایل |
| `RABBITMQ_*` | **بله** | صف (اختیاری) |
| `PDF_GENERATOR_SERVICE_URL` | خیر | URL سرویس |
| `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `OTP_EXPIRE_MINUTES` | خیر | مدت اعتبار |
| `KAVENEGAR_*`, `TSMS_*` | **بله** | SMS |
| `ZARINPAL_*`, `PARSIAN_*`, `BANK_GATEWAY_REDIRECT_URL` | **بله** | درگاه پرداخت |
| `SENTRY_DSN` | شبه‌محرمانه | مانیتورینگ |
| `ELASTIC_*` | **بله** | Elasticsearch |
| `KENAR_DIVAR_*` | **بله** | دیوار |
| `EITAA_*`, `BALE_*`, `TELEGRAM_BOT_TOKEN` | **بله** | پیام‌رسان‌ها |
| `MAIL_*` | **بله** | ایمیل |
| `SMS_QUEUE`, `DISCOUNT_SALT` | **بله** / بله | صف و نمک تخفیف |
| `SNOWFLAKE_MACHINE_ID` | خیر | شناسه ماشین |
| `AMLINE_FRONTEND_URL`, `AMLINE_API_URL` | خیر | URLها |
| `HOST_PANEL_*` | **بله** | پنل میزبان (اختیاری) |
| `AMLINE_AI_URL` | شبه‌محرمانه | سرویس AI |
| `CTO_PROJECT_ROOT` | خیر | مسیر پروژه |
| `GSC_KEY_FILE` | **بله** (مسیر به فایل کلید) | Google Search Console |
| `GSC_SHEET_ID` | شبه‌محرمانه | شیت گوگل |

**فایل مرجع در repo:** `.env.example` (ریشهٔ `Amline_namAvaran`)

---

## ۲) admin-ui (Vite — `.env.local` / `.env.example`)

| متغیر | حساس؟ | نقش |
|--------|--------|-----|
| `VITE_API_URL` | معمولاً خیر | base API؛ خالی = origin + proxy |
| `VITE_USE_MSW` | خیر | MSW on/off |
| `VITE_DEV_PROXY_TARGET` | خیر | هدف proxy dev |
| `VITE_USE_CRM_API` | خیر | CRM از API |
| `VITE_ENABLE_DEV_BYPASS` | خیر (اما رفتار dev) | ورود آزمایشی |
| `VITE_SENTRY_DSN`, `VITE_SENTRY_DEV` | شبه‌محرمانه | Sentry (در `vite-env.d.ts`) |

**تست Playwright (محیط اجرا، نه حتماً فایل):**  
`PLAYWRIGHT_BASE_URL`, `VITE_USE_MSW`, `VITE_ENABLE_DEV_BYPASS`, `VITE_DEV_PROXY_TARGET`, `DEV_MOCK_BASE_URL` (در `tests/dev-mock-api-optional.spec.ts`)

---

## ۳) amline-ui (Next — `.env.local` / `.env.example`)

| متغیر | حساس؟ |
|--------|--------|
| `NEXT_PUBLIC_DEV_PROXY_TARGET` | خیر |
| `NEXT_PUBLIC_API_BASE_URL` | خیر |
| `NEXT_PUBLIC_ENABLE_DEV_BYPASS` | خیر |

**Playwright:** `CI`, `PW_USE_BUNDLED_CHROMIUM`, `NEXT_PUBLIC_DEV_PROXY_TARGET`, `NEXT_PUBLIC_ENABLE_DEV_BYPASS`

---

## ۴) consultant-ui

| متغیر | منبع |
|--------|------|
| `VITE_API_URL` | `.env.example` |
| `VITE_USE_MSW` | `.env.example` |
| `VITE_DEV_PROXY_TARGET` | در `vite.config.ts` (از env) |

---

## ۵) seo-dashboard (Next — `.env.local` از روی `.env.local.example`)

| متغیر | حساس؟ | نقش |
|--------|--------|-----|
| `OPENAI_API_KEY` | **بله** | چت AI (`src/app/api/ai/chat/route.ts`) |
| `AMLINE_AI_URL` | شبه‌محرمانه | fallback AI |
| `GSC_DATA_PATH` | خیر | مسیر JSON دادهٔ GSC |
| `NEXT_PUBLIC_BASE_PATH` | خیر | `next.config.js` |

**ریشهٔ monorepo:** `GSC_KEY_FILE`, `GSC_SHEET_ID` (برای اسکریپت‌های GSC در `.env.example`)

---

## ۶) qa-amline-tests

| متغیر | نقش |
|--------|-----|
| `BASE_URL` | آدرس اپ تحت تست |
| `OTP_CODE` | کد OTP برای تست واقعی (**حساس در محیط staging**) |

---

## ۷) browser-live-control

| متغیر | پیش‌فرض |
|--------|---------|
| `CDP_URL` | `http://127.0.0.1:9222` |

---

## ۸) TaskFlow / Agent (زیرپوشهٔ `Agent/...`)

| متغیر | نقش |
|--------|-----|
| `VITE_API_BASE_URL` | API |
| `TAURI_DEV_HOST` | میزبان dev تauri |

---

## ۹) فایل‌های کلید روی دیسک (در `.gitignore` — commit نشوند)

- هر فایل `**/*-key.json`, `**/*-account-*.json` (سرویس‌اکانت گوگل و مشابه)
- `*.pem`, `*.key`, کلیدهای SSH
- `.env`, `.env.local`, `seo-dashboard/.env.local`

**مسیر نمونه در `.env.example`:** `GSC_KEY_FILE=...`

---

## ۱۰) چک‌لیست انتقال به ماشین جدید (بدون کپی secret به Git)

1. `git clone` مخزن `Amline_namAvaran`
2. از هر `.env.example` یک `.env` یا `.env.local` بسازید
3. مقادیر را از **vault** یا کپی امن محلی وارد کنید — نه از این سند
4. `npm install` / `pip install` طبق README
5. کلیدهای فایلی (GSC و غیره) را در مسیر امن کپی کنید و `GSC_KEY_FILE` را به آن اشاره دهید

---

*آخرین به‌روزرسانی: بر اساس `.env.example`ها و اسکن `process.env` / `import.meta.env` در monorepo.*
