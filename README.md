# Agent Windsurf Amline

پلتفرم جامع مدیریت املاک و قراردادها

## 📁 فهرست پروژه‌ها

| پروژه | مسیر | پورت |
|-------|------|------|
| Backend API | `backend/backend/` | 8080 |
| PDF Generator | `pdf-generator/` | 8001 |
| Admin UI | `admin-ui/` | 3002 |
| Amline UI | `amline-ui/` | 3000 |
| Site | `site/` | 3001 |
| SEO Dashboard | `seo-dashboard/` | 3003 |

📄 **ساختار کامل:** [REPOSITORY_STRUCTURE.md](./REPOSITORY_STRUCTURE.md)

## 🧭 مدیریت Workspace

- `workspace.manifest.json` مرجع مرکزی پروژه‌ها، دسته‌بندی‌ها و دستورهای رایج است.
- `docs/WORKSPACE_OPERATIONS.md` راهنمای راه‌اندازی و اعتبارسنجی کل workspace را توضیح می‌دهد.
- `scripts/bootstrap-workspace.ps1` وابستگی‌های پروژه‌های Node/Python را به‌صورت گروهی نصب می‌کند.
- `scripts/validate-workspace.ps1` برای اجرای lint/build/check در پروژه‌های اصلی استفاده می‌شود.
- `.github/` شامل `CODEOWNERS`، قالب Pull Request، Issue Formها و workflowهای CI/Hygiene است.

---

## 📋 معماری سیستم

این پروژه شامل سرویس‌های زیر است:

```
┌─────────────────────────────────────────────────────────────────┐
│                  Agent Windsurf Amline                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Site       │  │  Amline UI   │  │  Admin UI    │          │
│  │  (Next.js    │  │  (Next.js    │  │  (React +    │          │
│  │   15 App)    │  │  Pages)      │  │   Vite)      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│         └─────────────────┼──────────────────┘                   │
│                           ▼                                      │
│                  ┌──────────────────┐                           │
│                  │   Backend API    │                           │
│                  │   (FastAPI)      │                           │
│                  └────────┬─────────┘                           │
│                           │                                      │
│    ┌──────────────────────┼──────────────────────┐             │
│    │                      │                      │             │
│    ▼                      ▼                      ▼             │
│ ┌──────┐           ┌──────────┐         ┌──────────┐          │
│ │Postgres│          │  Redis   │         │  MinIO   │          │
│ └──────┘           └──────────┘         └──────────┘          │
│                                                             │
│  ┌──────────────────────────────────────────────────┐        │
│  │            PDF Generator (FastAPI)               │        │
│  └──────────────────────────────────────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 شروع سریع

### پیش‌نیازها

- Docker و Docker Compose
- حداقل 4GB RAM
- پورت‌های آزاد: 3000, 3001, 3002, 5432, 6379, 9000, 9001, 8080

### اجرای سریع

```bash
# 1. کپی فایل متغیرهای محیطی
cp .env.example .env

# 2. اجرای تمام سرویس‌ها
docker-compose up -d

# 3. بررسی وضعیت سرویس‌ها
docker-compose ps

# 4. دسترسی به سرویس‌ها
# Backend API:    http://localhost:8080
# Admin UI:      http://localhost:3002
# Amline UI:     http://localhost:3000
# Site:          http://localhost:3001
# MinIO Console:  http://localhost:9001
```

## 📦 سرویس‌ها

### 1. Backend (FastAPI)
- **پورت**: 8080
- **مسیر کد**: `backend/backend/src`
- **مستندات API**: http://localhost:8080/openapi.json

### 2. PDF Generator
- **پورت**: 8001
- **مسیر کد**: `pdf-generator/src`
- **ویژگی‌ها**:
  - تولید PDF قراردادها
  - پشتیبانی از فارسی و تاریخ جلالی
  - ذخیره‌سازی در MinIO

### 3. Admin UI (React + Vite)
- **پورت**: 3002
- **مسیر کد**: `admin-ui/src`
- **ویژگی‌ها**:
  - مدیریت کاربران
  - مدیریت آگهی‌ها
  - مدیریت قراردادها
  - مدیریت کیف پول

### 4. Amline UI (Next.js Pages Router)
- **پورت**: 3000
- **مسیر کد**: `amline-ui`
- **ویژگی‌ها**:
  - داشبورد کاربری
  - آگهی‌ها و قراردادها
  - چت و پیام‌رسانی

### 5. Site (Next.js 15 App Router)
- **پورت**: 3001
- **مسیر کد**: `site`
- **ویژگی‌ها**:
  - صفحات بازاریابی
  - فرود و معرفی
  - Static Export

## 🗄️ دیتابیس

### جداول اصلی

| جدول | توضیحات |
|------|---------|
| users | کاربران سیستم |
| organizations | سازمان‌ها |
| roles | نقش‌ها |
| permissions | مجوزها |
| properties | املاک |
| ads | آگهی‌ها |
| contracts | قراردادها |
| pr_contracts | پیش‌قراردادها |
| wallets | کیف پول |
| transactions | تراکنش‌ها |

## 🔧 توسعه

### اجرای محلی Backend

```bash
cd backend/backend

# نصب وابستگی‌ها
poetry install

# اجرای مایگریشن‌ها
alembic upgrade head

# اجرای سرور
python -m uvicorn src.main:app --reload
```

### اجرای تست‌ها

```bash
# Backend tests
cd backend/backend
pytest tests/

# با coverage
pytest --cov=src tests/
```

## 📝 متغیرهای محیطی

متغیرهای محیطی اصلی را در `.env.example` مشاهده می‌کنید:

```env
# دیتابیس
DATABASE_URL=postgresql://amline:amline_secret@postgres:5432/amline

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=amline_redis_secret

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=amline
MINIO_SECRET_KEY=amline_minio_secret

# JWT
JWT_SECRET=your-jwt-secret
JWT_ALGORITHM=HS256
```

## 🔐 امنیت

- احراز هویت با JWT
- OTP برای ورود
- کنترل دسترسی مبتنی بر نقش (RBAC)
- رمزنگاری رمزهای عبور

## 📱 API های اصلی

### احراز هویت
- `POST /admin/login` - ورود ادمین
- `POST /admin/otp/send` - ارسال OTP
- `POST /admin/otp/verify` - تأیید OTP

### کاربران
- `GET /admin/users` - لیست کاربران
- `GET /admin/users/{id}` - جزئیات کاربر
- `POST /admin/users/create-or-update` - ایجاد/ویرایش

### آگهی‌ها
- `POST /ads/properties` - ایجاد آگهی
- `GET /ads/properties` - لیست آگهی‌ها
- `POST /ads/visit-requests` - درخواست بازدید

### قراردادها
- `POST /admin/contracts/start` - شروع قرارداد
- `POST /admin/pr-contracts/{id}/parties` - اضافه کردن طرفین
- `POST /admin/contracts/{id}/pdf-file` - تولید PDF

### مالی
- `GET /users/wallet` - موجودی کیف پول
- `POST /users/payments` - ایجاد پرداخت
- `POST /users/calculate/rent-commission` - محاسبه کمیسیون

## 🐳 Docker Compose

برای اجرای production:

```bash
# ساخت و اجرا
docker-compose up -d --build

# مشاهده لاگ‌ها
docker-compose logs -f

# توقف
docker-compose down

# حذف volumes
docker-compose down -v
```

## 📄 مجوز

تمامی حقوق محفوظ است © ۱۴۰۳ - اَملاین
