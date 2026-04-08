# سند آنبوردینگ پلتفرم املاین (Amline)

**نسخه سند:** ۲.۱  
**تاریخ به‌روزرسانی:** ۲۰۲۶-۰۴-۰۴  
**ریپوی مرجع:** [Amline_namAvaran](https://github.com/m-khonyagar/Amline_namAvaran)  
**مخاطب:** توسعه‌دهنده، Tech Lead، DevOps، PM، QA، **و Agentهای خودکار (LLM / Cursor / Sweep)**

> **هدف v2.1:** علاوه بر معرفی پروژه، به **نیروی فنی یا عامل** بگوید *اول از کجا حقیقت را بخواند*، *چه چیزی را بدون هماهنگی دست نزند*، و *چگونه تغییر خود را تأیید کند*.

---

## ۰. سلسله‌مراتب منابع حقیقت (وقتی سندها با هم فرق دارند)


| اولویت | منبع                                                           | کاربرد                                                        |
| ------ | -------------------------------------------------------------- | ------------------------------------------------------------- |
| ۱      | تصمیم مکتوب مالک محصول / Tech Lead                             | اختلاف عمدی Spec و اولویت ریلیز                               |
| ۲      | `[AMLINE_MASTER_SPEC.md](./AMLINE_MASTER_SPEC.md)`             | **وضعیت اجرایی** محصول + as-built در برابر Target             |
| ۳      | `[REPO_SPEC_ALIGNMENT.md](./REPO_SPEC_ALIGNMENT.md)`           | پل بین Master، مرجع عمیق، و **کد فعلی**                       |
| ۴      | `[FRONTEND_API_INTEGRATION.md](./FRONTEND_API_INTEGRATION.md)` | پروکسی، env، RBAC، inventory، E2E، New Flow 0.1.3             |
| ۵      | `[AMLINE_REFERENCE_V2_2.md](./AMLINE_REFERENCE_V2_2.md)`       | Target عمیق (Blu، STRIDE، SLO، …) — **جایگزین Master نیست**   |
| ۶      | کد (`backend/backend`, اپ‌های فرانت)                           | حقیقت زمان اجرا؛ اگر با ۲–۴ فرق دارد، در PR **صریح** گفته شود |


**قاعده برای عامل:** اگر بین README ریشه و `FRONTEND_API_INTEGRATION` اختلاف پورت/پروکسی دیدی، **SSOT فرانت→API** را از `FRONTEND_API_INTEGRATION` بگیر.

---

## ۱. خلاصهٔ اجرایی

**املاین** پلتفرم **املاک و قرارداد آنلاین** است: ادمین (Vite/React)، پنل کاربر (Next App Router)، لندینگ، بک‌اند **FastAPI** روی PostgreSQL در مسیر canonical `**backend/backend`**، به‌همراه `dev-mock-api` به‌عنوان میان‌بر توسعه بدون DB کامل، و لایهٔ یکپارچگی (جستجو، نقشه، PSP، n8n، رصدپذیری، …).

**جمع‌بندی یک‌خطی برای Agent:** قبل از هر تغییر API یا مسیر HTTP در فرانت، `AMLINE_MASTER_SPEC` §۲ و `REPO_SPEC_ALIGNMENT` را چک کن؛ برای فرانت حتماً `inventory` و `FRONTEND_API_INTEGRATION` را بخوان؛ بک‌اند را در `backend/backend` با `pytest` تأیید کن؛ اسرار و کلیدها را هرگز commit نکن.

---

## ۲. واژه‌نامه (کوتاه)


| اصطلاح            | معنا در این ریپو                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **SSOT**          | منبع واحد حقیقت؛ برای API پروداکشن‌محور: `backend/backend`                                |
| **Target**        | آنچه سند مرجع می‌خواهد (مثلاً `AMLINE_REFERENCE`)                                         |
| **As-built**      | آنچه در git قابل اجراست                                                                   |
| **Canonical API** | `/api/v1/`* + در کنار آن **legacy mount** همان router روی ریشه برای سازگاری با mock قدیمی |
| **P0 / P1 / P2**  | بسته‌های تحویل تاریخی در Master؛ برای اولویت با جدول §۵ همین سند جلو برو                  |
| **Inventory**     | `docs/generated/frontend-http-inventory.json` — فهرست ماشین‌خوان مسیرهای HTTP فرانت       |


---

## ۳. چشم‌انداز و اهداف

### ۳.۱ اهداف محصول


| هدف             | توضیح کوتاه                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| قرارداد دیجیتال | ویزارد چندمرحله، امضا/شاهد مبتنی بر OTP (فاز طبق سند مرجع)؛ قرارداد New Flow **0.1.3** در `FRONTEND_API_INTEGRATION` |
| عملیات املاک    | آگهی، CRM لید، بازدید، SLA، کیف‌پول و پرداخت                                                                         |
| چند نقش         | RBAC، ممیزی، گزارش فعالیت                                                                                            |
| رشد و کشف       | نیازمندی، تطبیق، قیمت‌گذاری (rule + ML اختیاری)، جستجو                                                               |
| لبهٔ سازمانی    | Meilisearch، PostHog، n8n، Thumbor، Temporal، Matrix، Observability                                                  |


### ۳.۲ اهداف فنی

- **API کاننیکال:** `/api/v1/`* با خطای یکدست (`ErrorResponse` + `error.code`)  
- **سازگاری:** legacy هم‌مسیر با `dev-mock-api` تا مهاجرت کامل فرانت  
- **کیفیت:** pytest، black/flake8/isort در CI، inventory با `--check`، E2E `amline-ui`  
- **استقرار:** Docker Compose؛ اسناد deploy در `docs/`

---

## ۴. معماری Monorepo و پورت‌ها

### ۴.۱ درخت پروژه (خلاصه)

```
admin-ui/          React 18 + Vite — توسعه معمولاً پورت 3002
amline-ui/         Next.js 14 (App Router) — 3000
site/              Next.js — خروجی استاتیک — توسعه 3001
backend/backend/   FastAPI + SQLAlchemy + Alembic — SSOT بک‌اند
dev-mock-api/      FastAPI سبک — جایگزین موقت بدون DB کامل
pdf-generator/
seo-dashboard/
packages/amline-ui-core/   تم، client، errorMapper مشترک
integrations/      n8n، Metabase SQL، …
scripts/           inventory فرانت، بار k6، ML baseline
```

### ۴.۲ جدول پورت‌ها (توسعه در برابر Docker) — **شایع‌ترین منبع سردرگمی**


| سرویس                             | حالت توسعهٔ متداول (README / مستندات)                   | Docker Compose (ریشه)                               |
| --------------------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| بک‌اند FastAPI                    | `**8080`** روی میزبان (پیشنهاد README برای اتصال فرانت) | `**8080` → `8000`** داخل کانتینر (`amline-backend`) |
| اجرای مستقیم `uvicorn` روی میزبان | اغلب `**8000`** یا هر پورتی که صریح بدهی                | —                                                   |
| admin-ui                          | **3002**                                                | **3002 → 80** (nginx داخل image)                    |
| amline-ui                         | **3000**                                                | **3000 → 80**                                       |
| site                              | **3001**                                                | **3001 → 80**                                       |
| Postgres / Redis / MinIO          | 5432 / 6379 / 9000+9001                                 | همان نگاشت‌ها                                       |


**برای عامل:** در چک‌لیست تأیید، همیشه بنویس *به کدام URL* تست زدی (مثلاً `http://127.0.0.1:8080/docs` در سناریوی README).

### ۴.۳ نقاط ورود مهم کد (بدون جایگزینی خواندن Master)


| موضوع                           | مسیر                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------- |
| FastAPI app، CORS، mount دوگانه | `backend/backend/app/main.py`                                                     |
| Router تجمیعی v1                | `backend/backend/app/api/v1/router.py` (و زیرپوشه‌ها)                             |
| قرارداد New Flow                | `FRONTEND_API_INTEGRATION.md` § SwaggerHub 0.1.3 + فایل‌های اشاره‌شده در همان بخش |
| خطای یکدست                      | `backend/backend/app/core/errors.py`، `schemas/v1/errors.py`                      |
| پروکسی فرانت                    | `admin-ui/vite.config.ts`، `amline-ui/next.config.js`                             |


---

## ۵. فرایندها و نحوهٔ کار تیم

### ۵.۱ Git و شاخه‌ها

**وضعیت فعلی ریپو (Q2 2026):** در حال حاضر فقط شاخه `main` فعال است و شاخه `develop` وجود خارجی ندارد.

- همه توسعه‌ها با ایجاد **feature branch از `main`** و سپس Pull Request به سمت `main` انجام می‌شود.
- پس از تأیید CI و Review، PR مستقیماً در `main` merge می‌شود.
- قوانین `Mergify` (در `.github/mergify.yml`) برای شاخه `main` پیکربندی شده است.

> **توضیح برای توسعه‌دهنده:** سندهای قدیمی موجود در ریپو (مانند `GIT_AND_BACKEND_POLICY.md`) ممکن است به شاخه `develop` اشاره کنند. این ارجاعات **منسوخ شده** و باید نادیده گرفته شوند. سیاست فوق، مرجع اصلی است.

### ۵.۲ توسعهٔ روزمره (انسانی)

1. کلون، `.env.example` → `.env` در ریشه و در صورت نیاز `backend/backend/.env`
2. یا `docker compose` یا سرویس‌های جدا + `uvicorn` + `npm run dev`
3. تغییر روی **feature branch** از روی `main`
4. هر تغییری که مسیر یا متد یک فراخوانی HTTP در فرانت‌ها (`admin-ui/` یا `amline-ui/`) را تغییر می‌دهد، **اجرای این کامند الزامی است**:
  ```bash
   # از ریشه ریپو (همان جایی که فایل docker-compose.yml قرار دارد)
   python ./scripts/inventory_frontend_http_calls.py
  ```
   سپس فایل تولید شده را به commit خود اضافه کن:
   اگر این مرحله فراموش شود، CI در مرحله `frontend-http-inventory` با خطا مواجه خواهد شد.

### ۵.۳ CI/CD (GitHub Actions) — فهرست workflowهای ریشه


| فایل                                                                              | نقش                                                                          |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `[ci.yml](../.github/workflows/ci.yml)`                                           | `backend-test`، `frontend-http-inventory`، `amline-ui-e2e`، buildها روی push |
| `[repo-hygiene.yml](../.github/workflows/repo-hygiene.yml)`                       | بهداشت ریپو (`hygiene`)                                                      |
| `[admin-ui-property-tests.yml](../.github/workflows/admin-ui-property-tests.yml)` | Vitest + Playwright ادمین (`vitest-pbt`، `playwright-e2e`)                   |
| `deploy-*.yml`، `super-agent-ci.yml`                                              | استقرار / عامل‌های جانبی                                                     |


**Mergify:** `[.github/mergify.yml](../.github/mergify.yml)` — شرط‌های `check-success` باید با **نام دقیق job** در GitHub یکی باشد؛ نویسندهٔ PR خودکار (مثلاً Sweep) باید با `author=` در قانون هم‌خوان باشد.

### ۵.۴ کیفیت و QA


| لایه          | دستور / محل                                                                    |
| ------------- | ------------------------------------------------------------------------------ |
| بک‌اند        | از `backend/backend`: `pytest tests/ -v` (نمونهٔ اخیر: **۵۹** تست collect شده) |
| ادمین         | `npm test`، `npm run build`، `npx playwright test` در `admin-ui`               |
| amline-ui E2E | `npm run test:e2e` در `amline-ui`؛ جزئیات env در `FRONTEND_API_INTEGRATION`    |
| Drift فرانت   | `python ./scripts/inventory_frontend_http_calls.py --check` (از ریشه ریپو)     |


### ۵.۵ امنیت و عملیات

- `docs/security-incident/` — runbook و چرخش کلید  
- `[HTTPONLY_AUTH.md](./HTTPONLY_AUTH.md)`، `[BACKEND_STAGING_CORS.md](./BACKEND_STAGING_CORS.md)`  
- `[runbooks/OBSERVABILITY.md](./runbooks/OBSERVABILITY.md)`

---

## ۶. مرجع سریع دستورات (کپی برای محیط Unix؛ در PowerShell مسیرها معادل است)

```bash
# بک‌اند
cd backend/backend
pip install -r requirements.txt
alembic upgrade head   # وقتی DB واقعی داری
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload

# Inventory فرانت (بعد از تغییر callهای HTTP؛ از ریشه ریپو)
python ./scripts/inventory_frontend_http_calls.py
python ./scripts/inventory_frontend_http_calls.py --check

# تست بک‌اند
cd backend/backend && pytest tests/ -v
```

---

## ۷. آنچه تا امروز انجام شده (خلاصهٔ فازها)

منبع تفصیلی: `**AMLINE_MASTER_SPEC.md` v5.0** و `**REPO_SPEC_ALIGNMENT.md`**.


| فاز / نسخه  | محتوای کلیدی                                                                                          | یادداشت                                           |
| ----------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| P0#1–#4     | `/api/v1`، listings، OTP/امضا در بک‌اند، `ErrorResponse`                                              | پروداکشن OTP هنوز به Redis/DB/SMS واقعی نیاز دارد |
| P1 / P2     | پلتفرم و Growth در بک‌اند                                                                             | بخش‌هایی stub                                     |
| v3.7+       | geo ایران، E2E با بک‌اند، …                                                                           | مهاجرت فرانت تدریجی                               |
| v3.9        | post-launch routes، PSP چندگانه، i18n، …                                                              | UI هنوز سطحی در برخی بخش‌ها                       |
| v4.0 / v4.1 | PSP واقعی، Meili، n8n، OTEL، Temporal hooks، …                                                        | نیاز به env عملیاتی                               |
| v5.0        | Observability stack، Metabase، ML pricing، چند آژانس، Billing UI، Temporal activity، Matrix مستند، CF | طبق Master در ریپو                                |


**ماژول‌های ادمین (نقشهٔ UI):** جدول ماژول‌ها در `[README.md](../README.md)` ریشه.

---

## ۸. کارهای باقی‌مانده و گپ‌های شناخته‌شده


| ناحیه                                | موضوع                                                       | منبع                          |
| ------------------------------------ | ----------------------------------------------------------- | ----------------------------- |
| Target vs As-built                   | جدول §۲.۲ Master                                            | `AMLINE_MASTER_SPEC.md`       |
| mock ↔ backend                       | JSON لید/قرارداد، OTP در mock، کدهای خطا                    | `REPO_SPEC_ALIGNMENT.md` §۲   |
| OTP پروداکشن                         | Redis/DB، Ghasedak، حذف debug                               | همان + کد OTP                 |
| registry / رسمی‌سازی worker          | در as-built خیر                                             | Master                        |
| مهاجرت فرانت                         | حذف وابستگی به mock در مسیرهای حساس                         | `FRONTEND_API_INTEGRATION.md` |
| Docker **admin-ui** image            | context تک‌پوشه؛ بدون `packages/` و deps کامل build می‌شکند | Dockerfile ادمین + compose    |
| OpenAPI رسمی کامل                    | تکمیل از کد                                                 | backlog                       |
| اتوماسیون PR                         | Sweep + Mergify نیاز به نصب و هم‌خوانی `author`             | `.github/mergify.yml`         |
| `**.gitignore` و `backend/backend`** | در برخی checkoutها حساس است؛ با تیم Backend هماهنگ          | `GIT_AND_BACKEND_POLICY.md`   |


---

## ۹. درصدهای پیشرفت (قراردادی — نه جایگزین story point)


| حوزه                             | ~٪        | توضیح                                   |
| -------------------------------- | --------- | --------------------------------------- |
| هستهٔ API بک‌اند                 | **۸۵**    | گسترده + pytest؛ لبهٔ پروداکشن و stubها |
| یکپارچگی‌های لبه                 | **۷۵**    | اسکلت + Docker profile + مستندات        |
| فرانت‌ها                         | **۷۰**    | UI گسترده؛ mock هنوز در مسیرها          |
| هم‌ترازی `AMLINE_REFERENCE` عمیق | **۵۵**    | دامنه و خطاها تدریجی                    |
| DevOps / ریلیز سازمانی           | **۶۵**    | CI/compose/runbook؛ بستگی به محیط شما   |
| **محصول SaaS آماده فروش**        | **۶۰–۶۵** | تخمین کلی                               |


---

## ۱۰. آنبوردینگ روز اول

### ۱۰.۱ توسعه‌دهندهٔ انسان

1. بخوانید: **§۰ و §۱ همین سند** + Master §۰–۳ + `REPO_SPEC_ALIGNMENT`
2. راه‌اندازی: `[README.md](../README.md)`
3. مستندات Swagger (OpenAPI) بک‌اند را در آدرس `http://localhost:8080/docs` (یا پورتی که بک‌اند روی آن اجرا شده) باز کن.
4. قبل از PR: pytest + تست/بیلد فرانت + `tsc --noEmit` طبق سیاست git
5. اگر API عمومی عوض شد: inventory و در صورت نیاز مستند قرارداد

### ۱۰.۲ Agent (LLM / Cursor / ابزار خودکار)

**قبل از اولین ویرایش کد:**

1. **§۰** (سلسله‌مراتب) و `**FRONTEND_API_INTEGRATION.md`** را برای هر تغییر فرانت/API بخوان.
2. `**REPO_SPEC_ALIGNMENT.md`** — ببین آیا کار تو در چک‌باکس‌های باز گیر می‌کند.
3. **تغییر کوچک، diff متمرکز**؛ بدون refactor عریض مگر صریحاً خواسته شود.

**خط قرمزها (بدون تأیید انسان):**

- حذف یا دور زدن `**--check` inventory** یا commit عمدی drift  
- تغییر `**docker-compose`، workflowهای CI، سیاست امنیت** بدون تسک صریح  
- قرار دادن **کلید API، رمز، توکن** در repo  
- فرض کردن Sweep ساخته PR؛ همیشه با `gh` یا UI تأیید کن

**بعد از ویرایش (حداقل تأیید):**

- `pytest` در `backend/backend` برای تغییر بک‌اند  
- برای فرانت: `npm run build` یا حداقل `npm run lint` / `npm test` بسته به پکیج  
- اگر مسیر HTTP عوض شد: اسکریپت inventory

**Handoff بین sessionهای Cursor:** اگر از فایل‌های Kiro استفاده می‌کنید، `[KIRO_HANDOFF_NOTE.md](./KIRO_HANDOFF_NOTE.md)`.

---

## ۱۱. عیب‌یابی رایج


| علامت                                  | احتمال                              | اقدام                                                                                                       |
| -------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm ci` / نصب با **EPERM** روی ویندوز | آنتی‌ویروس یا قفل فایل              | بستن IDE روی `node_modules`، اجرای ترمینال با حق مدیر، یا حذف `node_modules` و نصب مجدد                     |
| فرانت به API وصل نمی‌شود               | پورت اشتباه                         | جدول §۴.۲؛ مطابقت `VITE_DEV_PROXY_TARGET` / `NEXT_PUBLIC_*` با پورت بک‌اند                                  |
| CI بک‌اند سبز ولی محلی قرمز            | SQLite در CI در برابر Postgres محلی | `ci.yml` از `DATABASE_URL=sqlite:///:memory:` برای job تست استفاده می‌کند؛ رفتار migration ممکن است فرق کند |
| build Docker ادمین می‌ریزد             | context مونوریپو                    | §۸ — Dockerfile باید `packages/` و وابستگی‌ها را ببیند یا multi-stage از ریشه                               |


---

## ۱۲. اتوماسیون توسعه (Sweep / Mergify)

- **Sweep:** نیاز به نصب GitHub App توسط مالک ریپو؛ Issue با برچسب `sweep`؛ رفتار را با PR و کامنت ربات تأیید کن.  
- **Mergify:** فقط وقتی merge خودکار معنا دارد که **چک‌های نام‌برده در `mergify.yml`** روی همان PR وجود داشته باشند و **سبز** باشند و `author` با بات واقعی یکی باشد.

---

## ۱۳. نقشهٔ اسناد (گسترش‌یافته)


| سند                                                                                              | کاربرد                                             |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `[AMLINE_MASTER_SPEC.md](./AMLINE_MASTER_SPEC.md)`                                               | مرجع اجرایی نسخه‌دار                               |
| `[ARCHITECTURE_CONTRACT_PLATFORM_PRODUCTION.md](./ARCHITECTURE_CONTRACT_PLATFORM_PRODUCTION.md)` | قرارداد پروداکشن: شکست، dispute، تسویه، audit، SLA |
| `[REPO_SPEC_ALIGNMENT.md](./REPO_SPEC_ALIGNMENT.md)`                                             | Spec ↔ کد                                          |
| `[FRONTEND_API_INTEGRATION.md](./FRONTEND_API_INTEGRATION.md)`                                   | SSOT فرانت و API                                   |
| `[INTEGRATIONS.md](./INTEGRATIONS.md)`                                                           | env سرویس‌های لبه                                  |
| `[GIT_AND_BACKEND_POLICY.md](./GIT_AND_BACKEND_POLICY.md)`                                       | Git + نکته `backend/backend`                       |
| `[HTTPONLY_AUTH.md](./HTTPONLY_AUTH.md)`                                                         | کوکی و امنیت session                               |
| `[MATRIX_SETUP.md](./MATRIX_SETUP.md)`، `[METABASE_SETUP.md](./METABASE_SETUP.md)`               | راه‌اندازی                                         |
| `[WORKSPACE_OPERATIONS.md](./WORKSPACE_OPERATIONS.md)`                                           | عملیات workspace                                   |
| `[contract-wizard/requirements.md](./contract-wizard/requirements.md)`                           | ویزارد قرارداد                                     |
| `[integrations/contract-flow/README.md](../integrations/contract-flow/README.md)`                | فهرست endpoint قرارداد mock/New Flow               |
| `[MONOREPO_NOTE.md](./MONOREPO_NOTE.md)`                                                         | آیندهٔ workspaces                                  |
| `[KIRO_HANDOFF_NOTE.md](./KIRO_HANDOFF_NOTE.md)`                                                 | handoff عامل Cursor                                |


---

## ۱۴. مالکیت و نگهداری سند

- **ریپوی GitHub:** `m-khonyagar/Amline_namAvaran` (مرجع عمومی).  
- **به‌روزرسانی این آنبوردینگ:** با هر تغییر مهم در Master، سیاست git، جدول پورت‌ها، یا فهرست workflowها، **نسخه سند** را ببر بالا و تاریخ را عوض کن.

---

*پایان سند آنبوردینگ v2.1.*