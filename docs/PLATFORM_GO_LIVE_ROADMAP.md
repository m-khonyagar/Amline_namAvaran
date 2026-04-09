# نقشهٔ راه آماده‌سازی پلتفرم برای کاربر واقعی (Go-Live)

این سند **مرحله‌بندی اجرایی** است؛ جزئیات فنی تکمیلی در پیوندها آمده است. برای **ترتیب برید باریک، مسیر بحرانی، و برنامهٔ زمانی پیشنهادی** ببینید: [`PRODUCT_READINESS_EXECUTION_PLAN.md`](./PRODUCT_READINESS_EXECUTION_PLAN.md). برای **استوری‌ها، مالک نقش، معیار پذیرش، وابستگی، و نگاشت به چک‌لیست** ببینید: [`GO_LIVE_SPRINT_BACKLOG.md`](./GO_LIVE_SPRINT_BACKLOG.md).

**آخرین به‌روزرسانی وضعیت فازها:** ۲۰۲۶-۰۴-۰۹ (جدول زیر را هر اسپرینت به‌روز کنید.) — **ردیابی GitHub:** [Milestone Go-Live v1](https://github.com/m-khonyagar/Amline_namAvaran/milestone/1)، [`GITHUB_GO_LIVE.md`](./GITHUB_GO_LIVE.md)، `npm run go-live:issues`.

| فاز | موضوع کوتاه | وضعیت اجرا | مرجع استوری‌ها |
|-----|-------------|------------|----------------|
| ۰ | قفل محصول و مالکیت | ☐ در انتظار | [E0](GO_LIVE_SPRINT_BACKLOG.md#epic-e0) |
| ۱ | کیفیت و ایمنی `admin-ui` | ◐ بخشی در مخزن (CI، prebuild) | [E1](GO_LIVE_SPRINT_BACKLOG.md#epic-e1) |
| ۲ | Backend واقعی، staging، v1 روی API | ☐ در انتظار | [E2](GO_LIVE_SPRINT_BACKLOG.md#epic-e2) |
| ۳ | احراز هویت و مجوز در production | ☐ در انتظار | [E3](GO_LIVE_SPRINT_BACKLOG.md#epic-e3) |
| ۴ | استقرار و observability | ☐ در انتظار | [E4](GO_LIVE_SPRINT_BACKLOG.md#epic-e4) |
| ۵ | اعتماد، بک‌آپ، پشتیبانی | ☐ در انتظار | [E5](GO_LIVE_SPRINT_BACKLOG.md#epic-e5) |

## اصول

1. **اول قرارداد محصول (v1)**، بعد گسترش فیچر (Hamgit/Market و غیره).
2. **اول backend پایدار و دادهٔ واقعی** روی برید باریک، بعد UI تزئینی.
3. **امنیت و enforce سمت سرور**؛ UI فقط لایهٔ نمایش است.
4. **یک staging** شبیه production بدون MSW و بدون dev bypass.

---

## v1 — تعریف نهایی (قفل محصول)

این بخش **مرز تحویل اولین نسخهٔ قابل اتکا به کاربر** است. تا زمانی که ردیف‌های «هستهٔ v1» روی API واقعی (staging) سبز نشده‌اند، گسترش فیچرهای «خارج از v1» اولویت ندارد.

### داخل v1 (حداقل تحویل)

| حوزه | مسیر(های) UI در `admin-ui` | APIهای مرجع (نمونه) | مجوز کلیدی |
|------|----------------------------|----------------------|------------|
| ورود و نشست | `/login` → `/dashboard` | `POST /admin/otp/send`, `POST /admin/login`, `GET /auth/me` | — |
| داشبورد | `/dashboard` | `GET /admin/metrics/summary` | — |
| کاربران | `/users`, `/users/:id` | `GET/PATCH /admin/users`, زیرمسیرهای جزئی | `users:read` / `users:write` |
| آگهی‌ها (سطح لیست) | `/ads` | `GET /admin/ads` | `ads:read` |
| قراردادها | `/contracts`, `/contracts/:id`, `/contracts/wizard` | `POST /contracts/start`, مسیرهای ویزارد، لیست/جزئی | `contracts:read` / `contracts:write` |
| کیف پول | `/wallets` | `GET /admin/wallets` یا معادل مالی ادمین | `wallets:read` |
| CRM | `/crm`, `/crm/:id` | `GET/POST/PATCH /admin/crm/leads`, activities | `crm:read` / `crm:write` |
| تنظیمات کاربر/پنل | `/settings` | بسته به backend تنظیمات | `settings:read` |
| صندوق اعلان‌ها | `/admin/inbox` | `GET/PATCH /admin/notifications` | `notifications:read` |
| نقش‌ها و دسترسی | `/admin/roles` | `GET/POST/PATCH /admin/roles` | `roles:read` / `roles:write` |
| ممیزی | `/admin/audit` | `GET/POST /admin/audit` | `audit:read` |
| گزارش فعالیت | `/admin/activity` | `GET /admin/staff/activity`, sessions | `reports:read` |

### v1 سازمانی (پس از هسته؛ یا هم‌زمان اگر قرارداد پروژه اجبار کرده)

| حوزه | مسیر UI | APIهای مرجع (نمونه) | مجوز کلیدی |
|------|---------|----------------------|------------|
| بررسی مشاوران | `/admin/consultants` | مسیرهای moderation مشاور در backend | `consultants:read` |
| فضای کار تیمی | `/admin/workspace` | workspace tasks/presence در backend | `workspace:read` |

### عمداً خارج از v1 (تا اعلام بعدی)

| مورد | دلیل کوتاه |
|------|------------|
| هاب **ادغام Hamgit** (`/admin/hamgit-port/*`) | حجم بالا؛ پورت تدریجی؛ پرچم `VITE_FLAG_HAMGIT_PORT` در پرود پیش‌فرض خاموش |
| صفحهٔ **قراردادهای PR** (`/contracts/pr-contracts`) | تفاوت عمیق API با ویزارد فعلی؛ پرچم `VITE_FLAG_PR_CONTRACTS_PAGE` |
| **Market** و بقیهٔ ماژول‌های قدیمی Hamgit | طبق [HAMGIT_FEATURES_PARITY.md](./HAMGIT_FEATURES_PARITY.md) — فاز بعد v1 |

### مالکیت (باید در فاز ۰ با نام پر شود)

| نقش | مسئولیت در v1 | نام / تیم |
|-----|-----------------|-----------|
| محصول | تأیید همین جدول و اولویت برید | _تعیین شود_ |
| Backend | پیاده‌سازی و پایداری API جدول بالا روی `backend/backend` | _تعیین شود_ |
| Frontend (`admin-ui`) | خطا/empty/loading، تطبیق با قرارداد API | _تعیین شود_ |
| DevOps | staging شبیه prod، secretها، deploy | _تعیین شود_ |
| QA | تست دستی + E2E روی staging برای مسیرهای v1 | _تعیین شود_ |

**قانون تغییر:** هر افزودن به جدول «داخل v1» نیاز به **تأیید محصول** و به‌روزرسانی همین سند دارد.

---

## فاز ۰ — هم‌ترازی تیم (۱ هفته)

| گام | خروجی |
|-----|--------|
| تعریف **v1** | بخش **«v1 — تعریف نهایی (قفل محصول)»** در همین فایل؛ پر کردن جدول مالکیت |
| مالکیت Backend / DevOps / Frontend | نام در جدول مالکیت |
| تصمیم دامنهٔ API مرجع | `backend/backend` + [DEV_MOCK_GAP_MATRIX.md](./DEV_MOCK_GAP_MATRIX.md) |

**مرجع:** [GIT_AND_BACKEND_POLICY.md](./GIT_AND_BACKEND_POLICY.md)، [CLONE_API_GAP_admin_ui.md](./CLONE_API_GAP_admin_ui.md)

---

## فاز ۱ — کیفیت و ایمنی فرانت ادمین (در جریان)

| گام | وضعیت در مخزن |
|-----|----------------|
| `tsc` + Vitest در CI روی هر PR برای `admin-ui` | `.github/workflows/ci.yml` → job `admin-ui-quality` |
| اسکریپت جلوگیری از `.env.production` ناامن (MSW / dev bypass) | `admin-ui/scripts/assert-safe-production-env.mjs` + `prebuild` |
| نمونهٔ env پروداکشن | `admin-ui/.env.production.example` |
| E2E محلی / پیش از release | `admin-ui`: `npm run test:e2e` |

**مرجع:** [LOCAL_DEV.md](./LOCAL_DEV.md)، [ENV_SECRETS_INVENTORY.md](./ENV_SECRETS_INVENTORY.md)

---

## فاز ۲ — Backend واقعی و داده (بحرانی)

| گام | توضیح |
|-----|--------|
| جایگزینی mock برای مسیرهای v1 | PostgreSQL، migration (Alembic)، بدون state فقط در RAM |
| هم‌خوانی قرارداد API | OpenAPI یا ماتریس gap به‌روز؛ فرانت فقط روی پاسخ واقعی تست شود |
| Hamgit / استاب‌ها | تکرار الگوی «لیست + React Query + empty/error»؛ [HAMGIT_FEATURES_PARITY.md](./HAMGIT_FEATURES_PARITY.md) |

**مرجع:** [HTTPONLY_AUTH.md](./HTTPONLY_AUTH.md)، [BACKEND_STAGING_CORS.md](./BACKEND_STAGING_CORS.md)

---

## فاز ۳ — احراز هویت و مجوز در production

| گام | توضیح |
|-----|--------|
| OTP و session امن | کوکی httpOnly یا معادل؛ rate limit روی `/admin/otp/send` |
| نقش و مجوز فقط در سرور | تطبیق با `PermissionGuard` فعلی |
| حذف `VITE_ENABLE_DEV_BYPASS` از build پروداکشن | در `.env.production` هرگز `true` نباشد (اسکریپت prebuild چک می‌کند) |

---

## فاز ۴ — استقرار و observability

| گام | توضیح |
|-----|--------|
| Staging + Production جدا | متغیرها و secret جدا؛ بدون MSW در staging |
| CI سبز قبل از merge به `main` | طبق [GIT_AND_BACKEND_POLICY.md](./GIT_AND_BACKEND_POLICY.md) |
| Sentry / لاگ ساخت‌یافته | `admin-ui`: `initOptionalSentry`؛ سرور: correlation id |

**مرجع:** [DEPLOY_BACKEND_PARMIN.md](./DEPLOY_BACKEND_PARMIN.md) (در صورت استفاده از همان مسیر deploy)

---

## فاز ۵ — اعتماد کاربر نهایی

| گام | توضیح |
|-----|--------|
| پشتیبان‌گیری DB + یک بار restore آزمایشی | runbook |
| SLA سبک (زمان پاسخ پشتیبانی / uptime هدف) | داخلی |
| پیام خطا و حالت خالی شفاف | در مسیرهای پرتکرار v1 |

---

## چک‌لیست سریع قبل از اولین کاربر واقعی

نگاشت به شناسه‌های اجرایی: [`GO_LIVE_SPRINT_BACKLOG.md` — نگاشت چک‌لیست](GO_LIVE_SPRINT_BACKLOG.md#go-live-checklist-mapping)

- [ ] همهٔ ردیف‌های **هستهٔ v1** در بخش تعریف v1 روی **staging** با API واقعی تست شده‌اند — *GL-P2-05, GL-P2-06*
- [ ] `admin-ui`: build با `.env.production` بدون `VITE_ENABLE_DEV_BYPASS=true` و بدون `VITE_USE_MSW=true` — *GL-P1-02, GL-P2-06, GL-P3-03*
- [ ] `VITE_API_URL` یا هاست استاتیک + proxy nginx به API درست تنظیم شده — *GL-P2-06, GL-P4-01*
- [ ] ورود فقط از مسیر OTP واقعی (یا SSO) تست شده — *GL-P2-04, GL-P3-01, GL-P3-02*
- [ ] `pytest` / تست backend روی staging سبز — *GL-P2-03, GL-P2-05*
- [ ] `npm run verify` در `admin-ui` سبز (tsc + vitest) — *GL-P1-01*

---

## به‌روزرسانی

با تکمیل هر فاز، این سند، [GO_LIVE_SPRINT_BACKLOG.md](./GO_LIVE_SPRINT_BACKLOG.md) (داشبورد و تیکت‌ها)، و [HAMGIT_FEATURES_PARITY.md](./HAMGIT_FEATURES_PARITY.md) را به‌روز کنید.
