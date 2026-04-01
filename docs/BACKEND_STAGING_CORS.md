# اتصال به API واقعی و CORS

## چک‌لیست

1. staging یا production در دسترس است (`VITE_DEV_PROXY_TARGET` یا deploy).
2. `VITE_USE_MSW=false` تا Mock Service Worker پاسخ جعلی ندهد.
3. اگر فرانت روی دامنه‌ای غیر از backend است و **بدون** reverse proxy одного origin کار می‌کنید، سرور API باید هدرهای CORS مناسب برای آن origin را برگرداند.
4. پس از OTP واقعی، مسیر `/auth/me` و کوکی/توکن طبق قرارداد backend تست شود.

## یادداشت

الگوی Swagger املاین: header با نام `Authorization` و مقدار توکن (مطابق `contractApi` و مستند OpenAPI).
