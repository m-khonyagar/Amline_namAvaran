# اتصال به API واقعی و CORS

## چک‌لیست

1. staging یا production در دسترس است (`VITE_DEV_PROXY_TARGET` یا deploy).
2. `VITE_USE_MSW=false` تا Mock Service Worker پاسخ جعلی ندهد.
3. اگر فرانت روی دامنه‌ای غیر از backend است و **بدون** reverse proxy одного origin کار می‌کنید، سرور API باید هدرهای CORS مناسب برای آن origin را برگرداند.
4. پس از OTP واقعی، مسیر `/auth/me` و کوکی/توکن طبق قرارداد backend تست شود.

## بدون تغییر فوری روی Darkube (Caddy استیجینگ)

`scripts/full_staging_provision.py` با پیش‌فرض **`STAGING_SAME_ORIGIN_API=1`** روی دامنهٔ ادمین (`CADDY_ADMIN_HOST`) مسیرهای **`/api/...`** و **`/financials/...`** را با `path_regexp` به **`STAGING_API_URL`** (پیش‌فرض `https://api.amline.ir`) پروکسی می‌کند؛ برای مسیرهای **`/api/v1/*`** پیش‌فرض **`uri strip_prefix /api/v1`** اعمال می‌شود تا با API فعلی production (مسیرهای legacy) سازگار باشد (`STAGING_CADDY_STRIP_API_V1_PREFIX=0` برای بک‌اند تمام‌canonical). برای **`api.amline.ir`** در صورت ۵۰۲ روی VPS، پروکسی به **IP ثابت** با **`tls_server_name`** می‌زند (`API_AMLINE_IR_TLS_DIAL_IPV4` در `server_layout_constants.py`؛ غیرفعال‌سازی: `STAGING_API_DISABLE_CONNECT_IP=1`). بیلد ادمین با **`VITE_API_URL` خالی** است؛ **CORS برای API لازم نیست**. برای غیرفعال کردن پروکسی: `STAGING_SAME_ORIGIN_API=0`.

اگر ادمین را با **`VITE_API_URL=https://…darkube…`** بیلد کنید، باید **`AMLINE_CORS_ORIGINS`** روی بک‌اند شامل `https://admin.staging.amline.ir` باشد (در `app/main.py` برای dev بدون env، این origin به‌صورت پیش‌فرض اضافه شده است).

## یادداشت

الگوی Swagger املاین: header با نام `Authorization` و مقدار توکن (مطابق `contractApi` و مستند OpenAPI).
