# مونوریپو (npm workspaces + Turborepo)

## پکیج‌های داخل workspace (ریشه)

- `admin-ui` (Vite)
- `amline-ui` (Next.js dashboard کاربر)
- `consultant-ui` (Vite — پنل مشاوران)
- `site` (Next.js static export)
- `packages/amline-ui-core` (کتابخانهٔ مشترک — **`npm run build -w @amline/ui-core`** قبل از بیلد اپ‌ها در CI/Docker)
- `packages/amline-openapi-types` (تایپ‌های تولیدشده از OpenAPI — [`openapi:refresh`](./ENV_MATRIX.md))

مرجع متغیرهای env: [`ENV_MATRIX.md`](./ENV_MATRIX.md).

## خارج از workspace (فعلاً)

- **`seo-dashboard`**: بیلد به فایل‌های محلی/پیکربندی وابسته است؛ با `npm ci` جدا در CI.

## دستورات ریشه

```bash
npm ci          # از ریشهٔ مخزن
npm run build   # turbo run build — admin-ui + amline-ui + site (در صورت وجود script)
npm run lint    # در صورت وجود اسکریپت در هر پکیج
```

**کلون تازه:** پکیج `@amline/ui-core` باید یک‌بار بیلد شود تا `dist/` ساخته شود. اسکریپت **`npm run ensure-ui-core`** این کار را فقط وقتی لازم باشد انجام می‌دهد؛ دستورات **`npm run dev:admin`**, **`dev:app`**, **`dev:consultant`** از ریشه به‌صورت خودکار قبل از بالا آوردن Vite/Next آن را اجرا می‌کنند. (سایت مارکتینگ `dev:site` به ui-core وابسته نیست.)

**Storybook (کامپوننت‌های مشترک):** از ریشهٔ مخزن **`npm run storybook:ui-core`** → پورت **6006** (فقط dev؛ خروجی `storybook-static` در `.gitignore` پکیج).

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

### پیش‌نمایش سریع (mock API + همهٔ فرانت‌ها)

```powershell
.\scripts\start-local-preview.ps1
```

اگر **Vite/Next خطای ماژول** داد، در همان پکیج یک‌بار `npm install` بزنید (روی Windows گاهی workspace به‌تنهایی باینری `next`/`vite` را کامل نمی‌کند).

## Docker

بیلد تصویر admin-ui و site از **ریشهٔ مخزن**:

```bash
docker build -f admin-ui/Dockerfile .
docker build -f site/Dockerfile .
```

## CI / CD

- **`ci.yml`**: job **`openapi-contract`** (هم‌خوانی `docs/generated/openapi.json` و `packages/amline-openapi-types/generated/api.d.ts` با `app.openapi()`)، تست بک‌اند، E2E `amline-ui`، بیلد Turbo، و تصاویر Docker روی **push**. **دیپلوی خودکار production حذف شده** تا pipeline موفق کاذب ندهد.
- **`deploy-staging.yml`**: استیجینگ روی push به `staging` یا دستی.
- **`deploy-production.yml`**: فقط **`workflow_dispatch`** — تا زمان افزودن SSH/kubectl، فقط notice می‌دهد.
