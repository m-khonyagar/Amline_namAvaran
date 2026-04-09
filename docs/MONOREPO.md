# مونوریپو (npm workspaces + Turborepo)

## پکیج‌های داخل workspace (ریشه)

- `admin-ui` (Vite)
- `amline-ui` (Next.js dashboard کاربر)
- `site` (Next.js static export)
- `packages/amline-ui-core` (کتابخانهٔ مشترک — فعلاً بدون اسکریپت `build`)

## خارج از workspace (فعلاً)

- **`seo-dashboard`**: بیلد به فایل‌های محلی/پیکربندی وابسته است؛ با `npm ci` جدا در CI.

## دستورات ریشه

```bash
npm ci          # از ریشهٔ مخزن
npm run build   # turbo run build — admin-ui + amline-ui + site (در صورت وجود script)
npm run lint    # در صورت وجود اسکریپت در هر پکیج
```

## اجرای لوکال (فرانت بدون Docker)

اگر **`ERR_CONNECTION_REFUSED` روی پورت 3002** می‌بینید، یعنی سرور Vite اجرا نشده — Docker برای این مرحله لازم نیست:

```bash
npm run dev:admin    # پنل ادمین → http://localhost:3002
npm run dev:app      # داشبورد کاربر (Next) → پورت پیش‌فرض package
npm run dev:site     # سایت مارکتینگ
```

در حالت dev، `admin-ui` درخواست‌های `/api/v1` را به **`http://localhost:8080`** پروکسی می‌کند (`vite.config.ts`). پس بک‌اند باید روی **8080** باشد؛ مثال:

```powershell
.\scripts\docker-deps-up.ps1    # اگر Docker دارید: فقط Postgres/Redis/MinIO
.\scripts\run-local-stack.ps1   # ترمینال جدا: uvicorn روی 8080
```

یا کل استک با **`.\scripts\local-docker-up.ps1`** وقتی Docker Desktop سالم است.

## Docker

بیلد تصویر admin-ui و site از **ریشهٔ مخزن**:

```bash
docker build -f admin-ui/Dockerfile .
docker build -f site/Dockerfile .
```

## CI / CD

- **`ci.yml`**: تست بک‌اند، inventory فرانت، E2E `amline-ui`، بیلد Turbo (`lint` + `build`)، و تصاویر Docker روی **push**. **دیپلوی خودکار production حذف شده** تا pipeline موفق کاذب ندهد.
- **`deploy-staging.yml`**: استیجینگ روی push به `staging` یا دستی.
- **`deploy-production.yml`**: فقط **`workflow_dispatch`** — تا زمان افزودن SSH/kubectl، فقط notice می‌دهد.
