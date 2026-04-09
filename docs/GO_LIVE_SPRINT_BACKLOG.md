# بک‌لاگ اجرایی Go-Live (استوری‌ها و معیار پذیرش)

این سند **اجرای کامل** [`PRODUCT_READINESS_EXECUTION_PLAN.md`](./PRODUCT_READINESS_EXECUTION_PLAN.md) را به **کارهای قابل ردیابی** تبدیل می‌کند. مرز محصول و فهرست v1 در [`PLATFORM_GO_LIVE_ROADMAP.md`](./PLATFORM_GO_LIVE_ROADMAP.md) است.

| فیلد | توضیح |
|------|--------|
| **شناسه** | برای تیکت GitHub / تسک‌منیجر؛ در PR با `Refs: GL-…` ذکر شود. |
| **مالک** | **نقش** (نه فرد) تا وقتی جدول مالکیت در roadmap با نام پر نشده. |
| **اسپرینت پیشنهادی** | S1…S5 مطابق برنامهٔ ۵ هفته‌ای پلن اجرایی؛ قابل جابه‌جایی با ظرفیت تیم. |

**آخرین به‌روزرسانی سند:** ۲۰۲۶-۰۴-۰۹ — **Milestone GitHub:** [Go-Live v1](https://github.com/m-khonyagar/Amline_namAvaran/milestone/1) (۳۱ Issue؛ `npm run go-live:issues` برای همگام‌سازی ایدمپوتنت)

---

## ۱) داشبورد فازها (خلاصهٔ وضعیت)

| فاز (roadmap) | موضوع | وضعیت پیش‌فرض | اپیک‌های مرجع |
|---------------|--------|----------------|----------------|
| ۰ | قفل محصول و مالکیت | ☐ | [E0](#epic-e0) |
| ۱ | کیفیت و ایمنی فرانت ادمین | بخشی در مخزن | [E1](#epic-e1) |
| ۲ | بک‌اند واقعی، داده، staging | ☐ | [E2](#epic-e2) |
| ۳ | احراز هویت و مجوز در production | ☐ | [E3](#epic-e3) |
| ۴ | استقرار و observability | ☐ | [E4](#epic-e4) |
| ۵ | اعتماد، بک‌آپ، پشتیبانی | ☐ | [E5](#epic-e5) |

وضعیت را در [`PLATFORM_GO_LIVE_ROADMAP.md`](./PLATFORM_GO_LIVE_ROADMAP.md) همزمان نگه دارید.

---

## ۲) نگاشت برنامهٔ ۵ هفته‌ای → اپیک

| هفته | تمرکز اصلی (از پلن اجرایی) | اپیک‌های اولویت |
|------|-----------------------------|------------------|
| **S1** | فاز ۰ + استیجینگ پایه + اولین API بحرانی از mock | E0، شروع E2 (زیرساخت staging)، E1 (تأیید CI) |
| **S2–S3** | هستهٔ v1 روی staging (قرارداد، CRM، کاربران، …) | E2، همپوشانی E1 (E2E) |
| **S4** | امنیت پرود + سخت‌سازی env | E3، شروع E4 |
| **S5** | استقرار پایدار + بتا محدود + اعتماد سبک | E4، E5 |

---

<a id="epic-e0"></a>

## Epic E0 — فاز ۰: قفل محصول و مالکیت

| شناسه | عنوان | مالک | وابستگی | معیار پذیرش (DoD) | اسپرینت |
|--------|--------|------|---------|-------------------|---------|
| **GL-P0-01** | تأیید رسمی جدول «داخل v1» و حذف ابهام از مسیرهای UI/API | محصول | — | جدول v1 در roadmap بدون ردیف مبهم «بعداً»؛ در صورت نیاز footnote با تاریخ | S1 |
| **GL-P0-02** | پر کردن جدول مالکیت (نام یا تیم قطعی) | محصول | GL-P0-01 | هر سلول «نام / تیم» پر؛ کانال تصمیم‌گیری مشخص | S1 |
| **GL-P0-03** | ثبت تصمیم SSOT برای API و مسیر dev-mock | Backend + محصول | — | لینک به [`GIT_AND_BACKEND_POLICY.md`](./GIT_AND_BACKEND_POLICY.md) + [`DEV_MOCK_GAP_MATRIX.md`](./DEV_MOCK_GAP_MATRIX.md) به‌روز | S1 |

---

<a id="epic-e1"></a>

## Epic E1 — فاز ۱: کیفیت و ایمنی `admin-ui`

| شناسه | عنوان | مالک | وابستگی | معیار پذیرش (DoD) | اسپرینت |
|--------|--------|------|---------|-------------------|---------|
| **GL-P1-01** | سبز بودن `openapi-contract` + `admin-ui-quality` + `backend-test` روی `main` | Frontend + Backend | — | آخرین run CI سبز؛ در صورت شکست runbook در [`LOCAL_DEV.md`](./LOCAL_DEV.md) یا CONTRIBUTING | S1 |
| **GL-P1-02** | اجرای `assert-safe-production-env` در مسیر release و مستند بودن | Frontend | — | `prebuild` طبق `admin-ui/package.json`؛ مستند در [`ENV_SECRETS_INVENTORY.md`](./ENV_SECRETS_INVENTORY.md) | S1 |
| **GL-P1-03** | E2E محلی سبز: `npm run test:e2e` در `admin-ui` قبل از هر release نامزد | QA + Frontend | GL-P1-01 | نتیجه در PR یا گزارش تست پیوست شود | S2 |
| **GL-P1-04** | E2E علیه **URL استیجینگ** (ورود → داشبورد حداقل) | QA | GL-P2-05، GL-P2-06 | تست ثبت‌شده با زمان‌بندی؛ اسکرین یا لاگ request_id | S2 |

---

<a id="epic-e2"></a>

## Epic E2 — فاز ۲: Backend و داده، staging

| شناسه | عنوان | مالک | وابستگی | معیار پذیرش (DoD) | اسپرینت |
|--------|--------|------|---------|-------------------|---------|
| **GL-P2-01** | محیط staging: Postgres، secret جدا، دسترسی محدود | DevOps | GL-P0-02 | مستند اتصال در [`ENV_MATRIX.md`](./ENV_MATRIX.md)؛ بدون secret در git | S1 |
| **GL-P2-02** | Deploy خودکار یا runbook یک‌صفحه‌ای backend روی staging | DevOps + Backend | GL-P2-01 | Health endpoint سبز؛ نسخه commit قابل مشاهده | S1–S2 |
| **GL-P2-03** | Migrationها (Alembic) روی staging بدون دادهٔ تولیدی واقعی در repo | Backend | GL-P2-01 | `pytest` یا اسکریپت verify روی staging سبز | S2 |
| **GL-P2-04** | جایگزینی وابستگی mock برای **جریان ورود** (`/admin/otp/*`, `/admin/login`, `/auth/me`) | Backend | GL-P2-02 | پاسخ‌ها با OpenAPI منطبق؛ [`openapi:refresh`](./FRONTEND_API_INTEGRATION.md) به‌روز | S2 |
| **GL-P2-05** | پوشش **هستهٔ v1** طبق جدول roadmap: هر ردیف «داخل v1» روی staging | Backend | GL-P2-04 | ماتریس: مسیر UI ↔ endpoint ↔ تست دستی یا خودکار | S2–S3 |
| **GL-P2-06** | `admin-ui` روی staging به `VITE_API_URL` استیجینگ؛ بدون MSW در build استقرار | Frontend + DevOps | GL-P2-02 | Build استقرار با grep عدم وجود `VITE_USE_MSW=true` | S2 |
| **GL-P2-07** | اندازه‌گیری حداقلی: p95 و نرخ خطا برای ۲–۳ مسیر بحرانی | Backend + DevOps | GL-P2-05 | لاگ یا APM؛ عدد ثبت در تیکت | S3 |
| **GL-P2-08** | مهاجرت تدریجی `axios` → `fetchJson` در ۳ مسیر پرتکرار (طبق پلن فنی) | Frontend | — | PR جدا؛ رفتار خطا و `X-Request-Id` یکسان | S3 (موازی) |

---

<a id="epic-e3"></a>

## Epic E3 — فاز ۳: امنیت OTP، نشست، پرود

| شناسه | عنوان | مالک | وابستگی | معیار پذیرش (DoD) | اسپرینت |
|--------|--------|------|---------|-------------------|---------|
| **GL-P3-01** | OTP + rate limit روی `/admin/otp/send` در staging و prod | Backend | GL-P2-04 | تست سوءاستفاده پایه؛ threshold مستند | S4 |
| **GL-P3-02** | نشست امن (httpOnly یا معادل طبق [`HTTPONLY_AUTH.md`](./HTTPONLY_AUTH.md)) | Backend + Frontend | GL-P3-01 | بدون ذخیرهٔ توکن حساس در localStorage برای flow اصلی | S4 |
| **GL-P3-03** | اثبات عدم `VITE_ENABLE_DEV_BYPASS=true` در artifact پروداکشن | Frontend | GL-P1-02 | اسکریپت prebuild یا CI قفل کننده | S4 |
| **GL-P3-04** | RBAC enforce سمت سرور برای نقش‌های v1 | Backend | GL-P2-05 | تست منفی: کاربر بدون مجوز 403 | S4 |

---

<a id="epic-e4"></a>

## Epic E4 — فاز ۴: استقرار، env، رصد

| شناسه | عنوان | مالک | وابستگی | معیار پذیرش (DoD) | اسپرینت |
|--------|--------|------|---------|-------------------|---------|
| **GL-P4-01** | تفکیک متغیرها و secret بین staging و production | DevOps | GL-P2-01 | جدول در [`ENV_MATRIX.md`](./ENV_MATRIX.md) کامل | S4–S5 |
| **GL-P4-02** | CI سبز قبل از merge (سیاست [`GIT_AND_BACKEND_POLICY.md`](./GIT_AND_BACKEND_POLICY.md)) | همه | — | branch protection + وضعیت required | S5 |
| **GL-P4-03** | Sentry یا معادل + correlation با `X-Request-Id` در مسیرهای بحرانی | Frontend + Backend | — | حداقل یک خطای تستی در staging قابل ردیابی end-to-end | S5 |
| **GL-P4-04** | Runbook deploy production (گام‌ها، رول‌بک، تماس مسئول) | DevOps | GL-P4-01 | یک صفحه در `docs/` یا ویکی داخلی لینک از README | S5 |

---

<a id="epic-e5"></a>

## Epic E5 — فاز ۵: اعتماد کاربر نهایی

| شناسه | عنوان | مالک | وابستگی | معیار پذیرش (DoD) | اسپرینت |
|--------|--------|------|---------|-------------------|---------|
| **GL-P5-01** | بک‌آپ زمان‌بندی‌شدهٔ DB + نگهداری off-site | DevOps | GL-P2-01 | زمان‌بندی و محل مستند | S5 |
| **GL-P5-02** | یک بار restore آزمایشی (حتی روی استیج) | DevOps | GL-P5-01 | گزارش با زمان بازیابی | S5 |
| **GL-P5-03** | SLA سبک داخلی (زمان پاسخ پشتیبانی / uptime هدف) | محصول | — | سند یک صفحه؛ قابل ابلاغ به مشتری داخلی | S5 |
| **GL-P5-04** | پیام خطا و empty state شفاف در مسیرهای پرتکرار v1 | Frontend + محصول | GL-P2-05 | چک‌لیست UX روی ۵ صفحهٔ پرترافیک | S5 |
| **GL-P5-05** | کانال پشتیبانی (ایمیل/تیکت) و مالک پاسخ | محصول | — | در محصول یا سند عمومی قابل پیدا شدن | S5 |

---

## مسیرهای موازی (خارج از برید باریک اما برنامه‌ریزی‌شده)

| شناسه | اپ / حوزه | شرط شروع | معیار پذیرش خلاصه |
|--------|-----------|-----------|-------------------|
| **GL-PX-01** | `amline-ui` | ثبات auth + قرارداد روی staging (GL-P2-04+) | E2E auth + یک جریان اصلی سبز |
| **GL-PX-02** | `consultant-ui` | `/consultant/*` روی backend واقعی | مسیرهای مشاور طبق قرارداد + خطا |
| **GL-PX-03** | `site` (مارکتینگ) | مستقل | deploy و محتوا؛ بدون وابستگی به GL-P2 |

Hamgit/Market طبق roadmap **بعد از v1** — تیکت جدا با برچسب `post-v1`.

---

<a id="go-live-checklist-mapping"></a>

## نگاشت به چک‌لیست «قبل از اولین کاربر واقعی»

| بند چک‌لیست در `PLATFORM_GO_LIVE_ROADMAP.md` | استوری‌های پوشش‌دهنده |
|---------------------------------------------|------------------------|
| هستهٔ v1 روی staging با API واقعی | GL-P2-05، GL-P2-06 |
| build بدون bypass و بدون MSW | GL-P1-02، GL-P2-06، GL-P3-03 |
| `VITE_API_URL` / proxy درست | GL-P2-06، GL-P4-01 |
| ورود OTP واقعی | GL-P2-04، GL-P3-01، GL-P3-02 |
| `pytest` / تست backend روی staging | GL-P2-03، GL-P2-05 |
| `npm run verify` در admin سبز | GL-P1-01 |

---

## نحوهٔ استفاده در GitHub

راهنمای کامل (قالب Issue، برچسب‌ها، `gh`): [`GITHUB_GO_LIVE.md`](./GITHUB_GO_LIVE.md)

1. قالب **Go-Live story** در GitHub → New issue؛ یا عنوان دستی `[GL-Px-xx] …`.
2. در PR: `Refs: #issue` یا `Closes #issue` وقتی کامل شد؛ قالب PR فیلد Go-Live دارد.
3. یک‌بار برچسب‌ها: `.\scripts\gh-go-live-labels.ps1` (نیاز به `gh auth login`).
4. پایان هر اسپرینت: داشبورد بخش ۱ و جدول فازها در [`PLATFORM_GO_LIVE_ROADMAP.md`](./PLATFORM_GO_LIVE_ROADMAP.md) را به‌روز کنید.

---

## مراجع سریع

- [`PRODUCT_READINESS_EXECUTION_PLAN.md`](./PRODUCT_READINESS_EXECUTION_PLAN.md) — اصول و زمان‌بندی
- [`PLATFORM_GO_LIVE_ROADMAP.md`](./PLATFORM_GO_LIVE_ROADMAP.md) — تعریف v1 و چک‌لیست
- [`GITHUB_GO_LIVE.md`](./GITHUB_GO_LIVE.md) — اتصال به GitHub
- [`FRONTEND_API_INTEGRATION.md`](./FRONTEND_API_INTEGRATION.md) — قرارداد و OpenAPI
