# راهنمای توسعهٔ محلی — یکپارچگی اجزای املاین

این سند **منبع واحد** برای پورت‌ها، پروفایل‌های اتصال API، و تعارض‌های قابل پیش‌بینی است. برای ماتریس endpointها نگاه کنید به [DEV_MOCK_GAP_MATRIX.md](./DEV_MOCK_GAP_MATRIX.md).

## نقشهٔ پورت‌ها (لوکال)

| سرویس | پورت پیش‌فرض | یادداشت |
|--------|----------------|---------|
| `amline-ui` (Next) | 3000 | rewrite به `NEXT_PUBLIC_DEV_PROXY_TARGET` (پیش‌فرض `http://localhost:8080`) |
| `site` (مارکتینگ) | 3001 | `next dev` بدون پورت ثابت در `package.json` — در صورت تداخل `-p 3001` بدهید |
| `admin-ui` (Vite) | 3002 | proxy به `VITE_DEV_PROXY_TARGET` برای `/auth`, `/admin`, `/contracts`, … |
| `seo-dashboard` | 3003 | مستقل از API اصلی؛ چت AI در `src/app/api/ai/chat` |
| `consultant-ui` | 3004 | فقط proxy برای `/consultant` |
| `dev-mock-api` | **8080** | جایگزین سبک backend |
| `backend/backend` (uvicorn) | **8080** | با mock **هم‌زمان روی یک پورت اجرا نشود** |

### تعارض حیاتی

- **پورت 8080** فقط به **یک** فرآیند تعلق دارد: یا `dev-mock-api` یا `backend`. اگر هر دو بالا باشند، یکی خطا می‌گیرد یا به پورت دیگر منتقل شوید.
- فرانت‌ها (`admin-ui`, `amline-ui`, `consultant-ui`) باید `VITE_DEV_PROXY_TARGET` / `NEXT_PUBLIC_DEV_PROXY_TARGET` را به همان مقصدی بزنند که روی 8080 گوش می‌دهد.

## دو پروفایل برای `admin-ui`

| پروفایل | `VITE_USE_MSW` | رفتار | مناسب |
|---------|----------------|--------|--------|
| **A — MSW** | `true` (یا هر مقدار غیر از `false`) | Mock داخل مرورگر؛ درخواست‌ها به‌طور پیش‌فرض به API حقیقی نمی‌روند مگر تنظیم خاص | توسعهٔ UI بدون سرور Python |
| **B — Proxy + dev-mock یا backend** | `false` | Vite درخواست‌های `/auth`, `/admin`, `/contracts`, … را به `VITE_DEV_PROXY_TARGET` می‌فرستد | تست قرارداد واقعی proxy و هم‌خوانی با `dev-mock-api` |

فایل نمونه: `admin-ui/.env.example`. برای ورود آزمایشی در dev، `VITE_ENABLE_DEV_BYPASS=true` در `.env.local` (فقط لوکال).

**نکته:** `admin-ui/src/lib/api.ts` و ویزارد قرارداد `baseURL` خالی می‌گذارند تا مسیر نسبی از همان origin + proxy برود؛ `VITE_API_URL` را فقط اگر می‌خواهید مستقیم به دامنهٔ دیگری بزنید پر کنید.

## `amline-ui`

- `next.config.js` مسیرهای `/admin`, `/auth`, `/contracts`, `/financials`, `/files` و همچنین `/api/*` را به `NEXT_PUBLIC_DEV_PROXY_TARGET` (یا `NEXT_PUBLIC_API_BASE_URL`) می‌فرستد.
- درخواست‌هایی مثل `/admin/otp/send` بدون پیشوند `/api` هستند و با rewriteهای بالا به backend/mock می‌رسند.

## `consultant-ui`

- فقط `server.proxy['/consultant']` دارد؛ MSW را می‌توان با `VITE_USE_MSW=false` خاموش کرد و به `http://127.0.0.1:8080` وصل شد (همان `dev-mock-api` با مسیرهای `/consultant/*`).

## چک‌لیست یکپارچگی سریع

1. یک سرور روی **8080** (mock یا backend)، نه هر دو.
2. `admin-ui`: اگر proxy می‌خواهید، `VITE_USE_MSW=false` و `VITE_DEV_PROXY_TARGET=http://127.0.0.1:8080`.
3. `amline-ui`: `NEXT_PUBLIC_DEV_PROXY_TARGET=http://127.0.0.1:8080` (یا `localhost`).
4. بعد از تغییر mock: `cd dev-mock-api && python -m pytest tests/test_smoke.py -v`.
5. build فرانت ادمین: `cd admin-ui && npm run build`.

## مستندات مرتبط

- [README اصلی](../README.md) — دستورات اجرا
- [dev-mock-api/README](../dev-mock-api/README.md) — endpointهای mock
- [DEV_MOCK_GAP_MATRIX.md](./DEV_MOCK_GAP_MATRIX.md) — تطبیق فرانت / mock / MSW
