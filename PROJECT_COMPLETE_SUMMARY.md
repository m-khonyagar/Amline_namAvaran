# 📋 خلاصه جامع پروژه‌ها (املاین / Agent / SEO)

**آخرین به‌روزرسانی این سند**: ۵ آوریل ۲۰۲۶ (میلادی)

**مخزن اصلی فعلی (مونوریپو املاین)**: [`Amline_namAvaran`](https://github.com/m-khonyagar/Amline_namAvaran) — مسیر محلی رایج: `E:\Amline_namAvaran`

**سند تاریخی (CTO / agent-windsurf-amline)**: مسیر قدیمی `e:\CTO` در بخش‌های پایین‌تر برای بافت تاریخی حفظ شده است.

---

## 🎯 ۱. نمای کلی

این مخزن یک **پلتفرم چندبخشی** است که شامل:

| بخش | هدف | وضعیت |
|-----|-----|-------|
| **پلتفرم املاین** | سیستم مدیریت و سرویس‌دهی (backend + admin + site + amline-ui) | زیرساخت تعریف‌شده در docker-compose |
| **Agent Windsurf Amline Dashboard** | داشبورد مدیریت وظایف و عامل‌های AI | ✅ کامل و مستقل |
| **Agent Windsurf Amline - داشبورد سئو** | داشبورد سئو با چت هوشمند برای amline.ir | ✅ فعال و دیپلوی‌شده |
| **ابزارهای GSC** | اسکریپت‌های Google Search Console | ✅ فعال |

---

## 🏗️ ۲. معماری کلی

```
e:\CTO\
│
├── 📦 Infrastructure (docker-compose.yml)
│   ├── postgres:5432      → دیتابیس
│   ├── redis:6379         → کش و صف
│   ├── minio:9000/9001    → ذخیره فایل
│   └── rabbitmq:5672     → صف پیام (اختیاری)
│
├── 🔧 Backend Services
│   ├── backend (backend/backend)     → API اصلی املاین [در .gitignore]
│   ├── pdf-generator               → سرویس تولید PDF
│   ├── admin-ui                    → پنل ادمین (Vite)
│   ├── amline-ui                   → اپ اصلی کاربران (Next.js)
│   └── site                        → سایت شرکتی
│
├── 📊 SEO & Analytics
│   ├── seo-dashboard/              → داشبورد سئو (Next.js)
│   ├── scripts/                    → اسکریپت‌های GSC
│   └── docs/gsc_data/              → مستندات و داده GSC
│
├── 🤖 Agent Windsurf Amline (مستقل)
│   └── Agent/.../taskflow/TaskFlowDesktop/  → اپ دسکتاپ مدیریت AI
│
└── 🛠 Deploy & DevOps
    ├── .github/workflows/          → CI/CD
    ├── deploy_*.py / *.ps1         → اسکریپت‌های دیپلوی
    └── setup_*.py                  → تنظیم DNS، Nginx
```

---

## 📦 ۳. سرویس‌های اصلی

### ۳.۱ پلتفرم املاین (Amline)

**هدف**: پلتفرم جامع برای مدیریت، پرداخت، و سرویس‌دهی.

| سرویس | پورت | تکنولوژی | توضیح |
|-------|------|----------|-------|
| backend | 8080 | Python (FastAPI) | API اصلی، JWT، پرداخت، SMS |
| admin-ui | 3002 | Vite + React | پنل مدیریت |
| amline-ui | 3000 | Next.js | اپ کاربران |
| site | 3001 | Next.js | سایت شرکتی |
| pdf-generator | 8001 | Python | تولید قرارداد PDF |

**متغیرهای کلیدی** (`.env`):
- `DATABASE_URL`, `REDIS_*`, `MINIO_*` → زیرساخت
- `JWT_SECRET`, `SECRET_KEY` → امنیت
- `ZARINPAL_*`, `PARSIAN_*` → درگاه پرداخت
- `KAVENEGAR_*`, `TSMS_*` → SMS
- `AMLINE_AI_URL` → سرویس هوش مصنوعی

**توجه**: پوشه `backend/backend/` در `.gitignore` است (مخزن جدا).

---

### ۳.۲ SEO Dashboard

**هدف**: داشبورد سئو برای amline.ir با چت هوشمند.

| ویژگی | وضعیت |
|-------|-------|
| KPI (کلیک، نمایش، CTR، رتبه) | ✅ |
| نمودار روند | ✅ |
| توزیع دستگاه و کشور | ✅ |
| جدول کلمات کلیدی و صفحات برتر | ✅ |
| چت هوشمند AI با context داده GSC | ✅ |
| تم شب/روز | ✅ |
| RTL فارسی | ✅ |

**داده**: از `gsc_full_export.json` (خروجی `scripts/gsc_export_all.py`)

**اجرا**:
```bash
cd seo-dashboard && npm run dev   # پورت 3003
```

**دیپلوی**:
- **agent.amline.ir**: GitHub Actions → سرور 212.80.24.203
- **seo.amline.ir**: دستی روی 212.80.24.109

---

### ۳.۳ Agent Windsurf Amline Dashboard

**هدف**: داشبورد دسکتاپ برای مدیریت وظایف و عامل‌های AI.

| صفحه | ویژگی‌ها |
|------|----------|
| Dashboard | وضعیت سیستم، وظایف اخیر، عامل‌های فعال |
| Tasks | لیست، جستجو، فیلتر، CRUD |
| Task Detail | ۵ تب: Overview, Steps, Logs, Artifacts, Collaboration |
| Memory Explorer | جستجو و مدیریت حافظه AI |
| Artifacts Viewer | نمایش و مدیریت فایل‌های خروجی |
| Computer Control | Session، Screenshot، Terminal، IDE (VS Code, Windsurf, Cursor) |
| Settings | تم، زبان، workspace، مدل‌های AI، امنیت |
| Agent Collaboration | نمای همکاری چند عاملی |
| External Supervision | نظارت ابزارهای خارجی |

**تکنولوژی**: React 19 + Tauri + Vite + TailwindCSS v4 + Zustand

**کامپوننت‌های بدون استفاده**: ChatInterface, TaskPanel, AdaptiveNav, MainLayout, DevinLayout, WorkflowBoard

**اجرا**:
```bash
cd Agent/Agent/winfsurf-20/taskflow/TaskFlowDesktop && npm run dev
```

---

### ۳.۴ ابزارهای GSC (Google Search Console)

| اسکریپت | کاربرد |
|---------|--------|
| `gsc_export_all.py` | خروجی کامل به JSON |
| `gsc_fetch_data.py` | دریافت از API گوگل |
| `gsc_sync_to_google_sheets.py` | همگام‌سازی با Google Sheets |
| `gsc_cli.py` | CLI یکپارچه |
| `gsc_one_click.py` | اجرای سریع |
| `upload_gsc.py` | آپلود داده به سرور |

**پیش‌نیاز**: `GSC_KEY_FILE` (کلید Service Account گوگل)

---

## 🔐 ۴. امنیت و Secrets

| مورد | محل | توضیح |
|------|-----|-------|
| کلیدهای API | `.env` (در git نیست) | JWT، پرداخت، SMS، AI |
| GSC Key | `*-key.json` (در git نیست) | Service Account گوگل |
| SSH Deploy | GitHub Secrets | `DEPLOY_SSH_KEY` |
| OpenAI | GitHub Secrets / .env | `OPENAI_API_KEY` |

---

## 🚀 ۵. دیپلوی

### SEO Dashboard

**خودکار (GitHub Actions)**:
- تریگر: push به `main` با تغییر در `seo-dashboard/**`
- مقصد: 212.80.24.203 (agent.amline.ir)
- Secrets: `DEPLOY_SSH_KEY`, `OPENAI_API_KEY`

**دستی**:
```powershell
# تنظیم متغیرها
$env:DEPLOY_PASSWORD = "..."
$env:OPENAI_API_KEY = "sk-..."

# اجرا
.\deploy-seo-amline.ps1
# یا
python deploy_amline.py
```

### پلتفرم املاین

```bash
docker compose up -d --build
```

---

## 📁 ۶. ساختار فایل‌های کلیدی

```
e:\CTO\
├── .env.example              # نمونه متغیرهای محیطی
├── .env.deploy.example       # نمونه برای دیپلوی
├── docker-compose.yml        # اورکستریشن سرویس‌ها
├── DEPLOY_INSTRUCTIONS.md    # راهنمای دیپلوی
├── PROJECT_ONBOARDING_REPORT.md   # آنبوردینگ
├── PROJECT_COMPLETE_SUMMARY.md   # این سند
│
├── seo-dashboard/            # داشبورد سئو
│   ├── src/app/page.tsx      # صفحه اصلی
│   ├── src/app/api/          # API routes
│   └── DEPLOY_PARMIN.md      # راهنمای پارمین
│
├── Agent/.../taskflow/        # Agent Windsurf Amline
│   ├── TaskFlowDesktop/      # اپ دسکتاپ
│   ├── CODE_REVIEW_REPORT.md
│   └── TECHNICAL_ONBOARDING.md
│
├── scripts/                  # GSC و deploy
├── docs/                     # مستندات
└── .github/workflows/        # CI/CD
```

---

## 🔗 ۷. وابستگی‌ها و جریان داده

```
Google Search Console API
        │
        ▼
scripts/gsc_export_all.py ──► gsc_full_export.json
        │                           │
        │                           ▼
        │                   seo-dashboard (خواندن از /api/gsc)
        │                           │
        │                           ▼
        └──────────────────► AIChat (context برای چت)
                                    │
                                    ▼
                            AMLINE_AI_URL (سرویس AI)
```

```
docker-compose
    │
    ├── postgres ◄── backend
    ├── redis ◄──── backend
    ├── minio ◄──── backend, pdf-generator
    ├── backend ◄── admin-ui, amline-ui, site
    └── seo-dashboard (مستقل، فقط داده GSC)
```

---

## ⚠️ ۸. نکات مهم

1. **backend/backend**: در git نیست؛ مخزن جدا یا embedded است.
2. **docs/gsc_data/*.json**: در git نیست؛ داده باید با اسکریپت‌ها regenerate شود.
3. **Agent Windsurf Amline**: مستقل از پلتفرم املاین؛ Mock backend دارد.
4. **SEO Dashboard**: می‌تواند standalone یا داخل docker-compose اجرا شود.
5. **دو سرور دیپلوی**: 212.80.24.203 (agent) و 212.80.24.109 (seo).

---

## 📌 ۹. دستورات سریع

```bash
# کل پلتفرم
docker compose up -d --build

# فقط SEO Dashboard
cd seo-dashboard && npm run dev

# Agent Windsurf Amline
cd Agent/Agent/winfsurf-20/taskflow/TaskFlowDesktop && npm run dev

# GSC Export
python scripts/gsc_export_all.py
```

---

## 🔟 ۱۰. مخزن `Amline_namAvaran` — وضعیت و اقدامات (آوریل ۲۰۲۶)

### ۱۰.۱ نمای کلی

| مورد | مقدار |
|------|--------|
| **Remote** | `https://github.com/m-khonyagar/Amline_namAvaran.git` |
| **شاخه‌های فعال** | `main`, `staging` (همگام با main پس از تغییرات اخیر) |
| **ساختار** | مونوریپو npm workspaces: `admin-ui`, `site`, `packages/amline-ui-core`؛ بک‌اند در `backend/backend` |

### ۱۰.۲ admin-ui (پنل مدیریت — Vite + React)

| مورد | جزئیات |
|------|--------|
| **پورت dev** | `3002` (`vite.config.ts` — `server.port`) |
| **اجرای محلی** | `cd admin-ui && npm run dev` — سپس مثلاً `http://127.0.0.1:3002/login` |
| **تست E2E** | `cd admin-ui && npm run test:e2e` (Playwright؛ سرور dev به‌صورت خودکار بالا می‌آید) |

### ۱۰.۳ اقدامات انجام‌شده (جمع‌بندی فنی)

1. **Playwright / CI (`admin-ui-e2e`)**
   - سلکتور دکمهٔ ویزارد با برچسب واقعی **`شروع قرارداد (ثبت در سرور)`** (ثابت `WIZARD_SUBMIT_SERVER_LABEL` در `admin-ui/tests/e2e-helpers.ts`)؛ جلوگیری از تداخل با «شروع قرارداد جدید» (DraftBanner).
   - helperهای **`gotoAmline`** (`domcontentloaded`) و **`ensureSidebarOpen`** برای پایداری ناوبری.
   - **`viewport: 1440×900`**, **`workers: 2`**, **`timeout: 90s`** در `playwright.config.ts` برای کاهش فشار روی یک سرور Vite و نمایش پایدار سایدبار دسکتاپ.
   - **`real-auth-smoke`**: فقط با **`REAL_AUTH_E2E=1`** اجرا می‌شود (با MSW/ورود آزمایشی سازگار نیست).
   - اصلاح فلوهای **`e2e.spec.ts`** و **`full-user-flow.spec.ts`** (دکمهٔ «برای دیگران»، سایدبار، ویزارد).

2. **هاب تست مسیرها (`/dev/test-hub`)**
   - در حالت **DEV** مسیر **`/dev/test-hub`** در ریشهٔ `App.tsx` (بدون `MainLayout` / بدون نیاز به ورود) برای نمایش فهرست لینک‌ها از `localTestHubRoutes.ts`.
   - در صفحهٔ ورود، لینک dev: **«فهرست همهٔ مسیرها برای تست (بدون ورود)»**.
   - **`PermissionGuard`**: در dev به‌صورت پیش‌فرض همهٔ صفحات را باز می‌کند؛ با **`VITE_DEV_VIEW_ALL_PAGES=false`** در `.env.local` می‌توان RBAC واقعی را در dev آزمود.

3. **Git / کیفیت**
   - کامیت‌های نمونهٔ اخیر روی `main`: اصلاح E2E، هاب تست، گارد dev.
   - حذف gitlink شکستهٔ **`Agent/Amline test`** از ایندکس (قبلاً در تاریخچهٔ مخزن).

### ۱۰.۴ CI مرتبط

- **`.github/workflows/ci.yml`**: جاب **`admin-ui-e2e`** — نصب مونوریپو، Playwright Chromium، `npm run test:e2e` از پوشهٔ `admin-ui`.

### ۱۰.۵ نکات عملی برای توسعه‌دهنده

- اگر مرورگر **«connection refused»** روی پورت ۳۰۰۲ داد، ابتدا **`npm run dev`** در `admin-ui` را اجرا کنید.
- برای فهرست URLها در dev: **`/dev/test-hub`**.

### ۱۰.۶ چند اپ روی یک سرور (استقرار)

- قرارداد مسیرها: **`/opt/apps/<app>/<env>/<role>/`** — اسکریپت مشترک SPA: **`/opt/apps/_shared/spa_static_server.py`** — ثبت پورت روی سرور: **`/opt/apps/_registry/ports.txt`**.
- systemd: الگوی **`appsvc-<app>-<env>-<role>.service`** و هدف تجمیعی **`multi-app-static.target`**.
- مستندات و چک‌لیست اپ جدید: **`infra/multi-app-server/`** — ثابت‌های پیش‌فرض در **`scripts/server_layout_constants.py`**.

---

**این سند خلاصه جامع پروژه است. برای جزئیات هر بخش به مستندات اختصاصی مراجعه کنید.**
