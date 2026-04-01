# توسعهٔ Admin UI (Vite)

## سناریوها

1. **MSW + بدون backend (پیش‌فرض dev)**  
   - `.env.local`: `VITE_USE_MSW` خالی نباشد یا نباشد (هر چیزی غیر از `false`).  
   - `VITE_API_URL` را خالی بگذارید تا درخواست‌ها به همان origin بروند و MSW آن‌ها را intercept کند.

2. **فقط Vite proxy (بدون MSW)**  
   - `VITE_USE_MSW=false`  
   - `VITE_DEV_PROXY_TARGET` را به URL backend تنظیم کنید (پیشنهادی: `https://api.amline.ir`).  
   - درخواست‌های نسبی به `/contracts`, `/admin`, `/auth`, … از طریق proxy به هدف ارسال می‌شوند (بدون CORS مرورگر به دامنهٔ دیگر).

3. **Backend جدا روی localhost**  
   - `VITE_USE_MSW=false`  
   - `VITE_DEV_PROXY_TARGET=http://localhost:8080` (یا پورت واقعی)

## CORS

اگر `VITE_API_URL` را مستقیم به `https://api...` بگذارید و از `localhost` صدا بزنید، CORS باید روی backend باز باشد. با **مسیر نسبی + proxy** این مشکل دور زده می‌شود.

## CRM

با `VITE_USE_CRM_API=true`، CRM از `GET/PATCH/POST /admin/crm/...` استفاده می‌کند؛ در dev با MSW، handlerهای نمونه در `src/mocks/handlers.ts` فعال‌اند.

## نکتهٔ مهم backend واقعی (production)

- در API فعلی، `POST /contracts/start` به `party_type` نیاز دارد.
- endpointهای فلوی جدید (`/contracts/{id}/party/...` و مراحل بعدی) اگر روی سرور `404` بدهند، frontend پیام «عدم دسترسی مرحله در backend فعلی» نمایش می‌دهد.
- قرارداد خرید/فروش فعلاً پشت فلگ `VITE_ENABLE_BUY_SELL_CONTRACT` نگه داشته شده است تا زمانی که backend آن را فعال کند.
