# یکپارچگی فرانت‌اند با API (SSOT)

این سند **مرجع اجرایی** برای نقشهٔ چهارمرحله‌ای (frontend → backend، geo، سخت‌سازی MVP، observability) است و با [`REPO_SPEC_ALIGNMENT.md`](./REPO_SPEC_ALIGNMENT.md) هم‌خوان است.

## منبع حقیقت بک‌اند

- **Canonical:** `backend/backend` — همان `app.main:app` روی پورت پیشنهادی **8080** (Docker: نگاشت `8080:8000`).
- **مسیر دوگانه:** همان `platform_router` هم روی **`/api/v1/*`** و هم روی **legacy** (`/contracts`, `/admin`, …) mount می‌شود ([`app/main.py`](../backend/backend/app/main.py)).
- **`dev-mock-api/`:** فقط برای سناریوی «بدون Postgres»؛ برای ویژگی‌های P1/P2 و CRM پایگاه‌داده **مرجع رسمی نیست**.

## پروکسی توسعه

| اپ | فایل | نکته |
|----|------|------|
| amline-ui | [`amline-ui/next.config.js`](../amline-ui/next.config.js) | اولویت با rewrite صریح **`/api/v1/:path*`** به upstream |
| admin-ui | [`admin-ui/vite.config.ts`](../admin-ui/vite.config.ts) | پروکسی **`/api/v1`** + legacy paths به `VITE_DEV_PROXY_TARGET` |

پیش‌فرض محلی: `http://127.0.0.1:8080` یا `http://localhost:8080` (در `.env.example` هر دو اپ).

## هدر `X-Request-Id` (هم‌ترازی لاگ و ردیابی)

- **`fetchJson`** در [`packages/amline-ui-core`](../packages/amline-ui-core/src/api/fetchJson.ts) و کلاینت‌های **axios** در `admin-ui` و `consultant-ui` در صورت نبودن هدر، مقدار **`generateRequestId()`** را روی `X-Request-Id` می‌گذارند تا با لاگ بک‌اند و OpenTelemetry هم‌خوان بماند.

## هدرهای RBAC (وقتی `AMLINE_RBAC_ENFORCE=1`)

- `X-User-Id`
- `X-User-Permissions` (لیست جداشده با ویرگول؛ یا `*` در dev)
- در چندآژانسی: `X-Agency-Id` (از تنظیمات ادمین / localStorage در `admin-ui`)

جزئیات: [`INTEGRATIONS.md`](./INTEGRATIONS.md)، [`HTTPONLY_AUTH.md`](./HTTPONLY_AUTH.md).

## قرارداد خطا (ErrorResponse)

- پارسر مشترک: [`packages/amline-ui-core/src/api/errorMapper.ts`](../packages/amline-ui-core/src/api/errorMapper.ts)
- ادمین re-export: [`admin-ui/src/lib/errorMapper.ts`](../admin-ui/src/lib/errorMapper.ts)
- کمک‌توابع: **`getApiBaseUrl`**, **`apiJson`** / **`apiFetch`** در [`packages/amline-ui-core/src/api/client.ts`](../packages/amline-ui-core/src/api/client.ts)

## OpenAPI snapshot و تایپ‌های TypeScript

- خروجی JSON از `app.openapi()` (commit‌شده): [`docs/generated/openapi.json`](./generated/openapi.json)
- اسکریپت export: [`backend/backend/scripts/export_openapi.py`](../backend/backend/scripts/export_openapi.py)
- تولید تایپ‌ها: پکیج [`packages/amline-openapi-types`](../packages/amline-openapi-types) — خروجی [`generated/api.d.ts`](../packages/amline-openapi-types/generated/api.d.ts)

به‌روزرسانی snapshot + تایپ‌ها از ریشهٔ مخزن:

```bash
npm run openapi:refresh
```

معادل: `npm run openapi:export` سپس `npm run openapi:types`.

مصرف تایپ‌های قرارداد (re-export، یک نقطهٔ تغییر):

- [`admin-ui/src/types/amline-openapi.ts`](../admin-ui/src/types/amline-openapi.ts)
- [`amline-ui/lib/amline-openapi.ts`](../amline-ui/lib/amline-openapi.ts)
- [`consultant-ui/src/types/amline-openapi.ts`](../consultant-ui/src/types/amline-openapi.ts)

## فهرست ماشین‌خوان مسیرها (Inventory)

- خروجی JSON (commit‌شده): [`docs/generated/frontend-http-inventory.json`](./generated/frontend-http-inventory.json)
- تولید / به‌روزرسانی:

```bash
python scripts/inventory_frontend_http_calls.py
```

- کنترل drift در CI: همان اسکریپت با `--check` روی همان فایل.

فیلد **`surface`:** `canonical_v1` | `legacy_mount` | `legacy_api_prefix` | `other_slash` — برای اولویت‌بندی مهاجرت به `/api/v1`.

## E2E

- **amline-ui:** [`amline-ui/playwright.config.ts`](../amline-ui/playwright.config.ts) — برای سناریوی mock، `dev-mock-api` روی ۸۰۸۰ و `npm run dev` با `NEXT_PUBLIC_ENABLE_DEV_BYPASS` / `NEXT_PUBLIC_E2E_DEV_BYPASS` و `NODE_ENV=development`؛ دکمهٔ ورود آزمایشی دارای `data-testid="e2e-dev-login"` است. در CI، job `amline-ui-e2e` همان مسیر را با Playwright اجرا می‌کند.
- **سرور واقعی (اختیاری):** `backend/backend/scripts/run_e2e_server.py` (uvicorn + alembic)، جایگزین mock.

## قرارداد — New Flow (SwaggerHub 0.1.3)

- **منبع رسمی قرارداد API:** OpenAPI/Swagger نسخهٔ **0.1.3**؛ هر تغییر مسیر یا DTO باید با همان نسخه هم‌خوان بماند.
- **پیاده‌سازی بک‌اند:** [`backend/backend/app/api/v1/endpoints/contracts.py`](../backend/backend/app/api/v1/endpoints/contracts.py) و سرویس [`contract_flow_service.py`](../backend/backend/app/services/v1/contract_flow_service.py)؛ مدل‌های ORM پیش‌نویس در [`contract_flow.py`](../backend/backend/app/models/contract_flow.py) (پیشوند جدول `contract_flow_*`)؛ اسکیماهای Pydantic در [`schemas/v1/contract_flow.py`](../backend/backend/app/schemas/v1/contract_flow.py).
- **فیلدهای کلیدی پاسخ:** `flow_version` (مقدار `0.1.3`) و **`next_step`** پس از شروع قرارداد و پس از هر `POST` گام‌دار (طرف‌ها، بخش‌های `home-info` / `dating` / `mortgage` / `renting`، `sign/set`، و در صورت نیاز پس از تأیید شاهد).
- **امضا و شاهد:** مسیرهای `sign/*` و `witness/*` علاوه بر state machine، از [`signature_service.py`](../backend/backend/app/services/v1/signature_service.py) برای OTP و رویدادها استفاده می‌کنند.
- **اعتبارسنجی ترتیب گام (اختیاری):** با `AMLINE_CONTRACT_STRICT_FLOW=1` روی بک‌اند، پرش نامعتبر بین گام‌ها رد می‌شود؛ پیش‌فرض برای توسعه روان‌تر، غیرسخت‌گیر است.
- **mock توسعه:** [`dev-mock-api/`](../dev-mock-api/) همان مسیرها و شکل بدنهٔ بخش‌ها (`payload` + `next_step`) را تکرار می‌کند؛ برای فهرست شماره‌دار همهٔ endpointها و خلاصهٔ state machine به [`integrations/contract-flow/README.md`](../integrations/contract-flow/README.md) مراجعه کنید.

## نقشهٔ اجرای چهار مرحله (Cursor)

فایل پلن: `.cursor/plans/amline_four-step_roadmap_e813ce45.plan.md` (در workspace محلی Cursor).
