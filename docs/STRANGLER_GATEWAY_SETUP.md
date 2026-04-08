# Strangler Fig — Gateway جلوی دامنه (Traefik / Nginx)

**هدف:** جدا کردن ترافیک قدیمی از مسیرهای جدید (`/api/v1`، اپ‌های مدرن) بدون big-bang deploy.

## وضعیت ریپو (as-built)

در این monorepo **فایل پیکربندی آمادهٔ Traefik/Nginx برای production** به‌صورت پیش‌فرض commit نشده است؛ استقرار Gateway معمولاً روی **سرور** یا **Docker Compose محیط شما** انجام می‌شود.

## پیش‌نیاز

- TLS (Let’s Encrypt یا cert مدیریت‌شده)
- آدرس‌های upstream برای: `admin-ui`، `amline-ui`، `site`، `backend` (FastAPI)

## الگوی Strangler (خلاصه)

1. **Host یکسان** (مثلاً `app.example.com`): Gateway بر اساس path/route به سرویس هدف می‌فرستد.
2. **مسیرهای جدید** زودتر به نسخهٔ جدید می‌روند؛ مسیرهای legacy با همان prefix قدیمی به سرویس سازگار می‌مانند.
3. **هدرهای مشترک:** `X-Request-Id`، `X-Forwarded-For`، `X-Forwarded-Proto` برای audit و امنیت.

## Nginx (نمونهٔ مفهومی — جایگزین دامنه و پورت)

```nginx
upstream amline_api {
    server 127.0.0.1:8080;
}
upstream amline_admin {
    server 127.0.0.1:3002;
}

server {
    listen 443 ssl;
    server_name app.example.com;

    location /api/ {
        proxy_pass http://amline_api;
        proxy_set_header Host $host;
        proxy_set_header X-Request-Id $request_id;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://amline_admin;
        proxy_set_header Host $host;
    }
}
```

## Traefik (نمونه)

- از **labels** روی سرویس‌های Docker یا فایل **dynamic** برای `routers` / `services` استفاده کنید.
- قوانین بر اساس `Host()` و `PathPrefix()`.

## چک‌لیست بعد از استقرار

- [ ] `GET /docs` بک‌اند از بیرون در دسترس است
- [ ] CORS با `AMLINE_CORS_ORIGINS` هم‌خوان است
- [ ] WebSocket (در صورت استفاده) از proxy عبور می‌کند

## مرجع داخلی

- CORS staging: [`BACKEND_STAGING_CORS.md`](./BACKEND_STAGING_CORS.md)
- یکپارچگی فرانت: [`FRONTEND_API_INTEGRATION.md`](./FRONTEND_API_INTEGRATION.md)
- نقشهٔ مهاجرت قرارداد چندگانه (v2): [`Amline_Complete_Master_Spec_v2.md`](./Amline_Complete_Master_Spec_v2.md) §۶ — **feature flag** برای درصد ترافیک و fallback ۵۰۰ به legacy در همان Gateway پیاده شود (مثلاً با `error_page` / middleware Traefik `errors`).

## Rollout قرارداد v2 (خلاصه اجرایی)

1. استقرار Gateway روی `app.` / `admin.` قبل از فعال‌سازی رفتار جدید.
2. مسیرهای `/api/v1/contracts/*` را نسخه‌سنجی کنید؛ با `lifecycle_v2` فرانت می‌تواند UI را تدریجی عوض کند.
3. Temporal: با `AMLINE_TEMPORAL_HOST`، workflow `ContractLifecycleJourneyWorkflow` روی worker ثبت شده است؛ worker را بعد از deploy بک‌اند به‌روز کنید.
