# هم‌راستایی ریپوی املاین با سند مرجع (Spec ↔ Code)

**ریپوی مرجع عمومی:** [github.com/m-khonyagar/Amline_namAvaran](https://github.com/m-khonyagar/Amline_namAvaran)  
**Master اجرایی (SSOT هم‌تراز با کد + هدف):** [`docs/AMLINE_MASTER_SPEC.md`](./AMLINE_MASTER_SPEC.md) (v5.0)  
**Enterprise Master نهایی (ضمیمهٔ یکپارچهٔ اجرای v5.0):** [`docs/AMLINE_ENTERPRISE_MASTER_v5.0.md`](./AMLINE_ENTERPRISE_MASTER_v5.0.md)  
**سند مرجع عمیق (Target دامنه/Blu/عملیات):** [`docs/AMLINE_REFERENCE_V2_2.md`](./AMLINE_REFERENCE_V2_2.md) (v2.7)  
**قرارداد خطا (OpenAPI):** [`docs/openapi/amline-v1-errors.openapi.yaml`](./openapi/amline-v1-errors.openapi.yaml)  
**معماری تکمیل‌شدهٔ قرارداد پروداکشن (Target):** [`ARCHITECTURE_CONTRACT_PLATFORM_PRODUCTION.md`](./ARCHITECTURE_CONTRACT_PLATFORM_PRODUCTION.md) — ماشین حالت، dispute، settlement، audit، SLA، رشد، versioning.  
**محصول قرارداد چندگانه (شش نوع، امضا/پرداخت، Strangler):** [`Amline_Complete_Master_Spec_v2.md`](./Amline_Complete_Master_Spec_v2.md) + [`CONTRACT_DATA_MODELS.md`](./CONTRACT_DATA_MODELS.md) + [`STATUS_MAPPING_v2.md`](./STATUS_MAPPING_v2.md).

این فایل **تک‌منبع** برای تیم است تا بداند کد فعلی کجاست و هدف سند کجاست.

---

## ۱. تفاوت‌های شناخته‌شدهٔ معماری

| موضوع | وضعیت ریپوی GitHub (طبق README) | هدف سند مرجع (§۴، §۷، §۲۷) | اقدام |
|--------|-----------------------------------|-----------------------------|--------|
| پیشوند API | `dev-mock-api`: مسیرهای `/admin/...`، `/contracts/...`؛ **`backend/backend`:** همان legacy + **`/api/v1/*`** شامل listings، CRM DB، visits، wallets، payments، legal، registry، notifications، geo، security (RBAC) | `/api/v1/...` یکپارچه | فرانت: مهاجرت تدریجی از mock به v1؛ OpenAPI کامل |
| قرارداد خطا | **P0#4:** `ErrorResponse` یکدست در `dev-mock-api` + `backend/backend` | `ErrorResponse` + `error.code` enum §۲۷.۴ | تکمیل تدریجی همهٔ کدهای §۲۷؛ mapper خطا در فرانت روی `error.code` |
| بک‌اند توسعه | `dev-mock-api` روی ۸۰۸۰ | `backend/backend` پروداکشن | چک‌لیست هم‌پارتی در §۲ همین فایل |
| amline-ui | **Next.js 14 App Router** (README GitHub) | همان + RTL/Blu §۲۰ | هر جای سند/README که «Pages» گفته → اصلاح به App Router |

---

## ۲. چک‌لیست هم‌پارتی mock ↔ backend

قبل از هر ریلیز، حداقل این موارد باید برای **موجودیت‌های مشترک** (لید، قرارداد، کاربر) یکسان یا عمداً متفاوت مستند شود:

- [x] فهرست ماشین‌خوان مسیرهای فرانت (`docs/generated/frontend-http-inventory.json`) + اسکریپت `scripts/inventory_frontend_http_calls.py` + CI `--check`
- [x] سند SSOT یکپارچگی فرانت/پروکسی/RBAC: [`FRONTEND_API_INTEGRATION.md`](./FRONTEND_API_INTEGRATION.md)
- [ ] شکل JSON لیست/جزئیات لید  
- [ ] فیلدهای قرارداد در `GET list` / `GET detail`  
- [ ] کدهای HTTP برای خطای اعتبارسنجی و ۴۰۳  
- [x] شکل JSON خطا (`error.code`، `field_errors`، `request_id`) — P0#4  
- [ ] رفتار OTP (فقط SMS طبق سند) در mock در برابر staging  

---

## ۳. نگاشت مسیرهای فعلی mock → هدف v1 (پیشنهادی)

| نمونه mock (GitHub README) | هدف canonical (سند) |
|----------------------------|---------------------|
| `GET /auth/me` | `GET /api/v1/me` یا `GET /api/v1/auth/me` |
| `POST /admin/login` | `POST /api/v1/auth/login` |
| `GET /admin/crm/leads` | `GET /api/v1/leads` با scope ادمین |
| `POST /contracts/start` | `POST /api/v1/contracts` |
| *(جدید بک‌اند)* `GET/POST /api/v1/listings`، … | همان (canonical)؛ نسخهٔ legacy: `/listings` |

*جدول کامل هنگام استخراج OpenAPI از کد تکمیل شود.*

**P0#2 (انجام‌شده در `backend/backend`):** مدل جنگوی `app/models/listing.py` حذف از مسیر فعال؛ مرجع فقط در `app/_legacy/django/listing_model_reference.py`. جدول `listings` + Alembic + CRUD طبق Master v3.2.

**P0#3 (انجام‌شده در `backend/backend`):** سرویس OTP (`services/v1/otp_service.py`) + مخزن حافظه (`repositories/v1/otp_repository.py`)؛ آداپتور SMS (`adapters/sms/*`)؛ امضا و شاهد با ممیزی (`ip`، `user_agent`، رویدادهای `signature_events`)؛ مسیرهای `POST .../sign/request`، `.../witness/request`؛ مسیرهای قدیمی `sign`، `sign/verify`، `witness/send-otp`، `witness/verify` با منطق OTP واقعی (بدون شکستن قرارداد پاسخ `ok` برای verify). **باقی‌ماندهٔ پروداکشن:** ذخیرهٔ چالش در Redis/DB، پیاده‌سازی کامل `KavenegarSmsAdapter`، حذف `AMLINE_OTP_DEBUG` در env عملیاتی.

**P0#4 (انجام‌شده):** `schemas/v1/errors.py` (مدل `ErrorResponse`)؛ `core/errors.py` (`AmlineError`، هندلر سراسری، `X-Request-Id`)؛ جایگزینی `HTTPException` در routeهای قرارداد، listings، CRM، ادمین و سرویس OTP؛ تست `tests/test_errors.py`. **`dev-mock-api`:** `unified_errors.py` + همان پوشهٔ JSON خطا و `AmlineError` در `main.py`. برای کلاینتهای قدیمی فیلد **`detail`** نیز پر می‌شود (رشته یا آرایهٔ ۴۲۲).

**P1 (انجام‌شده در `backend/backend`):** مدل‌ها و migration `55e218881a26_*`؛ repositoryهای `p1_repositories.py`؛ routeهای v1 (§۱۲ Master)؛ آداپتورهای `adapters/psp/mock` و `adapters/registry/mock`؛ `core/rbac_deps.py` + seed نقش/مجوز؛ `services/v1/notification_dispatch.py`؛ `core/request_logging.py`؛ تست یکپارچه `tests/test_p1_platform.py`. **`/admin/crm/*`** همچنان in-memory برای سازگاری mock؛ CRM پایگاه‌داده تحت **`/api/v1/crm/*`**. **`dev-mock-api`:** برای P1 endpoint جدیدی اضافه نشده — فرانت تا زمان proxy به `backend` از mock استفاده می‌کند.

**P2 (انجام‌شده در `backend/backend`):** migration `c7f91a2b4c5d_*`؛ مدل `growth.py`؛ `repositories/v1/p2_repositories.py`؛ `services/v1/matching_engine.py`، `pricing_engine.py`؛ `core/simple_cache.py`؛ routeهای `growth_*` (§۱۳ Master) شامل WebSocket چت؛ تست `tests/test_p2_growth.py`. listing: فیلدهای `area_sqm`، `room_count`. **`dev-mock-api`:** همچنان بدون mirror این مسیرها — مسیر canonical فقط روی backend.

**Roadmap (چهار فاز، ۲۰۲۶):** (۱) فرانت → `backend/backend` و `/api/v1`؛ (۲) geo ایران + seed + کش + فرم لید؛ (۳) تثبیت MVP — [`docs/MVP_STABILIZATION.md`](./MVP_STABILIZATION.md)؛ (۴) ops — `app/core/ops.py`، envهای `AMLINE_*`، `scripts/load/k6-smoke.js`، CI با pip. **`dev-mock-api`** در README به‌عنوان fallback علامت‌گذاری شد؛ Playwright `amline-ui` بک‌اند واقعی را با `scripts/run_e2e_server.py` بالا می‌آورد.

**CRM لید + geo:** migration `e8a9b0c1d2e3_*`؛ فیلدهای اختیاری `province_id` / `city_id` روی `crm_leads`؛ پاسخ‌های enrich با `province_name_fa` / `city_name_fa`؛ ادمین **`LeadForm`** استان/شهر از `/api/v1/geo/*`.

**Post-launch (v3.9):** migration `f0e1d2c3b4a5_*` + [`app/api/v1/launch_routes.py`](../backend/backend/app/api/v1/launch_routes.py) (beta، onboarding، support، billing، dashboard، recommendations، ops)؛ PSP چندگانه در [`app/adapters/psp/`](../backend/backend/app/adapters/psp/)؛ SMS Ghasedak + [`FallbackSmsAdapter`](../backend/backend/app/adapters/sms/fallback.py)؛ [`docs/support/PLAYBOOKS.md`](./support/PLAYBOOKS.md)؛ تست [`tests/test_post_launch.py`](../backend/backend/tests/test_post_launch.py).

**PSP پروداکشن (v4.0):** migration [`a1b2c3d4e5f7_*`](../backend/backend/alembic/versions/a1b2c3d4e5f7_psp_production_payment_intent_fields.py)؛ [`payment_routes.py`](../backend/backend/app/api/v1/payment_routes.py) (callbackهای GET زرین‌پال/آیدی‌پی/نکست‌پی + `verify-retry` + لیست ادمین)؛ سرویس [`psp_payment_service.py`](../backend/backend/app/services/v1/psp_payment_service.py)؛ تست‌های [`test_psp_adapters.py`](../backend/backend/tests/test_psp_adapters.py)، [`test_psp_callback_flow.py`](../backend/backend/tests/test_psp_callback_flow.py)؛ راهنما [`docs/PSP_INTEGRATION.md`](./PSP_INTEGRATION.md)؛ ادمین **`/payments`**.

**یکپارچه‌سازی لبه (v4.1):** [`docs/INTEGRATIONS.md`](./INTEGRATIONS.md)؛ `app/integrations/meilisearch_listings.py` + sync در `listings_routes`؛ `growth_search_routes`؛ `geo_routes` (Nominatim)؛ `integrations_routes`؛ `n8n_outbound` + `posthog_server` + `composite_pricing` + `otel_setup` + `temporal_workflows`؛ ادمین **`/integrations`** + تب جستجو/نقشه در **`/ads`**؛ Docker profile **`integrations`**؛ تست [`test_integrations_geo.py`](../backend/backend/tests/test_integrations_geo.py).

**پروداکشن v5.0:** Observability runbook [`docs/runbooks/OBSERVABILITY.md`](./runbooks/OBSERVABILITY.md)؛ Grafana dashboard `amline-overview`؛ Metabase SQL [`integrations/metabase/sql/`](../integrations/metabase/sql/)؛ n8n [`integrations/n8n/amline-lead-visit-contract.json`](../integrations/n8n/amline-lead-visit-contract.json)؛ Thumbor presets + [`test_thumbor_presets.py`](../backend/backend/tests/test_thumbor_presets.py)؛ ML service metrics + [`scripts/ml/train_pricing_baseline.py`](../scripts/ml/train_pricing_baseline.py)؛ `meta_routes` + agency header در `admin-ui`؛ Billing [`admin-ui` `/billing`](../admin-ui/src/pages/billing/BillingPage.tsx) + [`amline-ui` `/billing`](../amline-ui/app/billing/page.tsx)؛ Temporal [`app/temporal/activities.py`](../backend/backend/app/temporal/activities.py)؛ Matrix E2EE در [`MATRIX_SETUP.md`](./MATRIX_SETUP.md)؛ CF توصیه [`test_recommendation_cf.py`](../backend/backend/tests/test_recommendation_cf.py).

---

## ۴. پوشه‌ها و پروژه‌های خاص ریپوی GitHub

در [Amline_namAvaran](https://github.com/m-khonyagar/Amline_namAvaran) علاوه بر جدول `REPOSITORY_STRUCTURE.md` این‌ها دیده می‌شود:

- **`dev-mock-api/`** — توسعهٔ فرانت بدون backend کامل  
- **`packages/amline-ui-core/`** — اشتراک UI بین اپ‌ها (در صورت استفاده، در manifest و CI ثبت شود)

اگر workspace محلی (`E:\CTO`) فاقد بعضی پوشه‌هاست، با `git pull` از همان ریپو یا همگام‌سازی دستی پر شود.

---

## ۵. اسناد و نسخه

| فایل | نقش |
|------|-----|
| `FRONTEND_API_INTEGRATION.md` | SSOT پروکسی، env، RBAC headers، inventory JSON، E2E بک‌اند واقعی |
| `AMLINE_MASTER_SPEC.md` | Master v5.0 — v4.1 + observability کامل، Metabase/n8n/Thumbor/ML/RBAC آژانس، Billing UI، Temporal activity، Matrix E2EE، CF |
| `AMLINE_REFERENCE_V2_2.md` | مرجع عمیق محصول + مهندسی + UX (§0–§36) |
| `openapi/amline-v1-errors.openapi.yaml` | enum خطا و اسکیمای مشترک (هدف) |
| `REPO_SPEC_ALIGNMENT.md` | همین فایل — پل بین Master، مرجع عمیق، و کد |

با هر تغییر در `error.code`، **هر سه** به‌روز شوند.

---

## ۶. همگام‌سازی وقتی `git clone` ناقص می‌ماند (قفل، `shallow.lock`, شبکه)

روی برخی ویندوزها `git clone` روی درایوهای خاص گیر می‌کند. **مسیر حرفه‌ای جایگزین:**

1. دانلود آرشیو **`main`**: [archive/refs/heads/main.zip](https://github.com/m-khonyagar/Amline_namAvaran/archive/refs/heads/main.zip) (مثلاً با `curl.exe -L -o main.zip …`).
2. باز کردن ZIP در پوشهٔ ثابت workspace (در این محیط نمونه: **`E:\repos\Amline_namAvaran_src\Amline_namAvaran-main`**).
3. **`robocopy`** پروژه‌های لازم به ریشهٔ **`E:\CTO`** (بدون `node_modules` / `.next`) تا workspace با GitHub هم‌خوان شود.
4. برای **PR به GitHub**: همان سه فایل مرجع را از **`E:\CTO\docs`** در **`docs/`** درخت تازه کپی کنید (در نمونهٔ محلی این کپی روی درخت ZIP انجام شده است).

پوشهٔ **`E:\repos\Amline_namAvaran`** اگر نیمه‌کاره ماند، می‌تواند حذف یا نادیده گرفته شود؛ منبع حقیقت کار **کلون سالم** یا **همان ZIP** است.

---

*آخرین به‌روزرسانی: هم‌راستا با Master v3.9 + مرجع v2.7؛ playbooks در `docs/support/PLAYBOOKS.md`؛ CI بک‌اند pip؛ بخش ۶ = جریان ZIP + robocopy.*
