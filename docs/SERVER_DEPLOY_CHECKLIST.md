# چک‌لیست دیپلوی روی سرور (Production)

قبل از باز کردن دسترسی کاربر نهایی، علاوه بر [`PLATFORM_GO_LIVE_ROADMAP.md`](./PLATFORM_GO_LIVE_ROADMAP.md):

## بک‌اند

- `AMLINE_DATABASE_URL` / JWT / CORS (`AMLINE_CORS_ORIGINS` شامل دامنهٔ فرانت‌ها)
- `AMLINE_OTP_MAGIC_ENABLED=0` در پرود مگر سیاست صریح خلاف آن
- Health: `GET /health`

## فرانت‌ها و قرارداد مسیر

| اپ | نکته |
|----|------|
| **admin-ui** (nginx) | درخواست‌های `/api/v1/*` با `VITE_API_URL` خالی به **همان origin** می‌روند؛ nginx باید `location /api/` را به بک‌اند پروکسی کند (`admin-ui/nginx.conf`). |
| **amline-ui** (Next) | `NEXT_PUBLIC_API_BASE_URL` و سایر `NEXT_PUBLIC_*` باید در **زمان `docker build`** (یا بیلد CI) ست شوند — نه فقط env زمان اجرای کانتینر. نمونه: `amline-ui/Dockerfile` و `docker-compose.yml` سرویس `amline-ui`. |
| **consultant-ui** (nginx) | مسیر `/consultant/` به بک‌اند؛ در dev بدون env، پروکسی پیش‌فرض به `http://127.0.0.1:8080`. |
| **site** | معمولاً static؛ بدون وابستگی به API هسته. |

## یکپارچگی

```bash
npm run openapi:refresh
```

باید بدون تغییر ناخواسته در git تمام شود (قرارداد OpenAPI با بک‌اند).

## داکر

از ریشهٔ مخزن:

```bash
docker compose build
docker compose up -d
```

پورت‌های پیش‌فرض compose: بک‌اند روی host `8080:8000`، ادمین `3002:80`، اپ `3000`، و غیره — طبق `docker-compose.yml`.
