# 📐 سند نیازمندی‌های محصول (PRD) — پلتفرم Amline
## برای تیم فنی — ساخت از صفر با فرآیند حرفه‌ای

---

**نسخه سند:** ۱.۰ — Production Blueprint  
**مخاطب:** Tech Lead، Backend Engineers، Frontend Engineers، DevOps، QA  
**هدف:** راهنمای کامل و قابل اجرا برای ساخت پلتفرم Amline از صفر تا صد  
**منابع SSOT:**
- `docs/AMLINE_MASTER_SPEC.md` (v5.0)
- `docs/ARCHITECTURE_CONTRACT_PLATFORM_PRODUCTION.md`
- `docs/Amline_Complete_Master_Spec_v2.md`
- `docs/CONTRACT_DATA_MODELS.md`
- `docs/SIGNATURE_PAYMENT_SCENARIOS.md`

---

## 📑 فهرست مطالب

| # | بخش | مخاطب |
|---|------|--------|
| ۱ | چشم‌انداز و اهداف | همه |
| ۲ | معماری هدف | Tech Lead، Backend، DevOps |
| ۳ | تکنولوژی Stack | همه |
| ۴ | طراحی پایگاه داده | Backend، DBA |
| ۵ | API Design Contract | Backend، Frontend، QA |
| ۶ | فلوهای کامل یوزر + دیاگرام | Frontend، QA، Design |
| ۷ | ماژول‌های محصول (Feature Modules) | Backend، Frontend |
| ۸ | سیستم قرارداد هوشمند | Backend |
| ۹ | امنیت و RBAC | Security، Backend |
| ۱۰ | یکپارچه‌سازی‌ها | Backend، DevOps |
| ۱۱ | Observability | DevOps |
| ۱۲ | CI/CD و استقرار | DevOps |
| ۱۳ | تست‌پذیری | QA، Backend |
| ۱۴ | نقشه راه اجرایی (Sprint Plan) | Tech Lead، PM |
| ضمیمه | تعاریف، کدهای خطا، چک‌لیست تحویل | همه |

---

## 🎯 بخش ۱: چشم‌انداز و اهداف

### ۱.۱ تعریف محصول

**Amline** یک سوپراپ تخصصی **املاک و قرارداد آنلاین** است که مسیر کامل معاملات ملکی را دیجیتال می‌کند:

```
آگهی ملک → جستجو → لید → بازدید → انتخاب قرارداد → امضای دیجیتال → پرداخت کمیسیون → کد رهگیری
```

### ۱.۲ سه لایه اصلی

```
┌─────────────────────────────────────────────────────────┐
│  amline.ir  |  لندینگ، SEO، معرفی، دانلود اپ            │
├─────────────────────────────────────────────────────────┤
│  app.amline.ir  |  پنل یکپارچه (مشاور + کاربر عادی)    │
├─────────────────────────────────────────────────────────┤
│  admin.amline.ir  |  پنل داخلی (حقوقی، ادمین، مالی)    │
└─────────────────────────────────────────────────────────┘
```

### ۱.۳ اصول طراحی (Design Principles)

| اصل | توضیح |
|-----|--------|
| **Contract-First** | قرارداد aggregate مرکزی است؛ همه سرویس‌ها حول آن می‌چرخند |
| **Ledger Idempotent** | هر عملیات مالی فقط یک‌بار اثر می‌گذارد (idempotency_key) |
| **Saga Pattern** | امضا + پرداخت به‌صورت Saga با امکان rollback |
| **Audit Append-Only** | لاگ حقوقی فقط افزودنی است؛ هرگز ویرایش نمی‌شود |
| **SMS-First Trust** | برای کاربر ایرانی: OTP پیامکی؛ شفافیت در هر گام |
| **Monolith First** | تک‌سرویس FastAPI؛ بدون میکروسرویس غیرضروری |
| **Progressive Migration** | Strangler Fig؛ deploy فیچرهای جدید بدون توقف سیستم |

### ۱.۴ معیارهای موفقیت (KPIs)

| KPI | هدف |
|-----|-----|
| زمان ثبت قرارداد (از شروع تا کد رهگیری) | کمتر از ۱۰ دقیقه |
| نرخ تکمیل امضا | بیشتر از ۸۰٪ |
| P95 پاسخ API | کمتر از ۵۰۰ms |
| Uptime | بیشتر از ۹۹.۵٪ |
| نرخ خطا | کمتر از ۰.۵٪ |

---

## 🏗️ بخش ۲: معماری هدف

### ۲.۱ دیاگرام کلان (C4 — Container Level)

```mermaid
flowchart TB
  subgraph clients [🖥️ Clients]
    Landing["amline.ir\nNext.js Static/SSR\nپورت 3001"]
    AppUI["app.amline.ir\nNext.js 14 App Router\nپورت 3000"]
    AdminUI["admin.amline.ir\nReact 18 + Vite\nپورت 3002"]
  end

  subgraph edge [🔒 Edge Layer]
    CDN["CDN / CloudFront\nکش استاتیک"]
    WAF["WAF\nDDoS، SQL Injection، Rate Limit"]
    GW["API Gateway\nNginx/Traefik\nRouting، Auth Header Forward"]
  end

  subgraph backend [⚙️ Backend — FastAPI Monolith]
    direction TB
    Auth["Auth Service\nOTP، JWT، Session"]
    Contract["Contract Aggregate\nمرکزی‌ترین سرویس"]
    Listing["Listing Service\nآگهی، جستجو"]
    CRM["CRM + Visit\nلید، بازدید، SLA"]
    Payment["Payment Saga\nکیف‌پول، PSP، Ledger"]
    Legal["Legal Review\nصف بررسی حقوقی"]
    Notify["Notification\nSMS، Push"]
    ML["ML Pricing\nقیمت‌گذاری هوشمند"]
    Billing["Billing\nاشتراک آژانس"]
    Audit["Audit Service\nلاگ append-only"]
  end

  subgraph storage [💾 Storage]
    PG[("PostgreSQL 15\nداده اصلی")]
    Redis[("Redis 7\nOTP · Session · Cache")]
    MinIO[("MinIO / S3\nفایل‌ها، اسناد PDF")]
    Meili[("Meilisearch\nجستجوی آگهی")]
  end

  subgraph external [🌐 External]
    PSP["PSP\nزرین‌پال / آیدی‌پی / نکست‌پی"]
    SMS["SMS Gateway\nکاوه‌نگار"]
    Registry["سامانه رهگیری\nکد رسمی"]
    n8n["n8n\nاتوماسیون لید→قرارداد"]
  end

  subgraph obs [📊 Observability]
    OTEL["OpenTelemetry\nCollector"]
    Grafana["Grafana\nDashboard"]
    Loki["Loki\nLogs"]
    Tempo["Tempo\nTracing"]
    Prom["Prometheus\nMetrics"]
  end

  clients --> CDN --> WAF --> GW
  GW --> Auth
  GW --> Contract
  GW --> Listing
  GW --> CRM
  GW --> Payment
  GW --> Legal
  GW --> ML
  GW --> Billing

  Contract --> PG
  Contract --> Redis
  Listing --> PG
  Listing --> Meili
  Payment --> PSP
  Payment --> PG
  Auth --> Redis
  Notify --> SMS
  Contract --> Registry
  Audit --> PG

  backend --> OTEL
  OTEL --> Grafana
  OTEL --> Loki
  OTEL --> Tempo
  OTEL --> Prom
```

### ۲.۲ اصل Strangler Fig (مهاجرت ایمن)

```mermaid
flowchart LR
  subgraph old [سیستم قدیمی]
    OldContract["قرارداد قدیمی\n(in-memory)"]
  end
  subgraph gw [API Gateway]
    FF["Feature Flag\nRouter"]
  end
  subgraph new [سیستم جدید]
    NewContract["Contract Aggregate\n(PostgreSQL)"]
  end

  Client --> FF
  FF -->|"flag=off (0%)"| OldContract
  FF -->|"flag=on (100%)"| NewContract
  FF -.->|"در صورت خطا 500\nfallback"| OldContract
```

**مراحل:**
1. گام ۰: Gateway جلوی همه ترافیک
2. گام ۱: Contract Service جدید در staging
3. گام ۲: ۱٪ ترافیک → سرویس جدید
4. گام ۳: فیچر فلگ رهن/اجاره برای کاربران خاص
5. گام ۴: ۱۰۰٪ ترافیک رهن/اجاره → سیستم جدید
6. گام ۵: سایر انواع قرارداد به ترتیب اولویت
7. گام ۶: حذف کد قدیمی

---

## 💻 بخش ۳: Technology Stack

### ۳.۱ جدول کامل Stack

| لایه | تکنولوژی | نسخه | دلیل انتخاب |
|------|-----------|------|------------|
| **فرانت کاربر** | Next.js + Tailwind CSS | 14.x | App Router، SSR، PWA آماده |
| **فرانت ادمین** | React 18 + Vite + TanStack Query | 18.x | SPA سریع، hot reload |
| **لندینگ** | Next.js Static Export | 15.x | سئو عالی، بدون سرور |
| **کامپوننت مشترک** | `@amline/ui-core` (پکیج داخلی) | — | یکپارچگی طراحی |
| **بک‌اند** | FastAPI (Python 3.11) | 0.104+ | async، typing قوی، Pydantic v2 |
| **ORM** | SQLAlchemy 2 + Alembic | 2.x | migration‌های قابل ردیابی |
| **پایگاه داده** | PostgreSQL 15 | 15 | JSONB، tsvector FTS، قابلیت اطمینان |
| **کش / OTP** | Redis 7 | 7 | TTL، Rate Limit، Session |
| **جستجو** | Meilisearch | 1.x | جستجوی فارسی سریع |
| **Workflow** | Temporal | latest | گردش‌کار طولانی‌مدت |
| **ذخیره فایل** | MinIO / AWS S3 | — | اسناد، PDF قرارداد |
| **پیامک** | کاوه‌نگار (+ fallback mock) | — | OTP، اعلان |
| **Containerization** | Docker + Docker Compose | — | یکنواختی محیط |
| **CI/CD** | GitHub Actions | — | خودکار |
| **Tracing** | OpenTelemetry → Tempo | — | ردیابی توزیع‌شده |
| **Logging** | Loki + Promtail | — | جستجوپذیر |
| **Metrics** | Prometheus + Grafana | — | داشبورد عملیاتی |
| **اتوماسیون** | n8n | — | لید → بازدید → قرارداد |
| **تصویر** | Thumbor | — | resize، watermark |
| **ML** | سرویس جداگانه FastAPI | — | قیمت‌گذاری هوشمند |

### ۳.۲ ساختار Monorepo

```
Amline_namAvaran/
├── admin-ui/              React 18 + Vite — پنل ادمین (پورت 3002)
├── amline-ui/             Next.js 14 — پنل کاربر (پورت 3000)
├── site/                  Next.js 15 — لندینگ (پورت 3001)
├── backend/
│   └── backend/           FastAPI — SSOT بک‌اند (پورت 8080)
│       ├── app/
│       │   ├── api/v1/    مسیرهای API
│       │   ├── models/    SQLAlchemy Models
│       │   ├── services/  Business Logic
│       │   ├── repositories/ Data Access Layer
│       │   ├── schemas/   Pydantic Schemas
│       │   ├── core/      Config، Errors، Auth
│       │   └── adapters/  SMS، PSP، Registry
│       └── alembic/       Migrations
├── packages/
│   └── amline-ui-core/    کامپوننت‌های مشترک
├── services/
│   └── ml-pricing/        سرویس قیمت‌گذاری ML
├── integrations/
│   ├── n8n/               workflow اتوماسیون
│   └── metabase/          SQL queries
├── docker/                config‌های Docker
└── .github/workflows/     CI/CD
```

### ۳.۳ متغیرهای محیطی کلیدی

```dotenv
# پایگاه داده
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/amline

# Redis
REDIS_URL=redis://localhost:6379/0

# OTP / SMS
AMLINE_SMS_PROVIDER=kavenegar       # یا mock برای dev
KAVENEGAR_API_KEY=xxx
AMLINE_OTP_TTL_SECONDS=300
AMLINE_OTP_MAX_ATTEMPTS=5
AMLINE_OTP_LOCKOUT_SECONDS=300
AMLINE_OTP_SEND_WINDOW_SECONDS=3600
AMLINE_OTP_MAX_SENDS_PER_WINDOW=5
AMLINE_OTP_DEBUG=false              # هرگز true در production

# درگاه پرداخت
AMLINE_PSP_PROVIDER=zarinpal        # یا idpay، nextpay، mock
ZARINPAL_MERCHANT_ID=xxx
AMLINE_PSP_WEBHOOK_SECRET=xxx

# RBAC
AMLINE_RBAC_ENFORCE=1               # 0 فقط برای dev

# یکپارچه‌سازی‌ها
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_API_KEY=xxx
AMLINE_SEARCH_BACKEND=meilisearch
AMLINE_ML_PRICING_URL=http://ml-pricing:8090/v1/estimate
AMLINE_N8N_WEBHOOK_URL=http://n8n:5678/webhook/amline
AMLINE_TEMPORAL_HOST=temporal:7233

# MinIO / S3
AMLINE_S3_ENDPOINT_URL=http://localhost:9000
AMLINE_S3_ACCESS_KEY=minioadmin
AMLINE_S3_SECRET_KEY=minioadmin
AMLINE_S3_BUCKET=amline-files

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_SERVICE_NAME=amline-api

# JWT
JWT_SECRET_KEY=xxx
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
```

---

## 🗄️ بخش ۴: طراحی پایگاه داده

### ۴.۱ اصول کلی

- همه جداول: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- تاریخ‌ها: `TIMESTAMPTZ` (با timezone)
- حذف نرم: `deleted_at TIMESTAMPTZ` (بدون DELETE فیزیکی روی داده حساس)
- Ledger: فقط INSERT؛ هرگز UPDATE یا DELETE
- Audit: فقط INSERT؛ ستون `prev_hash` برای زنجیره

### ۴.۲ ERD کامل

```
users
├── id, phone, name, email?, role
├── created_at, updated_at, deleted_at
└── → agency_id (FK → agencies)

agencies
├── id, name, plan, status
└── created_at

contracts ◄── aggregate مرکزی
├── id, ssot_kind (RENT/SALE/EXCHANGE/CONSTRUCTION/PRE_SALE/LEASE_TO_OWN)
├── status, substate
├── terms_json (JSONB — پلی‌مورفیک)
├── external_refs_json (khodnevis_id، tracking_code)
├── created_by_user_id → users
└── created_at, updated_at

contract_parties
├── id, contract_id → contracts
├── party_role (LANDLORD/TENANT/SELLER/BUYER/...)
├── person_type (NATURAL/LEGAL)
├── identity_json (JSONB — اطلاعات هویتی)
├── signed, signed_at
├── signature_method (SELF_OTP/AGENT_OTP/ADMIN_OTP/AUTO)
└── agent_user_id → users

contract_commissions
├── id, contract_id → contracts
├── commission_type, amount
├── paid_by (PARTY_A/PARTY_B/BOTH)
├── status (PENDING/PAID)
└── payment_method (SELF/AGENT/ADMIN)

contract_document_versions  ← immutable پس از امضا
├── id, contract_id → contracts
├── version_no, content_hash
├── json_snapshot (JSONB)
├── status (draft/signed_sealed)
└── created_by → users

contract_sla_rules
├── contract_type, event_type
└── deadline_hours, action_on_expiry

crm_leads
├── id, full_name, mobile, need_type
├── status, assigned_to → users
└── contract_id → contracts

crm_activities
├── id, lead_id → crm_leads
├── type, note
└── user_id → users, created_at

visits
├── id, lead_id → crm_leads
├── listing_id → listings
├── scheduled_at, status
└── outcome_note

listings
├── id, deal_type (RENT/SALE/MORTGAGE)
├── visibility (NETWORK/PUBLIC)
├── status (draft/ready/published/archived)
├── title, description, price_amount
├── location_summary, latitude, longitude
├── area_sqm, room_count
├── owner_id → users, agency_id → agencies
└── search_vector TSVECTOR  ← برای FTS

wallet_ledger_entries  ← append-only
├── id, user_id → users
├── entry_type (CREDIT/DEBIT)
├── amount, currency
├── reference_type, reference_id
├── idempotency_key UNIQUE
├── reversal_of_entry_id → self
└── created_at

payment_intents
├── id, contract_id → contracts
├── party_id → contract_parties
├── amount, currency, status
├── psp_provider, psp_checkout_token, psp_ref
├── idempotency_key UNIQUE
└── created_at, expires_at

disputes
├── id, contract_id → contracts
├── raised_by_party_id → contract_parties
├── category (payment/signature/registry/legal/other)
├── status (open/under_review/resolved/rejected)
├── resolution_type
└── created_at, resolved_at

dispute_evidence
├── id, dispute_id → disputes
├── type (audit_ref/signature_snapshot/upload)
├── storage_uri, hash_sha256
└── submitted_by → users

ledger_holds
├── id, wallet_or_account
├── amount, currency
├── reason (dispute_id)
└── released_at

audit_events  ← append-only، زنجیره hash
├── id UUID, occurred_at TIMESTAMPTZ
├── actor_type (user/system/psp/registry)
├── actor_id, contract_id?, party_id?
├── action (contract.created، signature.completed، ...)
├── ip_address, user_agent, device_hash
├── request_id, payload_json
├── prev_hash, event_hash
└── ← هرگز UPDATE یا DELETE

referral_attributions
├── id, inviter_user_id → users
├── invited_phone_hash
├── contract_id → contracts
└── reward_status, created_at

rbac_roles
├── id, name, permissions TEXT[]
└── is_system

rbac_user_roles
├── user_id → users, role_id → rbac_roles
└── assigned_at, assigned_by → users

provinces, cities
├── id, name, slug
└── province_id (for cities)
```

### ۴.۳ ایندکس‌های ضروری

```sql
-- قرارداد
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_created_by ON contracts(created_by_user_id);
CREATE INDEX idx_contracts_ssot_kind ON contracts(ssot_kind);

-- آگهی
CREATE INDEX idx_listings_visibility_status ON listings(visibility, status);
CREATE INDEX idx_listings_search ON listings USING GIN(search_vector);
CREATE INDEX idx_listings_location ON listings(latitude, longitude);

-- Ledger
CREATE UNIQUE INDEX idx_ledger_idempotency ON wallet_ledger_entries(idempotency_key);
CREATE INDEX idx_ledger_user ON wallet_ledger_entries(user_id);

-- Audit
CREATE INDEX idx_audit_contract ON audit_events(contract_id);
CREATE INDEX idx_audit_actor ON audit_events(actor_id, occurred_at);

-- Payment
CREATE UNIQUE INDEX idx_payment_idempotency ON payment_intents(idempotency_key);
```

---

## 📡 بخش ۵: API Design Contract

### ۵.۱ اصول

- **پیشوند:** همه مسیرها `/api/v1/`
- **فرمت خطا:** `ErrorResponse` یکدست
- **احراز هویت:** هدر `Authorization: Bearer <JWT>` یا کوکی `httpOnly`
- **شناسه درخواست:** هدر `X-Request-Id` (تولید UUID اگر نبود)
- **آژانس:** هدر `X-Agency-Id` (برای محیط چندآژانسی)
- **پیمایش:** Cursor-based pagination (نه offset)

### ۵.۲ ساختار خطا (ErrorResponse)

```json
{
  "error": {
    "code": "CONTRACT_NOT_FOUND",
    "message": "قرارداد یافت نشد.",
    "details": { "contract_id": "uuid-here" },
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "field_errors": null
}
```

**برای خطاهای اعتبارسنجی (422):**
```json
{
  "error": { "code": "VALIDATION_FAILED", "message": "اطلاعات ارسال‌شده معتبر نیست." },
  "field_errors": [
    { "field": "phone", "code": "invalid_format", "message": "شماره موبایل نامعتبر است." }
  ]
}
```

### ۵.۳ کاتالوگ کامل APIها

#### Auth

| متد | مسیر | توضیح | Auth |
|------|------|--------|------|
| POST | `/api/v1/auth/otp/send` | ارسال OTP به موبایل | عمومی |
| POST | `/api/v1/auth/otp/verify` | تأیید OTP + دریافت توکن | عمومی |
| POST | `/api/v1/auth/refresh` | تجدید access token | RefreshToken |
| POST | `/api/v1/auth/logout` | خروج | Bearer |
| GET | `/api/v1/auth/me` | اطلاعات کاربر جاری | Bearer |

#### قرارداد

| متد | مسیر | توضیح |
|------|------|--------|
| POST | `/api/v1/contracts/start` | شروع قرارداد جدید |
| GET | `/api/v1/contracts` | لیست قراردادهای کاربر (cursor pagination) |
| GET | `/api/v1/contracts/{id}` | جزئیات قرارداد |
| GET | `/api/v1/contracts/{id}/status` | وضعیت + گام بعدی |
| DELETE | `/api/v1/contracts/{id}` | لغو (اگر DRAFT) |
| PATCH | `/api/v1/contracts/{id}/terms` | بروزرسانی شرایط (پلی‌مورفیک) |
| PATCH | `/api/v1/contracts/{id}/external-refs` | ثبت khodnevis_id، tracking_code |
| POST | `/api/v1/contracts/{id}/parties` | افزودن طرف |
| PATCH | `/api/v1/contracts/{id}/parties/{party_id}` | ویرایش طرف |
| DELETE | `/api/v1/contracts/{id}/parties/{party_id}` | حذف طرف |
| POST | `/api/v1/contracts/{id}/witnesses` | افزودن شاهد |
| POST | `/api/v1/contracts/{id}/otp/send` | ارسال OTP امضا |
| POST | `/api/v1/contracts/{id}/otp/verify` | تأیید OTP (S1 مستقل) |
| POST | `/api/v1/contracts/{id}/sign` | ثبت امضا |
| POST | `/api/v1/contracts/{id}/sign/agent/request` | درخواست امضا توسط کاتب (S2) |
| POST | `/api/v1/contracts/{id}/sign/agent/verify` | تأیید OTP توسط کاتب |
| POST | `/api/v1/contracts/{id}/sign/admin-assist/request` | درخواست S4 از ادمین |
| POST | `/api/v1/contracts/{id}/sign/admin-assist/verify` | تأیید S4 |
| POST | `/api/v1/contracts/{id}/sign/auto` | امضای خودکار S5 |
| GET | `/api/v1/contracts/{id}/commissions` | لیست کمیسیون‌ها |
| POST | `/api/v1/contracts/{id}/commissions` | ثبت کمیسیون |
| POST | `/api/v1/contracts/{id}/commissions/{cid}/delegate-pay/request` | درخواست P2 |
| POST | `/api/v1/contracts/{id}/commissions/{cid}/delegate-pay/verify` | تأیید P2 |
| POST | `/api/v1/contracts/{id}/disputes` | ثبت اختلاف |
| GET | `/api/v1/contracts/{id}/pdf` | دانلود PDF قرارداد |

#### آگهی

| متد | مسیر | توضیح |
|------|------|--------|
| GET | `/api/v1/listings` | لیست آگهی‌ها (با فیلتر) |
| POST | `/api/v1/listings` | ثبت آگهی جدید |
| GET | `/api/v1/listings/{id}` | جزئیات آگهی |
| PATCH | `/api/v1/listings/{id}` | ویرایش آگهی |
| POST | `/api/v1/listings/{id}/archive` | آرشیو آگهی |
| POST | `/api/v1/listings/{id}/publish` | انتشار آگهی |
| GET | `/api/v1/listings/{id}/meta` | متا SEO آگهی |
| POST | `/api/v1/media/listing-image` | آپلود تصویر |

#### CRM

| متد | مسیر | توضیح |
|------|------|--------|
| GET | `/api/v1/crm/leads` | لیست لیدها |
| POST | `/api/v1/crm/leads` | ثبت لید جدید |
| GET | `/api/v1/crm/leads/{id}` | جزئیات لید |
| PATCH | `/api/v1/crm/leads/{id}` | بروزرسانی لید |
| GET | `/api/v1/crm/leads/{id}/activities` | فعالیت‌های لید |
| POST | `/api/v1/crm/leads/{id}/activities` | ثبت فعالیت |

#### بازدید

| متد | مسیر | توضیح |
|------|------|--------|
| GET | `/api/v1/visits` | لیست بازدیدها |
| POST | `/api/v1/visits` | ثبت بازدید |
| POST | `/api/v1/visits/{id}/schedule` | زمان‌بندی |
| POST | `/api/v1/visits/{id}/outcome` | ثبت نتیجه |

#### کیف‌پول و پرداخت

| متد | مسیر | توضیح |
|------|------|--------|
| GET | `/api/v1/wallets/{user_id}/balance` | موجودی |
| POST | `/api/v1/wallets/{user_id}/ledger` | بستانکار/بدهکار |
| POST | `/api/v1/payments/intents` | ایجاد intent پرداخت |
| GET | `/api/v1/payments/intents/{id}` | وضعیت intent |
| POST | `/api/v1/payments/callback` | webhook PSP |

#### حقوقی و Registry

| متد | مسیر | توضیح |
|------|------|--------|
| GET | `/api/v1/legal/reviews` | صف بررسی |
| POST | `/api/v1/legal/reviews/{id}/decide` | تصمیم تأیید/رد |
| POST | `/api/v1/registry/submissions` | ارسال به سامانه |
| GET | `/api/v1/registry/submissions/by-contract/{id}` | وضعیت |

#### ادمین

| متد | مسیر | توضیح |
|------|------|--------|
| GET | `/api/v1/admin/users` | لیست کاربران |
| PATCH | `/api/v1/admin/users/{id}` | ویرایش کاربر |
| GET | `/api/v1/security/roles` | نقش‌ها |
| PUT | `/api/v1/security/users/{id}/roles` | تنظیم نقش |
| GET | `/api/v1/admin/audit` | لاگ ممیزی |
| GET | `/api/v1/admin/metrics/summary` | متریک‌های داشبورد |
| GET | `/api/v1/billing/plans` | پلن‌های اشتراک |
| GET | `/api/v1/meta/context` | context چندآژانسی |

#### یکپارچه‌سازی

| متد | مسیر | توضیح |
|------|------|--------|
| GET | `/api/v1/search/listings` | جستجوی Meilisearch |
| GET | `/api/v1/ai/pricing/listings/{id}/estimate` | تخمین قیمت ML |
| POST | `/api/v1/ai/requirements` | ثبت نیازمندی ملک |
| GET | `/api/v1/ai/matching/requirements/{id}/suggestions` | پیشنهاد ملک |
| POST | `/api/v1/analytics/events` | ثبت رویداد analytics |
| GET | `/api/v1/geo/provinces` | استان‌ها |
| GET | `/api/v1/geo/provinces/{id}/cities` | شهرهای استان |
| GET | `/api/v1/health` | سلامت سرور |
| GET | `/api/v1/health/metrics` | متریک‌های Prometheus |

---

## 🔄 بخش ۶: فلوهای کامل یوزر

### ۶.۱ فلو ورود و احراز هویت

```mermaid
sequenceDiagram
  autonumber
  actor U as کاربر
  participant FE as Frontend
  participant API as Amline API
  participant SMS as SMS Gateway
  participant Redis as Redis

  U->>FE: وارد کردن شماره موبایل
  FE->>API: POST /api/v1/auth/otp/send {phone}
  API->>Redis: ذخیره OTP با TTL=5min
  API->>SMS: ارسال پیامک با کد 6 رقمی
  SMS-->>U: پیامک OTP
  API-->>FE: {ok, challenge_id, expires_in: 300}

  U->>FE: وارد کردن کد دریافتی
  FE->>API: POST /api/v1/auth/otp/verify {phone, code, challenge_id}
  API->>Redis: تأیید کد + حذف از Redis
  API-->>FE: {access_token, refresh_token, user}
  FE->>FE: ذخیره token در httpOnly cookie

  Note over API,Redis: در صورت کد اشتباه: max 5 بار<br/>پس از 5 بار: قفل 5 دقیقه‌ای
```

### ۶.۲ فلو ثبت قرارداد رهن و اجاره (کامل)

```mermaid
graph TD
  A[کاتب وارد می‌شود] --> B[انتخاب نوع: رهن/اجاره]
  B --> C[POST /contracts/start\ntype: RENT]
  C --> D[فرم موجر\nنام، کد ملی، موبایل]
  D --> E[فرم مستأجر\nنام، کد ملی، موبایل]
  E --> F[اطلاعات ملک\nآدرس، رهن، اجاره]
  F --> G[تاریخ شروع/پایان قرارداد]
  G --> H[شرایط خاص\nاختیاری]
  H --> I[PATCH /contracts/id/terms\nRentTerms]
  I --> J[پیش‌نمایش قرارداد\nنمایش متن کامل]
  J --> K{تأیید کاتب؟}
  K -->|ویرایش| F
  K -->|تأیید| L[ذخیره DRAFT]
  L --> M[ارسال برای امضا]
  M --> N{روش امضا}
  N -->|S1 مستقل| O[ارسال لینک به موجر و مستأجر]
  N -->|S2 کمکی| P[کاتب OTP هر طرف را وارد می‌کند]
  N -->|S4 ادمین| Q[درخواست از ادمین]
  O & P & Q --> R[امضای موجر ✓]
  R --> S[امضای مستأجر ✓]
  S --> T[status: signed_pending_payment]
  T --> U{پرداخت کمیسیون}
  U -->|P1 مستقل| V[لینک پرداخت به هر طرف]
  U -->|P2 کاتب| W[OTP تأیید پرداخت از طرف]
  V & W --> X[پرداخت موجر ✓]
  X --> Y[پرداخت مستأجر ✓]
  Y --> Z[status: payment_complete]
  Z --> AA[صف بررسی حقوقی]
  AA --> AB{تأیید کارشناس؟}
  AB -->|رد| AC[برگشت به DRAFT + دلیل]
  AB -->|تأیید| AD[ارسال به سامانه رهگیری]
  AD --> AE[دریافت کد رهگیری]
  AE --> AF[✅ status: active\nPDF نهایی قابل دانلود]
```

### ۶.۳ فلو امضای S2 (کاتب کمکی)

```mermaid
sequenceDiagram
  autonumber
  actor P as طرف قرارداد
  actor K as کاتب (مشاور)
  participant API as Amline API
  participant SMS as SMS

  K->>API: POST /contracts/{id}/sign/agent/request\n{party_id, agent_user_id: کاتب}
  API->>SMS: OTP به موبایل طرف قرارداد
  SMS-->>P: پیامک «کد: XXXX — برای امضای قرارداد»
  P->>K: «کدم XXXX هست» (حضوری یا تلفنی)
  K->>API: POST /contracts/{id}/sign/agent/verify\n{otp_code: XXXX, party_id, agent_user_id}
  API->>API: تأیید OTP در Redis
  API->>API: ثبت امضا: method=AGENT_OTP, agent_user_id=کاتب
  API->>API: ثبت audit: contract.signature.agent
  API-->>K: ✅ {signed: true, party_id, signed_at}
  API->>SMS: پیامک به طرف: «امضای شما توسط کاتب [نام] ثبت شد»
```

### ۶.۴ فلو پرداخت Split ۵۰/۵۰ (Saga)

```mermaid
sequenceDiagram
  autonumber
  participant A as طرف الف
  participant B as طرف ب
  participant API as Payment Saga
  participant Disc as Discount Service
  participant L as Ledger
  participant PSP as درگاه پرداخت

  API->>Disc: محاسبه کمیسیون پس از تخفیف
  Disc-->>API: net_amount = X ریال
  API->>L: ذخیره دو PaymentIntent (A: X/2، B: X/2) با idempotency_key
  API->>A: لینک پرداخت سهم الف
  A->>PSP: پرداخت آنلاین
  PSP->>API: POST /payments/callback {status: success, intent_id}
  API->>API: تأیید idempotency (جلوگیری از دوبار)
  API->>L: capture_partyA — ثبت در ledger
  API->>B: لینک پرداخت سهم ب
  B->>PSP: پرداخت آنلاین
  PSP->>API: POST /payments/callback
  API->>L: capture_partyB
  API->>API: status → payment_complete ✅

  Note over API,PSP: در صورت شکست PSP:<br/>status → compensating<br/>reverse_local_ledger<br/>retry با همان idempotency_key
```

### ۶.۵ فلو اختلاف (Dispute)

```mermaid
sequenceDiagram
  autonumber
  actor U as کاربر
  participant API as Contract API
  participant D as Dispute Service
  participant H as Ledger Hold
  participant A as Audit
  participant N as Notification
  participant ADM as کارشناس حقوقی

  U->>API: POST /contracts/{id}/disputes\n{category: payment, description}
  API->>D: openDispute
  D->>H: فریز مبالغ درگیر
  H-->>D: hold_id
  D->>A: ثبت: dispute.opened
  D->>N: اعلان به طرف مقابل + صف حقوقی
  D-->>API: {dispute_id, status: open}
  API-->>U: 201 Created

  ADM->>API: بررسی audit_events + evidence
  alt بازپرداخت کامل
    ADM->>API: resolve: REFUND_FULL
    API->>H: آزادسازی hold
    API->>L: reversal entry
    API->>N: اعلان هر دو طرف
  else رد اختلاف
    ADM->>API: resolve: DISMISS
    API->>H: آزادسازی hold
    API->>N: اعلان نتیجه
  end
```

### ۶.۶ فلو کاربر عادی (جستجو → قرارداد)

```mermaid
graph LR
  A[ورود OTP] --> B[داشبورد]
  B --> C[جستجوی ملک\nMeilisearch]
  C --> D[نتایج با فیلتر\nمنطقه، قیمت، نوع]
  D --> E[مشاهده آگهی\nتصاویر Thumbor]
  E --> F[رزرو بازدید\nتقویم آنلاین]
  F --> G[بازدید از ملک]
  G --> H[تنظیم قرارداد\nویزارد گام‌به‌گام]
  H --> I[امضای دیجیتال OTP]
  I --> J[پرداخت کمیسیون\nدرگاه PSP]
  J --> K[✅ کد رهگیری\nدانلود PDF]
```

### ۶.۷ فلو مشاور (CRM → قرارداد)

```mermaid
graph TD
  A[ورود مشاور] --> B[داشبورد CRM]
  B --> C[لید جدید وارد شد]
  C --> D[بررسی لید\nنام، نیاز، بودجه]
  D --> E[n8n: auto-assign به مشاور]
  E --> F[ثبت فعالیت اول\nتماس تلفنی]
  F --> G{نتیجه تماس؟}
  G -->|علاقه‌مند| H[رزرو بازدید\nPOST /visits]
  G -->|عدم علاقه| I[بستن لید با دلیل]
  H --> J[بازدید انجام شد\nPOST /visits/id/outcome]
  J --> K{نتیجه بازدید؟}
  K -->|توافق| L[شروع قرارداد\nPOST /contracts/start]
  K -->|عدم توافق| M[لید به جستجوی بعدی]
  L --> N[فلو کامل قرارداد\n← بخش ۶.۲]
  N --> O[کمیسیون دریافت شد ✅]
  O --> P[لید: بسته شد / Won]
```

---

## 🧩 بخش ۷: ماژول‌های محصول

### ۷.۱ ماژول Auth

**مسئولیت:** ورود، خروج، مدیریت session

**ویژگی‌های کلیدی:**
- OTP پیامکی با Rate Limiting (Redis)
- JWT با access + refresh token
- کوکی `httpOnly` برای امنیت بالاتر
- متغیر `AMLINE_OTP_DEBUG=false` — هرگز در production فعال نشود
- قفل خودکار پس از ۵ تلاش اشتباه

**قوانین Rate Limiting:**
```
max 5 OTP sends per phone per hour
max 5 verification attempts per challenge
lockout 5 minutes after max attempts exceeded
```

### ۷.۲ ماژول آگهی (Listing)

**مسئولیت:** مدیریت آگهی‌های ملکی

**ویژگی‌ها:**
- نوع: `RENT / SALE / MORTGAGE`
- دید: `NETWORK` (فقط شبکه مشاوران) | `PUBLIC` (عموم)
- وضعیت: `draft → ready_to_publish → published → archived`
- فایل: آپلود MinIO + resize با Thumbor
- جستجو: همگام‌سازی خودکار با Meilisearch پس از هر تغییر
- ML pricing: تخمین قیمت پیشنهادی

### ۷.۳ ماژول CRM

**مسئولیت:** مدیریت لیدها و مشتریان

**State Machine لید:**
```mermaid
stateDiagram-v2
  [*] --> new : ثبت لید
  new --> contacted : اولین تماس
  contacted --> visiting : رزرو بازدید
  visited --> negotiating : بازدید موفق
  negotiating --> contracted : توافق قرارداد
  contracted --> won : قرارداد نهایی
  contacted --> lost : عدم علاقه
  visiting --> lost : لغو بازدید
  negotiating --> lost : عدم توافق
```

**SLA:** هر لید بدون فعالیت `AMLINE_CRM_SLA_HOURS` (پیش‌فرض ۴۸h) → هشدار

### ۷.۴ ماژول بازدید (Visit)

- رزرو با تقویم آنلاین
- اتصال به لید CRM
- اتصال به آگهی (listing)
- ثبت نتیجه و یادداشت
- n8n webhook هنگام ایجاد بازدید

### ۷.۵ ماژول کیف‌پول و پرداخت

**اصل:** Ledger append-only؛ هیچ UPDATE یا DELETE روی `wallet_ledger_entries`

**درگاه‌های PSP پشتیبانی‌شده:**
- زرین‌پال (پیش‌فرض)
- آیدی‌پی
- نکست‌پی
- mock (فقط dev)

**چرخه پرداخت:**
```
createIntent → redirect PSP → user pays → PSP webhook → verify → capture → update ledger
```

### ۷.۶ ماژول Billing

- پلن‌های اشتراک برای آژانس‌ها
- صدور فاکتور ماهیانه
- مدیریت از پنل ادمین و UI کاربر

### ۷.۷ ماژول ML Pricing

- سرویس مستقل FastAPI روی پورت ۸۰۹۰
- مدل baseline قابل آموزش با `train_pricing_baseline.py`
- retry با backoff اگر سرویس در دسترس نباشد (fallback به rule-based)
- متریک Prometheus: `amline_ml_pricing_http_total`

---

## 📝 بخش ۸: سیستم قرارداد هوشمند

### ۸.۱ انواع قرارداد و نقش‌های طرفین

| ssot_kind | نوع | نقش‌های طرفین |
|-----------|-----|---------------|
| `RENT` | رهن و اجاره | `LANDLORD` / `TENANT` |
| `SALE` | خرید و فروش | `SELLER` / `BUYER` |
| `EXCHANGE` | معاوضه | `EXCHANGER_FIRST` / `EXCHANGER_SECOND` |
| `CONSTRUCTION` | مشارکت در ساخت | `LAND_OWNER` / `CONTRACTOR` |
| `PRE_SALE` | پیش‌فروش | `DEVELOPER` / `BUYER` |
| `LEASE_TO_OWN` | اجاره به شرط تملیک | `LESSOR` / `LESSEE` |

### ۸.۲ State Machine کامل قرارداد

```mermaid
stateDiagram-v2
  [*] --> draft : ایجاد
  draft --> awaiting_parties : ارسال دعوت
  awaiting_parties --> signing_in_progress : طرف‌ها آماده
  awaiting_parties --> expired : SLA منقضی (72h)
  signing_in_progress --> signed_pending_payment : همه امضا کردند
  signing_in_progress --> expired : SLA امضا منقضی
  signing_in_progress --> compensating : سوءاستفاده OTP
  signed_pending_payment --> payment_partial : یک طرف پرداخت کرد
  signed_pending_payment --> payment_complete : هر دو پرداختند
  payment_partial --> payment_complete : طرف دوم پرداخت کرد
  payment_partial --> dispute_open : timeout (48h)
  payment_partial --> cancelled : refund طبق سیاست
  payment_complete --> legal_review : نیاز به بررسی
  legal_review --> registry_submitted : تأیید کارشناس
  legal_review --> draft : رد + نسخه جدید (immutable قبلی)
  registry_submitted --> registry_pending : ارسال موفق
  registry_pending --> active : کد رهگیری دریافت شد
  registry_pending --> dispute_open : خطای سامانه
  active --> completed : تعهدات انجام شد
  active --> dispute_open : اختلاف ثبت شد
  dispute_open --> compensating : تصمیم بازپرداخت
  compensating --> cancelled : برگشت وجه ثبت شد
  compensating --> failed_terminal : شکست جبران
  dispute_open --> active : رد اختلاف (dismiss)
```

### ۸.۳ نسخه‌گذاری قرارداد

```
contract_document_versions:
  - version_no: 1 (DRAFT)
  - version_no: 2 (پس از ویرایش)
  - version_no: 3 (signed_sealed) ← IMMUTABLE

پس از signed_sealed:
  - تغییر مستقیم ممنوع
  - رد حقوقی → version_no+1 (نسخه قبلی بدون تغییر می‌ماند)
```

### ۸.۴ Terms پلی‌مورفیک

```python
# backend/app/schemas/v1/contract_terms.py
class RentTerms(BaseModel):
    property_address: str
    rent_amount: int        # ریال
    deposit_amount: int     # ریال
    contract_duration_months: int
    start_date: date
    end_date: date
    special_conditions: str | None = None

class SaleTerms(BaseModel):
    property_address: str
    total_price: int
    payment_plan: list[PaymentPlanItem]
    transfer_date: date
    has_encumbrance: bool
    encumbrance_details: str | None = None

class ExchangeTerms(BaseModel):
    first_property_address: str
    second_property_address: str
    price_difference: int
    payment_plan: list[PaymentPlanItem]

class ConstructionTerms(BaseModel):
    land_address: str
    land_owner_share_percent: int  # مثلاً 40
    contractor_share_percent: int  # مثلاً 60
    estimated_completion_date: date
    penalty_for_delay: int          # ریال/روز

class PreSaleTerms(BaseModel):
    project_name: str
    unit_number: str
    total_price: int
    payment_schedule: list[PaymentStage]
    delivery_date: date
    penalty_for_delay: int

class LeaseToOwnTerms(BaseModel):
    property_address: str
    monthly_rent: int
    contract_duration_months: int
    final_purchase_price: int
    rent_credited_to_price: int
    purchase_option_deadline: date
```

---

## 🔒 بخش ۹: امنیت و RBAC

### ۹.۱ نقش‌های سیستم

| نقش | کد | دسترسی‌های کلیدی |
|-----|-----|-----------------|
| کاربر عادی | `USER` | مشاهده و تنظیم قرارداد خودش |
| مشاور | `AGENT` | همه USER + CRM، آگهی، امضای کمکی |
| کارشناس حقوقی | `SUPPORT_LEGAL` | تأیید/رد قرارداد، بررسی اختلاف |
| پشتیبان فنی | `SUPPORT_TECH` | مدیریت کاربران، لاگ خطا |
| مدیر مالی | `FINANCE` | گزارش مالی، پرداخت دستی P4 |
| سوپرادمین | `SUPER_ADMIN` | همه دسترسی‌ها |

### ۹.۲ Permission Matrix

| مجوز | USER | AGENT | SUPPORT_LEGAL | SUPPORT_TECH | FINANCE | SUPER_ADMIN |
|------|------|-------|---------------|--------------|---------|-------------|
| `contract:create` | ✅ | ✅ | — | — | — | ✅ |
| `contract:read:own` | ✅ | ✅ | — | — | — | ✅ |
| `contract:read:all` | — | — | ✅ | — | — | ✅ |
| `contract:approve` | — | — | ✅ | — | — | ✅ |
| `signature:self` | ✅ | ✅ | — | — | — | ✅ |
| `signature:assist` | — | ✅ | — | — | — | ✅ |
| `listings:write` | — | ✅ | — | — | — | ✅ |
| `crm:read` | — | ✅ | — | ✅ | — | ✅ |
| `users:manage` | — | — | — | ✅ | — | ✅ |
| `payments:manage` | — | — | — | — | ✅ | ✅ |
| `legal:export` | — | — | ✅ | — | — | ✅ |
| `audit:read` | — | — | — | — | — | ✅ |

### ۹.۳ لایه‌های امنیت

```mermaid
flowchart LR
  Req[درخواست] --> WAF[WAF\nSQL Injection، XSS\nDDoS Protection]
  WAF --> RL[Rate Limiter\nNginx / Redis]
  RL --> Auth[Auth Middleware\nJWT Validation]
  Auth --> RBAC[RBAC Check\nPermission per Endpoint]
  RBAC --> BL[Business Logic]
  BL --> Audit[Audit Logger\nAppend-Only]
```

### ۹.۴ امنیت OTP

```
ضدتقلب OTP:
- device_hash (fingerprint مرورگر) + IP در audit_events
- سقف 5 ارسال OTP در ساعت به هر شماره
- قفل 5 دقیقه پس از 5 بار کد اشتباه
- OTP مخصوص هر چالش (challenge_id)
- AMLINE_OTP_DEBUG هرگز در production
```

### ۹.۵ امنیت PSP

```
- idempotency_key برای جلوگیری از دوبار پرداخت
- IP allowlist برای webhook callback
- AMLINE_PSP_WEBHOOK_SECRET در هدر X-PSP-Secret
- verify سمت سرور پس از هر callback
- هیچ DELETE روی ledger_entries
```

---

## 🔌 بخش ۱۰: یکپارچه‌سازی‌ها

### ۱۰.۱ نقشه یکپارچه‌سازی‌ها

```mermaid
graph TB
  subgraph core [هسته Amline]
    API[FastAPI Backend]
  end

  subgraph search [جستجو]
    Meili[Meilisearch\nجستجوی فارسی]
  end

  subgraph media [رسانه]
    MinIO[MinIO S3\nفایل‌ها]
    Thumbor[Thumbor\nپردازش تصویر]
  end

  subgraph analytics [تحلیل]
    PostHog[PostHog\nرفتار کاربر]
    Metabase[Metabase\nBI/گزارش]
  end

  subgraph ops [عملیات]
    Temporal[Temporal\nWorkflow طولانی]
    n8n[n8n\nاتوماسیون لید]
    Matrix[Matrix Synapse\nپیام‌رسان E2EE]
  end

  subgraph external [خارجی]
    PSP[PSP\nدرگاه پرداخت]
    SMS[کاوه‌نگار\nپیامک]
    Registry[سامانه رهگیری]
    OSM[Nominatim/OSM\nنقشه]
  end

  API <-->|sync پس از CRUD| Meili
  API <-->|آپلود + URL| MinIO
  API <-->|URL با preset| Thumbor
  MinIO <-->|HTTP source| Thumbor
  API -->|capture events| PostHog
  API <-->|SQL queries| Metabase
  API <-->|activity hooks| Temporal
  API -->|webhook: lead/visit/contract| n8n
  API <-->|E2EE messaging| Matrix
  API -->|checkout + callback| PSP
  API -->|OTP + notify| SMS
  API -->|submit + polling| Registry
  API <-->|geocoding| OSM
```

### ۱۰.۲ n8n Pipeline

```
رویداد: crm.lead.created
  → n8n: تعیین مشاور بر اساس منطقه و ظرفیت
  → n8n: ارسال SMS به مشاور
  → n8n: ثبت فعالیت اول در CRM

رویداد: visit.created
  → n8n: تأییدیه SMS به مشاور و کاربر
  → n8n: یادآوری ۲۴h قبل از بازدید

رویداد: contract.started
  → n8n: ثبت در Metabase
  → n8n: اعلان به مدیریت (اگر مبلغ بالاتر از آستانه)
```

### ۱۰.۳ Thumbor Presets

| Preset | اندازه | کاربرد |
|--------|--------|--------|
| `thumb` | 150x100 | thumbnail لیست |
| `card` | 400x300 | کارت آگهی |
| `cover` | 800x600 | تصویر اصلی |
| `hero` | 1200x630 | hero section |
| `og` | 1200x630 | Open Graph |

---

## 📊 بخش ۱۱: Observability

### ۱۱.۱ پشته کامل

```
FastAPI → OpenTelemetry SDK → OTel Collector
                                  ├→ Tempo (Traces)
                                  ├→ Prometheus (Metrics)
                                  └→ Loki (Logs)
                                        ↑
                               Promtail ← Docker container logs

Grafana ← reads from: Prometheus + Loki + Tempo
```

### ۱۱.۲ متریک‌های ضروری

| متریک | نوع | توضیح |
|--------|-----|--------|
| `contract_state_total{state}` | Counter | تعداد در هر وضعیت |
| `payment_intent_success_total` | Counter | پرداخت‌های موفق |
| `payment_intent_failure_total` | Counter | پرداخت‌های ناموفق |
| `otp_send_total{provider}` | Counter | OTP ارسال‌شده |
| `otp_rate_limited_total` | Counter | قفل‌های OTP |
| `dispute_open_total` | Counter | اختلافات باز |
| `http_request_duration_seconds` | Histogram | P50/P95/P99 |
| `amline_ml_pricing_http_total{status}` | Counter | درخواست‌های ML |
| `active_contracts_gauge` | Gauge | قراردادهای فعال |

### ۱۱.۳ لاگ ساخت‌یافته

```json
{
  "timestamp": "2026-01-01T12:00:00Z",
  "level": "INFO",
  "service": "amline-api",
  "request_id": "uuid",
  "user_id": "uuid",
  "contract_id": "uuid",
  "action": "contract.signature.completed",
  "duration_ms": 45,
  "ip": "1.2.3.4"
}
```

**قوانین لاگ:**
- هیچ PII (کد ملی، شماره حساب) در لاگ
- هر لاگ حداقل `request_id` داشته باشد
- لاگ `ERROR` باید `stack_trace` داشته باشد

### ۱۱.۴ Alerting Rules (Prometheus)

```yaml
# قرارداد
- alert: HighDisputeRate
  expr: rate(dispute_open_total[5m]) > 0.1
  for: 5m

# پرداخت
- alert: PSPFailureSpike
  expr: rate(payment_intent_failure_total[5m]) > 0.2
  for: 2m

# API
- alert: HighErrorRate
  expr: rate(http_request_duration_seconds_count{status=~"5.."}[5m]) / rate(http_request_duration_seconds_count[5m]) > 0.01
  for: 5m

# OTP
- alert: OTPAbuseDetected
  expr: rate(otp_rate_limited_total[10m]) > 1
  for: 1m
```

---

## 🚀 بخش ۱۲: CI/CD و استقرار

### ۱۲.۱ Pipeline CI/CD

```mermaid
flowchart LR
  subgraph pr [Pull Request]
    Lint[Lint\nflake8، isort، black]
    Type[Type Check\nmypy]
    Test[Tests\npytest + SQLite in-memory]
    UI[UI Tests\nVitest + E2E Playwright]
    Inventory[Inventory Check\nفرانت HTTP calls drift]
  end

  subgraph staging [Deploy to Staging]
    Build[Docker Build]
    Migration[Alembic Migrate]
    Deploy[Docker Compose Up]
    Smoke[Smoke Tests\nE2E روی staging]
  end

  subgraph prod [Deploy to Production]
    Approve[تأیید دستی\nTech Lead]
    BlueGreen[Blue-Green Deploy]
    Rollback[Rollback آماده]
  end

  PR --> pr --> staging --> prod
```

### ۱۲.۲ GitHub Actions Workflows

```
.github/workflows/
├── ci.yml              - PR: lint، type، test، E2E
├── deploy-staging.yml  - push to main → staging
├── deploy-prod.yml     - manual trigger → production
├── repo-hygiene.yml    - بررسی lint، فایل‌های حساس
└── inventory-check.yml - drift فرانت API
```

### ۱۲.۳ Docker Compose (محیط‌ها)

```yaml
# docker-compose.yml (پایه)
services:
  backend:        # FastAPI — پورت 8080
  postgres:       # PostgreSQL 15
  redis:          # Redis 7
  minio:          # ذخیره فایل — پورت 9000
  admin-ui:       # React/Vite — پورت 3002
  amline-ui:      # Next.js — پورت 3000
  site:           # لندینگ — پورت 3001

# profile integrations (محیط کامل)
  meilisearch:    # جستجو — پورت 7700
  n8n:            # اتوماسیون — پورت 5678
  thumbor:        # تصویر
  metabase:       # BI — پورت 3005
  grafana:        # داشبورد — پورت 3010
  loki:           # لاگ — پورت 3100
  tempo:          # tracing — پورت 3200
  prometheus:     # متریک — پورت 9090
  otel-collector: # OTLP — پورت 4318
  temporal:       # workflow — پورت 7233
  temporal-worker:
  ml-pricing:     # ML — پورت 8090
  synapse:        # Matrix messaging
```

### ۱۲.۴ Health Checks

```
GET /api/v1/health        → {status: ok}
GET /api/v1/health/live   → {alive: true}
GET /api/v1/health/ready  → {db: ok, redis: ok, meilisearch: ok}
GET /api/v1/health/metrics → Prometheus format
```

---

## 🧪 بخش ۱۳: تست‌پذیری

### ۱۳.۱ استراتژی تست

| لایه | ابزار | هدف پوشش |
|------|-------|-----------|
| Unit | pytest | > 80% |
| Integration | pytest + TestClient | API endpoints |
| E2E | Playwright | جریان‌های کامل کاربر |
| Load | k6 | SLO confirmation |

### ۱۳.۲ ساختار تست بک‌اند

```
backend/backend/tests/
├── test_auth.py         - OTP، توکن
├── test_contracts.py    - ایجاد، state machine
├── test_signatures.py   - S1-S5
├── test_payments.py     - saga، idempotency
├── test_listings.py     - CRUD، فیلتر
├── test_crm.py          - لید، فعالیت، SLA
├── test_disputes.py     - اختلاف، hold، resolve
├── test_errors.py       - ErrorResponse یکدست
├── test_rbac.py         - مجوزها
└── conftest.py          - fixtures، DB in-memory
```

**قانون کلیدی:**
```python
# همه تست‌ها آفلاین — بدون LLM، SMS، یا PSP واقعی
# mock: SMS → mock adapter
# mock: PSP → mock provider
# mock: Meilisearch → skip or mock client
# DB: SQLite in-memory برای unit، PostgreSQL برای integration
```

### ۱۳.۳ محیط آزمون CI

```yaml
# .github/workflows/ci.yml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_DB: amline_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
```

---

## 📅 بخش ۱۴: نقشه راه اجرایی (Sprint Plan)

### ۱۴.۱ اسپرینت‌های پیشنهادی (تیم ۴ نفر — ۲ هفته هر اسپرینت)

#### اسپرینت ۰ — پایه‌گذاری (هفته ۱)

| وظیفه | مالک | معیار پذیرش |
|--------|------|-------------|
| راه‌اندازی monorepo + Docker Compose پایه | DevOps | همه سرویس‌ها بالا می‌آیند |
| PostgreSQL + Alembic + جداول اصلی | Backend | migrations اجرا می‌شوند |
| Pydantic schemas + ErrorResponse | Backend | تست `test_errors.py` سبز |
| CI pipeline (lint + test) | DevOps | PR block اگر fail |
| env matrix مستند‌شده | همه | `.env.example` کامل |

#### اسپرینت ۱ — Auth + API Gateway (هفته ۲-۳)

| وظیفه | مالک | معیار پذیرش |
|--------|------|-------------|
| Auth: OTP + JWT | Backend | `test_auth.py` سبز |
| Redis برای OTP + Rate Limiting | Backend | قفل پس از ۵ تلاش |
| RBAC middleware | Backend | `AMLINE_RBAC_ENFORCE=1` کار می‌کند |
| API Gateway (Nginx routing) | DevOps | routing صحیح |
| ورود در فرانت ادمین | Frontend | E2E login سبز |

#### اسپرینت ۲ — آگهی + جستجو (هفته ۴-۵)

| وظیفه | مالک | معیار پذیرش |
|--------|------|-------------|
| CRUD آگهی با ORM | Backend | `test_listings.py` سبز |
| Meilisearch sync | Backend | جستجو روی staging کار می‌کند |
| آپلود MinIO + Thumbor | Backend | تصویر با preset قابل دسترسی |
| صفحه آگهی‌ها در ادمین | Frontend | لیست، فیلتر، ویرایش کار می‌کند |
| ML pricing baseline | ML | تخمین قیمت برمی‌گردد |

#### اسپرینت ۳ — قرارداد رهن/اجاره (هفته ۶-۷)

| وظیفه | مالک | معیار پذیرش |
|--------|------|-------------|
| Contract Aggregate + State Machine | Backend | تمام وضعیت‌ها transition می‌کنند |
| OTP امضا S1 + S2 | Backend | `test_signatures.py` سبز |
| ویزارد قرارداد در فرانت | Frontend | E2E کامل ثبت قرارداد |
| PDF generator integration | Backend | دانلود PDF قابل خواندن |
| Alembic migration برای contracts | Backend | migration reversible |

#### اسپرینت ۴ — پرداخت + CRM (هفته ۸-۹)

| وظیفه | مالک | معیار پذیرش |
|--------|------|-------------|
| Ledger + Payment Saga | Backend | idempotency تست شده |
| PSP integration (Zarinpal mock → real) | Backend | `test_payments.py` سبز |
| کیف پول در فرانت | Frontend | موجودی + تاریخچه نمایش داده می‌شود |
| CRM + لید + فعالیت | Backend | `test_crm.py` سبز |
| n8n pipeline لید→بازدید→قرارداد | DevOps | workflow trigger کار می‌کند |

#### اسپرینت ۵ — حقوقی + Dispute + Registry (هفته ۱۰-۱۱)

| وظیفه | مالک | معیار پذیرش |
|--------|------|-------------|
| صف بررسی حقوقی | Backend | `test_legal.py` سبز |
| Dispute + Hold + Settle | Backend | `test_disputes.py` سبز |
| Registry mock → real adapter | Backend | کد رهگیری ثبت می‌شود |
| S4 (ادمین) + S5 (خودکار) | Backend | همه سناریوها امضا کار می‌کند |
| سایر انواع قرارداد (SALE, EXCHANGE, ...) | Backend | هر نوع تست مجزا دارد |

#### اسپرینت ۶ — Observability + امنیت (هفته ۱۲-۱۳)

| وظیفه | مالک | معیار پذیرش |
|--------|------|-------------|
| OpenTelemetry + Tempo + Loki | DevOps | trace از request تا response |
| Grafana dashboard provisioning | DevOps | داشبورد بدون config دستی |
| Security hardening (CORS، headers، ...) | Security | OWASP checklist سبز |
| Load test با k6 | QA | P95 < 500ms زیر 100 RPS |
| Audit export حقوقی + hash chain | Backend | زنجیره hash تأیید می‌شود |

#### اسپرینت ۷ — Launch Preparation (هفته ۱۴)

| وظیفه | مالک | معیار پذیرش |
|--------|------|-------------|
| Staging = production (بدون mock، بدون bypass) | همه | چک‌لیست PRODUCTION_CHECKLIST.md |
| Blue-green deploy | DevOps | rollback در کمتر از ۵ دقیقه |
| Beta test با کاربران محدود | PM | حداقل ۳ قرارداد واقعی |
| Runbook‌های عملیاتی | DevOps | هر alert runbook دارد |
| بک‌آپ DB و disaster recovery تست | DevOps | بازیابی تست شده |

### ۱۴.۲ نمودار Gantt

```
هفته:   1   2   3   4   5   6   7   8   9   10  11  12  13  14
S0:    [===]
S1:        [====]
S2:              [====]
S3:                    [====]
S4:                          [====]
S5:                                [====]
S6:                                      [====]
S7:                                            [====]

فعالیت‌های موازی:
CI/CD:  [==============================================================]
Docs:   [==============================================================]
Design: [============]
```

### ۱۴.۳ وابستگی‌های بحرانی (Critical Path)

```
Auth ← Contract ← Signature ← Payment ← Legal ← Registry ← ACTIVE
  ↑         ↑
RBAC    Ledger (idempotent)
```

---

## 📋 ضمیمه الف — کدهای خطای سیستم

| کد | HTTP | توضیح |
|-----|------|--------|
| `VALIDATION_FAILED` | 422 | خطای اعتبارسنجی Pydantic |
| `UNAUTHORIZED` | 401 | احراز هویت لازم |
| `FORBIDDEN` | 403 | مجوز کافی نیست |
| `CONTRACT_NOT_FOUND` | 404 | قرارداد پیدا نشد |
| `CONTRACT_ALREADY_SIGNED` | 409 | قرارداد قبلاً امضا شده |
| `CONTRACT_INVALID_STATE` | 409 | transition نامعتبر |
| `OTP_INVALID_OR_EXPIRED` | 400 | OTP اشتباه یا منقضی |
| `OTP_RATE_LIMITED` | 429 | تعداد تلاش زیاد |
| `OTP_PHONE_LOCKED` | 423 | شماره قفل شده |
| `PAYMENT_ALREADY_PROCESSED` | 409 | پرداخت قبلاً انجام شده |
| `PAYMENT_INTENT_EXPIRED` | 410 | intent پرداخت منقضی |
| `PSP_ERROR` | 502 | خطای درگاه پرداخت |
| `LISTING_NOT_FOUND` | 404 | آگهی پیدا نشد |
| `SIGNATURE_PARTY_MISMATCH` | 403 | امضاکننده با طرف مطابقت ندارد |
| `DISPUTE_ALREADY_OPEN` | 409 | اختلاف قبلاً باز شده |
| `REGISTRY_UNAVAILABLE` | 503 | سامانه رهگیری در دسترس نیست |
| `INTERNAL_ERROR` | 500 | خطای داخلی |

---

## 📋 ضمیمه ب — چک‌لیست تحویل (Definition of Done)

### بک‌اند هر فیچر:

- [ ] مدل DB با Alembic migration قابل برگشت
- [ ] Pydantic schema ورودی + خروجی
- [ ] Business logic در `services/`
- [ ] Data access در `repositories/`
- [ ] API endpoint با RBAC
- [ ] `ErrorResponse` یکدست برای همه خطاها
- [ ] `X-Request-Id` در همه پاسخ‌ها
- [ ] `audit_events` برای عملیات حساس
- [ ] تست unit با mock
- [ ] تست integration با API TestClient
- [ ] OpenAPI schema بروزرسانی شده

### فرانت هر صفحه:

- [ ] حالت loading
- [ ] حالت error با پیام فارسی
- [ ] حالت empty state
- [ ] مدل خطای `ErrorResponse` پارس می‌شود
- [ ] `X-Request-Id` در همه درخواست‌ها
- [ ] responsive (موبایل + دسکتاپ)
- [ ] RTL صحیح
- [ ] accessibility (aria-label)
- [ ] تست E2E برای جریان اصلی

### DevOps هر محیط:

- [ ] secrets در vault یا env محیط (هرگز در کد)
- [ ] health check کار می‌کند
- [ ] rollback قابل اجراست
- [ ] لاگ‌ها در Loki قابل جستجو
- [ ] متریک‌ها در Grafana نمایش داده می‌شوند
- [ ] alert برای شرایط بحرانی

---

## 📋 ضمیمه ج — قوانین نانوشته (Team Conventions)

### کد بک‌اند:

```python
# ۱. همه handler ها async
async def create_contract(body: CreateContractBody, db: AsyncSession = Depends(get_db)) -> ContractResponse:
    ...

# ۲. همه خطاها از طریق AmlineError یا raise HTTPException با ErrorResponse
raise AmlineError(code="CONTRACT_NOT_FOUND", message="قرارداد یافت نشد.")

# ۳. Ledger فقط INSERT
# ❌ اشتباه: db.query(WalletEntry).filter(...).update(...)
# ✅ درست: entry = WalletEntry(reversal_of_entry_id=old_id, ...)

# ۴. audit برای هر عملیات حساس
await audit_repo.log(actor_id=user_id, action="contract.signed", contract_id=cid)

# ۵. idempotency_key برای همه عملیات مالی
intent = PaymentIntent(idempotency_key=f"{contract_id}:{party_id}:{amount}")
```

### کد فرانت:

```typescript
// ۱. همه fetch از طریق fetchJson helper (X-Request-Id اضافه می‌کند)
const contract = await fetchJson(`/api/v1/contracts/${id}`)

// ۲. خطا از error.code پارس شود
if (error.code === 'OTP_RATE_LIMITED') showMessage('تعداد تلاش بیش از حد مجاز است')

// ۳. هرگز bypass در production
// ❌ if (process.env.VITE_ENABLE_DEV_BYPASS) return fakeData
```

### Git:

```
# نام branch
feat/contract-signature-s2
fix/otp-rate-limit-redis
chore/update-alembic-migration

# commit message
feat(contracts): add S2 agent-assisted signature flow
fix(otp): correct Redis TTL for lockout
test(payments): add idempotency saga tests
```

---

*پایان سند PRD — نسخه ۱.۰*  
*به‌روزرسانی این سند با هر milestone جدید الزامی است.*  
*مرجع: `docs/AMLINE_MASTER_SPEC.md` (SSOT اجرایی)*
