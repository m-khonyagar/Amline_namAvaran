# دیاگرام معماری پلتفرم اَملاین (Amline)

این سند **نمای کامل** لایه‌های پلتفرم، سرویس‌ها، جریان داده و استقرار را با **Mermaid** ارائه می‌کند. در GitHub و ابزارهایی که Mermaid را رندر می‌کنند، نمودارها به‌صورت خودکار نمایش داده می‌شوند.

---

## ۱) نمای زمینه (C4 — System Context)

کاربران بیرونی و سیستم‌های همسایه نسبت به **پلتفرم اَملاین** به‌عنوان یک جعبهٔ سیاه.

```mermaid
flowchart TB
  subgraph actors["کاربران و نقش‌ها"]
    U1["مصرف‌کننده / مالک ملک"]
    U2["مشاور املاک"]
    U3["ادمین / کارشناس پشتیبانی"]
    U4["بازدیدکننده سایت"]
  end

  AM["پلتفرم اَملاین<br/>(قرارداد دیجیتال، داشبورد، CRM)"]

  subgraph ext["سرویس‌های بیرونی"]
    SMS["ارسال SMS / OTP"]
    PAY["درگاه پرداخت"]
    DNS["DNS / CDN"]
    AI["OpenAI و ابزارهای AI"]
    GSC["Google Search Console"]
  end

  U1 --> AM
  U2 --> AM
  U3 --> AM
  U4 --> AM
  AM --> SMS
  AM --> PAY
  AM --> DNS
  AM --> AI
  AM --> GSC
```

---

## ۲) نمای کانتینرها (C4 — Containers)

برنامه‌های فرانت، APIها و زیرساخت داخل مرز سازمانی (شبکهٔ Docker: `amline-network`).

```mermaid
flowchart TB
  subgraph clients["کلاینت‌ها — مرورگر"]
    B1["amline-ui :3000<br/>Next.js — کاربر نهایی"]
    B2["admin-ui :3002<br/>Vite — ادمین"]
    B3["consultant-ui :3004<br/>Vite — مشاور"]
    B4["site :3001<br/>Next.js — بازاریابی"]
    B5["seo-dashboard :3003<br/>Next.js — سئو + GSC"]
  end

  subgraph api["لایهٔ API"]
    BE["backend<br/>FastAPI :8080→8000"]
    PDF["pdf-generator<br/>FastAPI :8001"]
    MOCK["dev-mock-api<br/>FastAPI :8080<br/>(فقط توسعه)"]
    GW["channel-gateway :3090<br/>HTTP webhooks — تلگرام/بله/ایتا"]
  end

  subgraph data["داده و صف"]
    PG[("PostgreSQL :5432")]
    RD[("Redis :6379")]
    S3[("MinIO S3 :9000 / کنسول :9001")]
    RMQ[("RabbitMQ<br/>profile: optional")]
  end

  B1 --> BE
  B2 --> BE
  B3 --> BE
  B4 --> BE
  B5 --> BE
  BE --> PG
  BE --> RD
  BE --> S3
  BE -.-> RMQ
  BE --> PDF
  PDF --> S3
  B1 -.->|"لوکال / MSW"| MOCK
```

---

## ۳) توپولوژی استقرار Docker (Production-style)

نگاشت سرویس‌های تعریف‌شده در `docker-compose.yml` (پورتهای میزبان نمونه).

```mermaid
flowchart LR
  subgraph host["میزبان / سرور"]
    subgraph net["amline-network (bridge)"]
      direction TB
      FE["Frontends<br/>3000 / 3001 / 3002 / 3003 / 3004"]
      BE2["backend:8000"]
      PDF2["pdf-generator"]
      PG2["postgres"]
      RD2["redis"]
      MI["minio"]
      DBI["db-init<br/>(migrations)"]
      MII["minio-init<br/>(buckets)"]
    end
  end

  FE --> BE2
  BE2 --> PG2
  BE2 --> RD2
  BE2 --> MI
  PDF2 --> MI
  DBI --> PG2
  MII --> MI
```

---

## ۴) ماتریس اپلیکیشن‌ها (پورت توسعه)

| بسته | پورت نمونه | کاربر اصلی |
|------|------------|------------|
| `amline-ui` | 3000 | متقاضی قرارداد، امضا، نیازمندی، بازار |
| `site` | 3001 | بازاریابی، لندینگ |
| `admin-ui` | 3002 | کاربران، قراردادها، CRM، مشاوران |
| `seo-dashboard` | 3003 (لوکال) | سئو، GSC، چت AI |
| `consultant-ui` | 3004 | ثبت‌نام مشاور، لید، داشبورد |
| `backend` | 8080 | API اصلی |
| `pdf-generator` | 8001 | تولید PDF |
| `dev-mock-api` | 8080 (جایگزین لوکال) | mock توسعه |

---

## ۵) جریان درخواست وب — کاربر نهایی (amline-ui + Backend)

الگوی پراکسی Next (`rewrites`) برای مسیرهای API؛ کوکی `access_token` برای `fetchJson`.

```mermaid
sequenceDiagram
  participant Browser
  participant Next as amline-ui Next.js
  participant API as backend FastAPI

  Browser->>Next: صفحه /browse /contracts /needs
  Browser->>Next: fetch /market/feed /requirements
  Next->>API: proxy به AMLINE_API_BASE
  API-->>Next: JSON
  Next-->>Browser: رندر + داده
```

---

## ۶) سه سطح محصول (مصرف‌کننده / مشاور / ادمین)

```mermaid
flowchart TB
  subgraph L1["سطح ۱ — مصرف‌کننده"]
    A1["amline-ui"]
  end
  subgraph L2["سطح ۲ — مشاور"]
    A2["consultant-ui"]
  end
  subgraph L3["سطح ۳ — پشتیبانی"]
    A3["admin-ui"]
  end

  API["Backend API<br/>consultant/* · admin/* · public routes"]

  A1 --> API
  A2 --> API
  A3 --> API
```

**نمونهٔ قرارداد API مشاور (از `PLATFORM_MULTI_APP.md`):**  
`POST /consultant/auth/register`, `GET /consultant/me`, `GET /consultant/leads` — ادمین: `GET/PATCH /admin/consultants/applications/*`.

---

## ۷) کانال‌های پیام‌رسان (آینده)

```mermaid
flowchart LR
  CH["بله / ایتا / تلگرام"]
  WH["Webhook"]
  NG["NormalizedInboundMessage"]
  INT["Intent سرویس"]
  TK["توکن کوتاه‌عمر"]
  UI["amline-ui /auth/channel-handoff"]

  CH --> WH --> NG --> INT --> TK --> UI
```

---

## ۸) CI/CD — Push به `main`

```mermaid
flowchart LR
  DEV["توسعه‌دهنده"]
  GH["GitHub push main"]
  GA["GitHub Actions<br/>deploy-production.yml"]
  SSH["rsync + SSH"]
  SR["سرور /opt/amline/app"]
  DC["deploy.sh / docker compose"]

  DEV --> GH --> GA --> SSH --> SR --> DC
```

Secrets معمول: `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER` (طبق `DEPLOY.md`).

---

## ۹) توسعهٔ لوکال در مقابل Production

```mermaid
flowchart TB
  subgraph local["Local dev"]
    UI["amline-ui npm run dev"]
    MSW["MSW در admin-ui / consultant-ui"]
    MOCK["dev-mock-api"]
  end
  subgraph prod["Production"]
    BEp["backend + PostgreSQL"]
    FEp["Docker frontends"]
  end

  UI --> MOCK
  UI --> BEp
  MSW -.->|"دو Worker = دو حافظهٔ mock"| MSW
```

---

## ۱۰) زیرساخت داده (خلاصه)

```mermaid
flowchart TB
  BE["backend"]
  PG[("PostgreSQL<br/>دادهٔ تراکنشی")]
  RD[("Redis<br/>کش / سشن / صف")]
  S3[("MinIO<br/>فایل و قرارداد")]
  BE --> PG
  BE --> RD
  BE --> S3
```

---

## نحوهٔ ویرایش و پیش‌نمایش

- **VS Code:** افزونهٔ Mermaid یا پیش‌نمایش Markdown.
- **GitHub:** رندر خودکار در نمای فایل `.md`.
- **Export تصویر:** [Mermaid Live Editor](https://mermaid.live) — کپی بلوک‌های ` ```mermaid ` و خروجی PNG/SVG.

---

## منابع هم‌راستا در مخزن

| سند | موضوع |
|-----|--------|
| `docs/PLATFORM_MULTI_APP.md` | سه سطح محصول + API مشاور |
| `DEPLOY.md` | دیپلوی سرور و Secrets |
| `REPOSITORY_STRUCTURE.md` | ساختار monorepo |
| `docker-compose.yml` | نام سرویس‌ها و پورتها |
