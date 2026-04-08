# مشخصات محصول املاین — مبتنی بر ریپوی GitHub (v5.0 sync)

**منبع:** درخت `main` پس از هم‌ترازی `feat(v5.0-sync)` — فقط کد و فایل‌های موجود در [`Amline_namAvaran`](https://github.com/m-khonyagar/Amline_namAvaran).  
**SSOT تکمیلی:** [`AMLINE_MASTER_SPEC.md`](./AMLINE_MASTER_SPEC.md)، [`FRONTEND_API_INTEGRATION.md`](./FRONTEND_API_INTEGRATION.md)، [`INTEGRATIONS.md`](./INTEGRATIONS.md).

---

## ۱. معماری لایه‌ای

| لایه | مسیر ریپو | نقش |
|------|-----------|-----|
| API | `backend/backend/app` | FastAPI؛ `platform_router` روی **`/api/v1/*`** و mount دوم بدون پیشوند (legacy) |
| داده | `backend/backend/app/models` + Alembic | PostgreSQL در پروداکشن؛ تست‌ها SQLite در حافظه |
| فرانت ادمین | `admin-ui/` | Vite + React؛ پروکسی dev به بک‌اند |
| فرانت کاربر | `amline-ui/` | Next.js App Router |
| مارکتینگ | `site/` | Next export |
| زیرساخت | `docker-compose.yml` | Postgres، Redis، MinIO، backend، فرانت‌ها، pdf-generator، seo-dashboard |
| یکپارچه‌سازی | profile `integrations` در compose | Meilisearch، n8n، Thumbor، Metabase، Tempo، Loki، Promtail، Prometheus، Grafana، OTEL، Temporal، ml-pricing، Synapse |

---

## ۲. ماژول‌های HTTP (v1)

از [`app/api/v1/router.py`](../backend/backend/app/api/v1/router.py): سلامت، احراز، قراردادها، CRM (legacy + v1 DB)، ویزیت، کیف‌پول، پرداخت/PSP، حقوقی، رجیستری، نوتیفیکیشن، جغرافیا، post-launch (بتا، پشتیبانی، billing، KPI، توصیه، ops)، امنیت/RBAC، لیستینگ، رسانه، **meta** (چندآژانسی)، Growth (AI، چت، امتیاز، موبایل، جستجو، آنالیتیکس، عمومی)، **integrations** (Meili، Thumbor preset، Temporal status، …).

---

## ۳. قابلیت‌های v5.0 (پس از sync)

- **Observability:** [`docs/runbooks/OBSERVABILITY.md`](./runbooks/OBSERVABILITY.md)، provisioning Grafana، Loki، Tempo، Prometheus (شامل scrape ml-pricing).
- **Metabase:** SQL نمونه در `integrations/metabase/sql/`؛ راهنما `METABASE_SETUP.md`.
- **n8n:** `integrations/n8n/amline-lead-visit-contract.json` + README.
- **Thumbor:** presetها در `app/core/thumbor_urls.py`؛ `GET .../integrations/thumbor/presets`؛ آپلود با `?preset=`.
- **ML pricing:** سرویس `services/ml-pricing` + `CompositePricingEngine` با retry و متریک؛ اسکریپت `scripts/ml/train_pricing_baseline.py`.
- **چند آژانس:** `agency_scope.py`، `GET /api/v1/meta/context`، هدر `X-Agency-Id` در ادمین.
- **Billing:** API در `launch_routes`؛ UI ادمین `/billing`؛ `amline-ui/app/billing`.
- **Temporal:** `app/temporal/*` + worker در compose.
- **Matrix:** آداپتور + `MATRIX_SETUP.md` + سرویس synapse (profile).
- **توصیه:** `recommendation_cf.py` + `GET .../recommendations/listings`.
- **فرانت SSOT:** `FRONTEND_API_INTEGRATION.md` + `docs/generated/frontend-http-inventory.json` (تولید با `scripts/inventory_frontend_http_calls.py`).

---

## ۴. وضعیت قبل از sync (بدهی فنی تاریخی)

شاخهٔ `main` قبلی بک‌اند را تقریباً به حد «اسکلت سلامت + چند مدل» کاهش داده بود در حالی README پلتفرم کامل را توصیف می‌کرد — **ناهم‌خوانی مستند و کد**. این commit با همگام‌سازی بک‌اند و اسناد v5.0 آن شکاف را می‌بندد.

---

## ۵. بدهی / کار باز پیشنهادی

- باز کردن تاریخچهٔ کامل git (`git fetch --unshallow`) اگر کلون کم‌عمق است.
- مهاجرت تدریجی فراخوانی‌های `legacy_mount` به `canonical_v1` طبق inventory.
- قرارداد دائمی DB به‌جای store حافظه‌ای قرارداد (roadmap محصول).

---

## ۶. استقرار

- محلی: `README.md` و `docker-compose.yml`.
- CI: `.github/workflows/ci.yml` — pytest روی `app/`، کنترل drift فهرست مسیرهای فرانت.
