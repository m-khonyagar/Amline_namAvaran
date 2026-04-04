# Amline — پلتفرم هوشمند قرارداد ملکی

> **SSOT بک‌اند:** مسیر استاندارد توسعه و پروداکشن **`backend/backend`** (FastAPI + PostgreSQL) است؛ قرارداد **`/api/v1/*`** و مسیرهای legacy روی همان اپ. **`dev-mock-api`** فقط جایگزین سبک وقتی بک‌اند کامل در دسترس نیست. راهنمای یکپارچگی فرانت: [`docs/FRONTEND_API_INTEGRATION.md`](docs/FRONTEND_API_INTEGRATION.md) — فهرست ماشین‌خوان مسیرها: [`docs/generated/frontend-http-inventory.json`](docs/generated/frontend-http-inventory.json).

## ساختار پروژه

| پروژه | تکنولوژی | پورت | وضعیت |
|-------|----------|------|--------|
| `admin-ui/` | React + Vite | 3002 | ✅ کامل |
| `amline-ui/` | Next.js 14 (App Router) | 3000 | ✅ کامل |
| `site/` | Next.js 15 (Static Export) | 3001 | ✅ کامل |
| `dev-mock-api/` | FastAPI | 8080 | ⚠️ مکمل (بدون DB) |
| `pdf-generator/` | FastAPI | 8001 | ✅ موجود |
| `seo-dashboard/` | — | 3003 | ✅ موجود |
| `backend/backend/` | FastAPI + PostgreSQL | 8080 | ✅ آماده |

> **توجه:** `amline-ui` از **App Router** استفاده می‌کند (نه Pages Router).

---

## شروع سریع — توسعه با backend واقعی

```powershell
# ۱. کپی env و اجرای همه سرویس‌ها با Docker
cp .env.example .env
docker-compose up -d postgres redis minio

# ۲. اجرای backend (پورت 8080)
cd backend/backend
cp .env.example .env   # مقادیر را تنظیم کنید
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload

# ۳. admin-ui (پورت 3002)
cd admin-ui
npm install
# در .env.local: VITE_USE_MSW=false و VITE_DEV_PROXY_TARGET=http://127.0.0.1:8080
npm run dev
```

## شروع سریع — توسعه بدون backend کامل (mock)

> فقط برای UI ساده یا وقتی Postgres/Redis ندارید. برای CRM پایگاه‌داده، پرداخت، لیستینگ v1 و … از بخش «با backend واقعی» استفاده کنید.

```powershell
# ۱. اجرای mock API (پورت 8080)
cd dev-mock-api
.\run.ps1

# ۲. admin-ui (پورت 3002) — در ترمینال جداگانه
cd admin-ui
npm install
npm run dev

# ۳. amline-ui (پورت 3000) — در ترمینال جداگانه
cd amline-ui
npm install
npm run dev
```

### متغیرهای محیطی

`admin-ui/.env.local` (پیش‌فرض آماده است):
```env
VITE_USE_MSW=true          # MSW برای mock در مرورگر
VITE_ENABLE_DEV_BYPASS=false  # ورود آزمایشی — فقط برای dev و صریحاً true
VITE_DEV_PROXY_TARGET=http://127.0.0.1:8080
VITE_API_URL=
VITE_USE_CRM_API=false
```

`amline-ui/.env.local`:
```env
NEXT_PUBLIC_DEV_PROXY_TARGET=http://localhost:8080
NEXT_PUBLIC_ENABLE_DEV_BYPASS=false
```

---

## اجرا با Docker Compose (همه سرویس‌ها)

```bash
cp .env.example .env
docker-compose up -d
```

> **نکته:** قبل از اجرا یک `.env` از `.env.example` بساز و مقادیر را تنظیم کن.

---

## معماری

```
site (3001)          amline-ui (3000)       admin-ui (3002)
  │                       │                      │
  └───────────────────────┴──────────────────────┘
                           │
              backend/backend (8080) ← توسعهٔ استاندارد + production
              dev-mock-api (8080)     ← اختیاری (بدون DB)
                           │
              postgres / redis / minio
```

---

## ماژول‌های admin-ui

| مسیر | مجوز | توضیح |
|------|------|-------|
| `/dashboard` | — | KPI، دسترسی سریع |
| `/contracts` | `contracts:read` | لیست و جزئیات قراردادها |
| `/contracts/wizard` | `contracts:read` | ویزارد انعقاد قرارداد |
| `/crm` | — | مدیریت لیدها (Kanban) |
| `/users` | `users:read` | مدیریت کاربران |
| `/wallets` | `wallets:read` | کیف پول |
| `/admin/roles` | `roles:read` | نقش‌ها و مجوزها |
| `/admin/audit` | `audit:read` | لاگ ممیزی |
| `/admin/activity` | `reports:read` | گزارش فعالیت کارشناس |
| `/settings` | `settings:read` | تنظیمات پروفایل و سیستم |

---

## Endpoints اصلی dev-mock-api

| گروه | Endpoint | توضیح |
|------|----------|-------|
| Auth | `GET /auth/me` | اطلاعات کاربر + permissions |
| Auth | `POST /admin/otp/send` | ارسال OTP |
| Auth | `POST /admin/login` | ورود |
| Roles | `GET/POST /admin/roles` | نقش‌ها |
| Roles | `PATCH /admin/roles/{id}` | ویرایش نقش |
| Audit | `GET/POST /admin/audit` | لاگ ممیزی |
| Activity | `GET /admin/staff/activity` | فعالیت کارشناس |
| Metrics | `GET /admin/metrics/summary` | KPI داشبورد |
| Notifications | `GET /admin/notifications` | اعلان‌ها |
| CRM | `GET/POST /admin/crm/leads` | لیدها |
| CRM | `PATCH /admin/crm/leads/{id}` | ویرایش لید |
| CRM | `GET/POST /admin/crm/leads/{id}/activities` | فعالیت لید |
| Contracts | `POST /contracts/start` | شروع قرارداد |
| Contracts | `GET /contracts/list` | لیست قراردادها |

---

## تست

```bash
# unit tests (admin-ui)
cd admin-ui && npm test

# e2e admin-ui (طبق playwright.config خود پروژه)
cd admin-ui && npx playwright test

# e2e amline-ui — بک‌اند واقعی با run_e2e_server روی 8080 (نه dev-mock-api)
cd amline-ui && npx playwright test
```

---

## Sweep AI (توسعهٔ خودکار)

پیکربندی روی **`main`**: `sweep.yaml` + `.sweep.yaml`؛ Issue با عنوان **`Sweep: ...`** و برچسب **`sweep`**. لینک قدیمی **`github.com/apps/sweep-ai`** دیگر ۴۰۴ است؛ برای بات GitHub باید **Sweep خودمیزبان** طبق [`docs/SWEEP_RUNBOOK.md`](docs/SWEEP_RUNBOOK.md) — قالب Issue: **Sweep SSOT task**.

---

## مجوز

© ۱۴۰۳ اَملاین — تمامی حقوق محفوظ است
