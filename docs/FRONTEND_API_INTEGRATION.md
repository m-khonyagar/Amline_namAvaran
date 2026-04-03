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

## هدرهای RBAC (وقتی `AMLINE_RBAC_ENFORCE=1`)

- `X-User-Id`
- `X-User-Permissions` (لیست جداشده با ویرگول؛ یا `*` در dev)
- در چندآژانسی: `X-Agency-Id` (از تنظیمات ادمین / localStorage در `admin-ui`)

جزئیات: [`INTEGRATIONS.md`](./INTEGRATIONS.md)، [`HTTPONLY_AUTH.md`](./HTTPONLY_AUTH.md).

## قرارداد خطا (ErrorResponse)

- پارسر مشترک: [`packages/amline-ui-core/src/api/errorMapper.ts`](../packages/amline-ui-core/src/api/errorMapper.ts)
- ادمین re-export: [`admin-ui/src/lib/errorMapper.ts`](../admin-ui/src/lib/errorMapper.ts)
- کمک‌توابع: **`getApiBaseUrl`**, **`apiJson`** / **`apiFetch`** در [`packages/amline-ui-core/src/api/client.ts`](../packages/amline-ui-core/src/api/client.ts)

## فهرست ماشین‌خوان مسیرها (Inventory)

- خروجی JSON (commit‌شده): [`docs/generated/frontend-http-inventory.json`](./generated/frontend-http-inventory.json)
- تولید / به‌روزرسانی:

```bash
python scripts/inventory_frontend_http_calls.py
```

- کنترل drift در CI: همان اسکریپت با `--check` روی همان فایل.

فیلد **`surface`:** `canonical_v1` | `legacy_mount` | `legacy_api_prefix` | `other_slash` — برای اولویت‌بندی مهاجرت به `/api/v1`.

## E2E

- **amline-ui:** [`amline-ui/playwright.config.ts`](../amline-ui/playwright.config.ts) — `backend/backend/scripts/run_e2e_server.py` (uvicorn واقعی + alembic)، نه `dev-mock-api`.

## نقشهٔ اجرای چهار مرحله (Cursor)

فایل پلن: `.cursor/plans/amline_four-step_roadmap_e813ce45.plan.md` (در workspace محلی Cursor).
